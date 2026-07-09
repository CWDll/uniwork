alter table public.profiles
  add column if not exists notification_email text,
  add column if not exists email_notifications_enabled boolean not null default true;

alter table public.companies
  add column if not exists notification_email text,
  add column if not exists email_notifications_enabled boolean not null default true;

update public.profiles
set notification_email = email
where notification_email is null;
