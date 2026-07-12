alter table public.admin_requests
  add column if not exists seeker_followup_note text not null default '',
  add column if not exists seeker_followup_requested_at timestamptz;

comment on column public.admin_requests.seeker_followup_note is
  'Operator-written follow-up request visible to the seeker.';

comment on column public.admin_requests.seeker_followup_requested_at is
  'Timestamp when an operator last requested additional information from the seeker.';

create table if not exists public.admin_request_reviews (
  request_id uuid primary key references public.admin_requests(id) on delete cascade,
  internal_note text not null default '',
  handoff_status text not null default 'not_ready',
  handoff_hold_reason text not null default '',
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_request_reviews_handoff_status_check
    check (handoff_status in ('not_ready', 'ready', 'handed_off', 'paused'))
);

comment on table public.admin_request_reviews is
  'Operator-only administrative review state for admin request handoff preparation.';

comment on column public.admin_request_reviews.internal_note is
  'Internal operator note not intended for seeker display.';

comment on column public.admin_request_reviews.handoff_status is
  'Internal handoff workflow status for external administrative professional coordination.';

comment on column public.admin_request_reviews.handoff_hold_reason is
  'Internal reason why handoff is paused or not ready.';

alter table public.admin_request_reviews enable row level security;

grant select, insert, update, delete
on public.admin_request_reviews
to authenticated;

grant all privileges
on public.admin_request_reviews
to service_role;

drop policy if exists "admin_request_reviews_admin_or_assigned_partner_read"
on public.admin_request_reviews;

create policy "admin_request_reviews_admin_or_assigned_partner_read"
on public.admin_request_reviews for select
using (
  public.is_admin()
  or exists (
    select 1
    from public.admin_requests
    where admin_requests.id = admin_request_reviews.request_id
      and admin_requests.assigned_partner_id = auth.uid()
  )
);

drop policy if exists "admin_request_reviews_admin_or_assigned_partner_insert"
on public.admin_request_reviews;

create policy "admin_request_reviews_admin_or_assigned_partner_insert"
on public.admin_request_reviews for insert
with check (
  public.is_admin()
  or exists (
    select 1
    from public.admin_requests
    where admin_requests.id = admin_request_reviews.request_id
      and admin_requests.assigned_partner_id = auth.uid()
  )
);

drop policy if exists "admin_request_reviews_admin_or_assigned_partner_update"
on public.admin_request_reviews;

create policy "admin_request_reviews_admin_or_assigned_partner_update"
on public.admin_request_reviews for update
using (
  public.is_admin()
  or exists (
    select 1
    from public.admin_requests
    where admin_requests.id = admin_request_reviews.request_id
      and admin_requests.assigned_partner_id = auth.uid()
  )
)
with check (
  public.is_admin()
  or exists (
    select 1
    from public.admin_requests
    where admin_requests.id = admin_request_reviews.request_id
      and admin_requests.assigned_partner_id = auth.uid()
  )
);
