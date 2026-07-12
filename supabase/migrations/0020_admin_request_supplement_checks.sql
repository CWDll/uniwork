alter table public.admin_request_reviews
  add column if not exists supplement_checked_at timestamptz,
  add column if not exists supplement_checked_by uuid references public.profiles(id) on delete set null;

comment on column public.admin_request_reviews.supplement_checked_at is
  'Timestamp when an operator last acknowledged seeker supplement submissions.';

comment on column public.admin_request_reviews.supplement_checked_by is
  'Operator who last acknowledged seeker supplement submissions.';
