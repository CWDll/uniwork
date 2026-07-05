create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('seeker', 'company', 'admin', 'partner')),
  email text not null,
  name text,
  phone text,
  locale text not null default 'ko',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.seeker_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  nationality text,
  visa_type text,
  visa_review_status text not null default 'needs_review',
  alien_registration_status text,
  school text,
  major text,
  korean_level text,
  english_level text,
  preferred_locations text[] not null default '{}',
  preferred_job_types text[] not null default '{}',
  available_times jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.visa_eligibility_rules (
  visa_type text primary key,
  can_browse boolean not null default true,
  can_apply boolean not null default false,
  needs_review boolean not null default true,
  blocked_reason text
);

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  business_number text,
  industry text,
  address text,
  manager_name text,
  manager_phone text,
  verification_status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  title text not null,
  description text not null,
  employment_type text,
  category text,
  location text,
  wage_type text,
  wage_amount numeric,
  visa_support_type text,
  korean_requirement text,
  status text not null default 'draft',
  published_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.resumes (
  id uuid primary key default gen_random_uuid(),
  seeker_id uuid not null references public.profiles(id) on delete cascade,
  title text,
  intro text,
  education jsonb not null default '[]'::jsonb,
  experience jsonb not null default '[]'::jsonb,
  languages jsonb not null default '[]'::jsonb,
  visibility text not null default 'private',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.job_applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  seeker_id uuid not null references public.profiles(id) on delete cascade,
  resume_id uuid references public.resumes(id) on delete set null,
  status text not null default 'submitted',
  message text,
  applied_at timestamptz not null default now(),
  unique (job_id, seeker_id)
);

create table if not exists public.saved_jobs (
  seeker_id uuid not null references public.profiles(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (seeker_id, job_id)
);

create table if not exists public.admin_requests (
  id uuid primary key default gen_random_uuid(),
  seeker_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  consent_id uuid,
  assigned_partner_id uuid references public.profiles(id) on delete set null,
  status text not null default 'received',
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  purpose text not null,
  data_scope jsonb not null,
  recipient_type text,
  recipient_id uuid,
  status text not null default 'agreed',
  agreed_at timestamptz not null default now(),
  revoked_at timestamptz
);

alter table public.admin_requests
  add constraint admin_requests_consent_id_fkey
  foreign key (consent_id)
  references public.consents(id)
  on delete set null;

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

insert into public.visa_eligibility_rules
  (visa_type, can_browse, can_apply, needs_review, blocked_reason)
values
  ('D-2', true, true, true, '시간제 취업 허가 및 학교/근무시간 확인 필요'),
  ('D-4', true, true, true, '시간제 취업 허가 및 학교/근무시간 확인 필요'),
  ('F-1', true, false, false, '1차 MVP 지원 제한 체류자격'),
  ('F-2', true, false, true, '세부 조건 검토 후 지원 가능 여부 판단'),
  ('F-3', true, false, false, '1차 MVP 지원 제한 체류자격'),
  ('F-4', true, false, false, '1차 MVP 지원 제한 체류자격')
on conflict (visa_type) do update set
  can_browse = excluded.can_browse,
  can_apply = excluded.can_apply,
  needs_review = excluded.needs_review,
  blocked_reason = excluded.blocked_reason;

alter table public.profiles enable row level security;
alter table public.seeker_profiles enable row level security;
alter table public.visa_eligibility_rules enable row level security;
alter table public.companies enable row level security;
alter table public.jobs enable row level security;
alter table public.resumes enable row level security;
alter table public.job_applications enable row level security;
alter table public.saved_jobs enable row level security;
alter table public.admin_requests enable row level security;
alter table public.consents enable row level security;
alter table public.audit_logs enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

create or replace function public.is_partner()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'partner'
  );
$$;

create policy "profiles_select_own_or_admin"
on public.profiles for select
using (id = auth.uid() or public.is_admin());

create policy "profiles_update_own_or_admin"
on public.profiles for update
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

create policy "seeker_profiles_owner_or_admin"
on public.seeker_profiles for all
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

create policy "visa_rules_public_read"
on public.visa_eligibility_rules for select
using (true);

create policy "companies_public_verified_read"
on public.companies for select
using (verification_status = 'verified' or owner_id = auth.uid() or public.is_admin());

create policy "companies_owner_insert"
on public.companies for insert
with check (owner_id = auth.uid());

create policy "companies_owner_update"
on public.companies for update
using (owner_id = auth.uid() or public.is_admin())
with check (owner_id = auth.uid() or public.is_admin());

create policy "jobs_public_published_read"
on public.jobs for select
using (
  status = 'published'
  or public.is_admin()
  or exists (
    select 1
    from public.companies
    where companies.id = jobs.company_id
      and companies.owner_id = auth.uid()
  )
);

create policy "jobs_company_owner_insert"
on public.jobs for insert
with check (
  exists (
    select 1
    from public.companies
    where companies.id = jobs.company_id
      and companies.owner_id = auth.uid()
  )
);

create policy "jobs_company_owner_or_admin_update"
on public.jobs for update
using (
  public.is_admin()
  or exists (
    select 1
    from public.companies
    where companies.id = jobs.company_id
      and companies.owner_id = auth.uid()
  )
)
with check (
  public.is_admin()
  or exists (
    select 1
    from public.companies
    where companies.id = jobs.company_id
      and companies.owner_id = auth.uid()
  )
);

create policy "resumes_owner_or_admin"
on public.resumes for all
using (seeker_id = auth.uid() or public.is_admin())
with check (seeker_id = auth.uid() or public.is_admin());

create policy "applications_seeker_insert"
on public.job_applications for insert
with check (seeker_id = auth.uid());

create policy "applications_related_read"
on public.job_applications for select
using (
  seeker_id = auth.uid()
  or public.is_admin()
  or exists (
    select 1
    from public.jobs
    join public.companies on companies.id = jobs.company_id
    where jobs.id = job_applications.job_id
      and companies.owner_id = auth.uid()
  )
);

create policy "applications_company_or_admin_update"
on public.job_applications for update
using (
  public.is_admin()
  or exists (
    select 1
    from public.jobs
    join public.companies on companies.id = jobs.company_id
    where jobs.id = job_applications.job_id
      and companies.owner_id = auth.uid()
  )
)
with check (
  public.is_admin()
  or exists (
    select 1
    from public.jobs
    join public.companies on companies.id = jobs.company_id
    where jobs.id = job_applications.job_id
      and companies.owner_id = auth.uid()
  )
);

create policy "saved_jobs_owner"
on public.saved_jobs for all
using (seeker_id = auth.uid())
with check (seeker_id = auth.uid());

create policy "admin_requests_related_access"
on public.admin_requests for select
using (
  seeker_id = auth.uid()
  or public.is_admin()
  or assigned_partner_id = auth.uid()
);

create policy "admin_requests_seeker_insert"
on public.admin_requests for insert
with check (seeker_id = auth.uid());

create policy "admin_requests_admin_or_partner_update"
on public.admin_requests for update
using (public.is_admin() or assigned_partner_id = auth.uid())
with check (public.is_admin() or assigned_partner_id = auth.uid());

create policy "consents_owner_or_admin"
on public.consents for all
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

create policy "audit_logs_admin_read"
on public.audit_logs for select
using (public.is_admin());
