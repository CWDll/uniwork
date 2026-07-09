alter table public.job_applications
  add column if not exists company_note text,
  add column if not exists status_updated_at timestamptz;

update public.job_applications
set status_updated_at = applied_at
where status_updated_at is null;
