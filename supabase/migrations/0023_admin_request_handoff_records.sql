alter table public.admin_request_reviews
  add column if not exists handoff_recipient_email text not null default '',
  add column if not exists handoff_channel text not null default 'manual',
  add column if not exists handoff_note text not null default '',
  add column if not exists handoff_sent_at timestamptz,
  add column if not exists handoff_sent_by uuid references public.profiles(id) on delete set null;

comment on column public.admin_request_reviews.handoff_recipient_email is
  'External administrative professional or operator contact used for manual handoff.';

comment on column public.admin_request_reviews.handoff_channel is
  'Manual handoff channel recorded by an operator. Email sending is not automated yet.';

comment on column public.admin_request_reviews.handoff_note is
  'Operator note about what was sent and what needs follow-up after handoff.';

comment on column public.admin_request_reviews.handoff_sent_at is
  'Timestamp when an operator marked the request as manually handed off.';

comment on column public.admin_request_reviews.handoff_sent_by is
  'Operator who marked the request as manually handed off.';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'admin_request_reviews_handoff_channel_check'
  ) then
    alter table public.admin_request_reviews
      add constraint admin_request_reviews_handoff_channel_check
      check (handoff_channel in ('manual', 'email', 'phone', 'kakao', 'other'));
  end if;
end $$;
