create table if not exists public.admin_request_files (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.admin_requests(id) on delete cascade,
  supplement_id uuid references public.admin_request_supplements(id) on delete cascade,
  seeker_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null,
  original_name text not null,
  mime_type text not null,
  size_bytes integer not null,
  source text not null default 'request',
  uploaded_at timestamptz not null default now(),
  constraint admin_request_files_source_check
    check (source in ('request', 'supplement')),
  constraint admin_request_files_supplement_source_check
    check (
      (source = 'request' and supplement_id is null)
      or (source = 'supplement' and supplement_id is not null)
    )
);

comment on table public.admin_request_files is
  'Private files attached by seekers to administrative requests and supplements.';

comment on column public.admin_request_files.storage_path is
  'Path inside the admin-request-files private storage bucket.';

create index if not exists admin_request_files_request_id_uploaded_at_idx
on public.admin_request_files (request_id, uploaded_at desc);

create index if not exists admin_request_files_supplement_id_uploaded_at_idx
on public.admin_request_files (supplement_id, uploaded_at desc);

alter table public.admin_request_files enable row level security;

grant select, insert, update, delete
on public.admin_request_files
to authenticated;

grant all privileges
on public.admin_request_files
to service_role;

drop policy if exists "admin_request_files_related_read"
on public.admin_request_files;

create policy "admin_request_files_related_read"
on public.admin_request_files for select
using (
  seeker_id = auth.uid()
  or public.is_admin()
  or exists (
    select 1
    from public.admin_requests
    where admin_requests.id = admin_request_files.request_id
      and admin_requests.assigned_partner_id = auth.uid()
  )
);

drop policy if exists "admin_request_files_seeker_insert"
on public.admin_request_files;

create policy "admin_request_files_seeker_insert"
on public.admin_request_files for insert
with check (
  seeker_id = auth.uid()
  and exists (
    select 1
    from public.admin_requests
    where admin_requests.id = admin_request_files.request_id
      and admin_requests.seeker_id = auth.uid()
      and admin_requests.status not in ('completed', 'rejected')
  )
  and (
    supplement_id is null
    or exists (
      select 1
      from public.admin_request_supplements
      where admin_request_supplements.id = admin_request_files.supplement_id
        and admin_request_supplements.request_id = admin_request_files.request_id
        and admin_request_supplements.seeker_id = auth.uid()
    )
  )
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'admin-request-files',
  'admin-request-files',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "admin_request_files_storage_read"
on storage.objects;

create policy "admin_request_files_storage_read"
on storage.objects for select
using (
  bucket_id = 'admin-request-files'
  and (
    public.is_admin()
    or (storage.foldername(name))[1] = auth.uid()::text
  )
);

drop policy if exists "admin_request_files_storage_insert"
on storage.objects;

create policy "admin_request_files_storage_insert"
on storage.objects for insert
with check (
  bucket_id = 'admin-request-files'
  and (storage.foldername(name))[1] = auth.uid()::text
);
