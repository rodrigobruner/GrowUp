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
      from public.profiles
      where owner_id = auth.uid()
        and role = 'ADMIN'
    );
$$;

create table if not exists public.daily_access_events (
  owner_id uuid not null references auth.users (id) on delete cascade,
  accessed_at date not null,
  created_at timestamptz not null default now(),
  primary key (owner_id, accessed_at)
);

alter table public.daily_access_events enable row level security;

create policy daily_access_events_insert_own
on public.daily_access_events
for insert
with check (auth.uid() = owner_id and public.has_accepted_terms());

create policy daily_access_events_read_admin
on public.daily_access_events
for select
using (public.is_admin());

create policy profiles_read_admin
on public.profiles
for select
using (public.is_admin());

create index if not exists daily_access_events_date_idx
  on public.daily_access_events (accessed_at);
