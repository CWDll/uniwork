create or replace function public.owns_resume(target_resume_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.resumes
    where resumes.id = target_resume_id
      and resumes.seeker_id = auth.uid()
  );
$$;

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
  and (
    resume_id is null
    or public.owns_resume(resume_id)
  )
);
