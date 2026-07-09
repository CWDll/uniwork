alter table public.companies
  add column if not exists verification_note text,
  add column if not exists verified_at timestamptz,
  add column if not exists verified_by uuid references public.profiles(id) on delete set null;

create index if not exists companies_verified_by_idx
on public.companies(verified_by);
