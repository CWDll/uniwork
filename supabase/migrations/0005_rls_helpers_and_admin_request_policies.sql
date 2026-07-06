create or replace function public.has_role(required_role text)
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
      and role = required_role
  );
$$;

create or replace function public.is_company_applicant(applicant_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.job_applications
    join public.jobs on jobs.id = job_applications.job_id
    join public.companies on companies.id = jobs.company_id
    where job_applications.seeker_id = applicant_id
      and companies.owner_id = auth.uid()
  );
$$;

grant execute
on function public.has_role(text)
to anon, authenticated, service_role;

grant execute
on function public.is_company_applicant(uuid)
to authenticated, service_role;

drop policy if exists "applications_seeker_insert" on public.job_applications;

create policy "applications_seeker_insert"
on public.job_applications for insert
with check (
  seeker_id = auth.uid()
  and public.has_role('seeker')
  and exists (
    select 1
    from public.jobs
    where jobs.id = job_applications.job_id
      and jobs.status = 'published'
  )
);

drop policy if exists "profiles_company_applicant_read" on public.profiles;

create policy "profiles_company_applicant_read"
on public.profiles for select
using (public.is_company_applicant(profiles.id));

drop policy if exists "seeker_profiles_company_applicant_read" on public.seeker_profiles;

create policy "seeker_profiles_company_applicant_read"
on public.seeker_profiles for select
using (public.is_company_applicant(seeker_profiles.user_id));

drop policy if exists "companies_owner_insert" on public.companies;

create policy "companies_owner_insert"
on public.companies for insert
with check (
  owner_id = auth.uid()
  and (public.has_role('company') or public.has_role('admin'))
);

drop policy if exists "companies_owner_update" on public.companies;

create policy "companies_owner_update"
on public.companies for update
using (
  public.is_admin()
  or (
    owner_id = auth.uid()
    and public.has_role('company')
  )
)
with check (
  public.is_admin()
  or (
    owner_id = auth.uid()
    and public.has_role('company')
  )
);

drop policy if exists "admin_requests_seeker_insert" on public.admin_requests;

create policy "admin_requests_seeker_insert"
on public.admin_requests for insert
with check (
  seeker_id = auth.uid()
  and public.has_role('seeker')
);
