create table if not exists public.admin_request_supplements (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.admin_requests(id) on delete cascade,
  seeker_id uuid not null references public.profiles(id) on delete cascade,
  message text not null default '',
  contact_snapshot jsonb not null default '{}'::jsonb,
  document_checklist jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.admin_request_supplements is
  'Seeker-submitted follow-up packets for administrative requests.';

comment on column public.admin_request_supplements.message is
  'Seeker response to an operator follow-up request.';

comment on column public.admin_request_supplements.contact_snapshot is
  'Updated contact information provided with the supplement.';

comment on column public.admin_request_supplements.document_checklist is
  'Updated document readiness provided with the supplement.';

create index if not exists admin_request_supplements_request_id_created_at_idx
on public.admin_request_supplements (request_id, created_at desc);

alter table public.admin_request_supplements enable row level security;

grant select, insert, update, delete
on public.admin_request_supplements
to authenticated;

grant all privileges
on public.admin_request_supplements
to service_role;

drop policy if exists "admin_request_supplements_related_access"
on public.admin_request_supplements;

create policy "admin_request_supplements_related_access"
on public.admin_request_supplements for select
using (
  seeker_id = auth.uid()
  or public.is_admin()
  or exists (
    select 1
    from public.admin_requests
    where admin_requests.id = admin_request_supplements.request_id
      and admin_requests.assigned_partner_id = auth.uid()
  )
);

drop policy if exists "admin_request_supplements_seeker_insert"
on public.admin_request_supplements;

create policy "admin_request_supplements_seeker_insert"
on public.admin_request_supplements for insert
with check (
  seeker_id = auth.uid()
  and exists (
    select 1
    from public.admin_requests
    where admin_requests.id = admin_request_supplements.request_id
      and admin_requests.seeker_id = auth.uid()
      and admin_requests.status not in ('completed', 'rejected')
  )
);
