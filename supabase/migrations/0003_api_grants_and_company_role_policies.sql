grant usage on schema public to anon, authenticated, service_role;

grant select
on public.visa_eligibility_rules,
  public.companies,
  public.jobs
to anon;

grant select, insert, update, delete
on public.profiles,
  public.seeker_profiles,
  public.companies,
  public.jobs,
  public.resumes,
  public.job_applications,
  public.saved_jobs,
  public.admin_requests,
  public.consents,
  public.audit_logs
to authenticated;

grant select
on public.visa_eligibility_rules
to authenticated;

grant all privileges
on all tables in schema public
to service_role;

grant usage, select
on all sequences in schema public
to authenticated, service_role;

grant execute
on function public.is_admin()
to anon, authenticated, service_role;

grant execute
on function public.is_partner()
to anon, authenticated, service_role;

drop policy if exists "companies_owner_insert" on public.companies;

create policy "companies_owner_insert"
on public.companies for insert
with check (
  owner_id = auth.uid()
  and exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('company', 'admin')
  )
);

drop policy if exists "companies_owner_update" on public.companies;

create policy "companies_owner_update"
on public.companies for update
using (
  public.is_admin()
  or (
    owner_id = auth.uid()
    and exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'company'
    )
  )
)
with check (
  public.is_admin()
  or (
    owner_id = auth.uid()
    and exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'company'
    )
  )
);
