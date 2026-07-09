create table if not exists public.application_status_events (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.job_applications(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  from_status text,
  to_status text not null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists application_status_events_application_id_created_at_idx
on public.application_status_events(application_id, created_at desc);

create index if not exists application_status_events_actor_id_idx
on public.application_status_events(actor_id);

alter table public.application_status_events enable row level security;

drop policy if exists "application_status_events_related_read"
on public.application_status_events;

create policy "application_status_events_related_read"
on public.application_status_events for select
using (
  public.is_admin()
  or exists (
    select 1
    from public.job_applications
    where job_applications.id = application_status_events.application_id
      and job_applications.seeker_id = auth.uid()
  )
  or exists (
    select 1
    from public.job_applications
    join public.jobs on jobs.id = job_applications.job_id
    join public.companies on companies.id = jobs.company_id
    where job_applications.id = application_status_events.application_id
      and companies.owner_id = auth.uid()
  )
);

drop policy if exists "application_status_events_company_or_admin_insert"
on public.application_status_events;

create policy "application_status_events_company_or_admin_insert"
on public.application_status_events for insert
with check (
  actor_id = auth.uid()
  and (
    public.is_admin()
    or exists (
      select 1
      from public.job_applications
      join public.jobs on jobs.id = job_applications.job_id
      join public.companies on companies.id = jobs.company_id
      where job_applications.id = application_status_events.application_id
        and companies.owner_id = auth.uid()
    )
  )
);

grant select, insert
on public.application_status_events
to authenticated;

grant all privileges
on public.application_status_events
to service_role;
