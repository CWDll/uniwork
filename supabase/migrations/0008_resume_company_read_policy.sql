drop policy if exists "resumes_owner_or_admin" on public.resumes;
drop policy if exists "resumes_related_access" on public.resumes;
drop policy if exists "resumes_owner_insert" on public.resumes;
drop policy if exists "resumes_owner_update" on public.resumes;
drop policy if exists "resumes_owner_delete" on public.resumes;

create policy "resumes_related_access"
on public.resumes for select
using (
  seeker_id = auth.uid()
  or public.is_admin()
  or exists (
    select 1
    from public.job_applications
    join public.jobs on jobs.id = job_applications.job_id
    join public.companies on companies.id = jobs.company_id
    where job_applications.seeker_id = resumes.seeker_id
      and companies.owner_id = auth.uid()
  )
);

create policy "resumes_owner_insert"
on public.resumes for insert
with check (seeker_id = auth.uid());

create policy "resumes_owner_update"
on public.resumes for update
using (seeker_id = auth.uid() or public.is_admin())
with check (seeker_id = auth.uid() or public.is_admin());

create policy "resumes_owner_delete"
on public.resumes for delete
using (seeker_id = auth.uid() or public.is_admin());
