alter table public.account_settings
  add column if not exists role text not null default 'USER' check (role in ('USER', 'ADMIN'));

update public.account_settings
set role = 'ADMIN'
where owner_id in (
  select owner_id
  from public.profiles
  where role = 'ADMIN'
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select public.has_accepted_terms()
    and exists (
      select 1
      from public.account_settings
      where owner_id = auth.uid()
        and role = 'ADMIN'
    );
$$;

create policy account_settings_read_admin
on public.account_settings
for select
using (public.is_admin());
