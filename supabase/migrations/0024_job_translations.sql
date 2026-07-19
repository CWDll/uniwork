create table if not exists public.job_translations (
  job_id uuid not null references public.jobs(id) on delete cascade,
  locale text not null,
  title text,
  description text,
  location text,
  visa_support_type text,
  korean_requirement text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (job_id, locale),
  constraint job_translations_locale_check check (locale in ('en'))
);

create index if not exists job_translations_locale_idx
on public.job_translations(locale);

alter table public.job_translations enable row level security;

grant select
on public.job_translations
to anon, authenticated;

grant insert, update, delete
on public.job_translations
to authenticated;

drop policy if exists "job_translations_public_or_owner_read"
on public.job_translations;

create policy "job_translations_public_or_owner_read"
on public.job_translations for select
using (
  exists (
    select 1
    from public.jobs
    where jobs.id = job_translations.job_id
      and jobs.status = 'published'
  )
  or public.is_admin()
  or exists (
    select 1
    from public.jobs
    join public.companies on companies.id = jobs.company_id
    where jobs.id = job_translations.job_id
      and companies.owner_id = auth.uid()
  )
);

drop policy if exists "job_translations_owner_or_admin_insert"
on public.job_translations;

create policy "job_translations_owner_or_admin_insert"
on public.job_translations for insert
with check (
  public.is_admin()
  or exists (
    select 1
    from public.jobs
    join public.companies on companies.id = jobs.company_id
    where jobs.id = job_translations.job_id
      and companies.owner_id = auth.uid()
  )
);

drop policy if exists "job_translations_owner_or_admin_update"
on public.job_translations;

create policy "job_translations_owner_or_admin_update"
on public.job_translations for update
using (
  public.is_admin()
  or exists (
    select 1
    from public.jobs
    join public.companies on companies.id = jobs.company_id
    where jobs.id = job_translations.job_id
      and companies.owner_id = auth.uid()
  )
)
with check (
  public.is_admin()
  or exists (
    select 1
    from public.jobs
    join public.companies on companies.id = jobs.company_id
    where jobs.id = job_translations.job_id
      and companies.owner_id = auth.uid()
  )
);

drop policy if exists "job_translations_owner_or_admin_delete"
on public.job_translations;

create policy "job_translations_owner_or_admin_delete"
on public.job_translations for delete
using (
  public.is_admin()
  or exists (
    select 1
    from public.jobs
    join public.companies on companies.id = jobs.company_id
    where jobs.id = job_translations.job_id
      and companies.owner_id = auth.uid()
  )
);
