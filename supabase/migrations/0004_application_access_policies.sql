drop policy if exists "applications_seeker_insert" on public.job_applications;

create policy "applications_seeker_insert"
on public.job_applications for insert
with check (
  seeker_id = auth.uid()
  and exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'seeker'
  )
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
using (
  exists (
    select 1
    from public.job_applications
    join public.jobs on jobs.id = job_applications.job_id
    join public.companies on companies.id = jobs.company_id
    where job_applications.seeker_id = profiles.id
      and companies.owner_id = auth.uid()
  )
);

drop policy if exists "seeker_profiles_company_applicant_read" on public.seeker_profiles;

create policy "seeker_profiles_company_applicant_read"
on public.seeker_profiles for select
using (
  exists (
    select 1
    from public.job_applications
    join public.jobs on jobs.id = job_applications.job_id
    join public.companies on companies.id = jobs.company_id
    where job_applications.seeker_id = seeker_profiles.user_id
      and companies.owner_id = auth.uid()
  )
);
