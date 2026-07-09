alter table public.job_applications
  add column if not exists profile_snapshot jsonb,
  add column if not exists resume_snapshot jsonb;
