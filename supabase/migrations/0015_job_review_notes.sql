alter table public.jobs
  add column if not exists review_note text,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references public.profiles(id) on delete set null;

create index if not exists jobs_reviewed_by_idx
on public.jobs(reviewed_by);
