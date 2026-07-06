alter table public.companies
  add constraint companies_owner_id_key unique (owner_id);
