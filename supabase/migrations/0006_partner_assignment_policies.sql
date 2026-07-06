create or replace function public.is_assigned_admin_request_seeker(seeker_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.admin_requests
    where admin_requests.seeker_id = is_assigned_admin_request_seeker.seeker_id
      and admin_requests.assigned_partner_id = auth.uid()
  );
$$;

grant execute
on function public.is_assigned_admin_request_seeker(uuid)
to authenticated, service_role;

drop policy if exists "profiles_partner_assigned_request_read" on public.profiles;

create policy "profiles_partner_assigned_request_read"
on public.profiles for select
using (public.is_assigned_admin_request_seeker(profiles.id));

drop policy if exists "seeker_profiles_partner_assigned_request_read" on public.seeker_profiles;

create policy "seeker_profiles_partner_assigned_request_read"
on public.seeker_profiles for select
using (public.is_assigned_admin_request_seeker(seeker_profiles.user_id));
