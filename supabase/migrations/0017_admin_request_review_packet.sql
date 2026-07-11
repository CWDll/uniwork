alter table public.admin_requests
  add column if not exists request_details jsonb not null default '{}'::jsonb,
  add column if not exists document_checklist jsonb not null default '{}'::jsonb,
  add column if not exists contact_snapshot jsonb not null default '{}'::jsonb;

comment on column public.admin_requests.request_details is
  'Administrative review details collected from the seeker for operator review and external professional handoff.';

comment on column public.admin_requests.document_checklist is
  'Self-reported document readiness checklist for administrative review.';

comment on column public.admin_requests.contact_snapshot is
  'Contact information snapshot provided at administrative request submission time.';
