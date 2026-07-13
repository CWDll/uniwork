alter table public.companies
  add column if not exists business_registration_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'company-registration-documents',
  'company-registration-documents',
  false,
  5242880,
  array['application/pdf', 'image/jpeg', 'image/png']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "company_registration_documents_owner_read"
on storage.objects;
create policy "company_registration_documents_owner_read"
on storage.objects for select
using (
  bucket_id = 'company-registration-documents'
  and (
    public.is_admin()
    or (storage.foldername(name))[1] = auth.uid()::text
  )
);

drop policy if exists "company_registration_documents_owner_insert"
on storage.objects;
create policy "company_registration_documents_owner_insert"
on storage.objects for insert
with check (
  bucket_id = 'company-registration-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "company_registration_documents_owner_update"
on storage.objects;
create policy "company_registration_documents_owner_update"
on storage.objects for update
using (
  bucket_id = 'company-registration-documents'
  and (
    public.is_admin()
    or (storage.foldername(name))[1] = auth.uid()::text
  )
)
with check (
  bucket_id = 'company-registration-documents'
  and (
    public.is_admin()
    or (storage.foldername(name))[1] = auth.uid()::text
  )
);

drop policy if exists "company_registration_documents_owner_delete"
on storage.objects;
create policy "company_registration_documents_owner_delete"
on storage.objects for delete
using (
  bucket_id = 'company-registration-documents'
  and (
    public.is_admin()
    or (storage.foldername(name))[1] = auth.uid()::text
  )
);
