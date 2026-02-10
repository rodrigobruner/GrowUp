create table if not exists public.feature_flags (
  key text primary key,
  description text,
  default_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.plan_features (
  plan text not null check (plan in ('FREE', 'BETA', 'PRO')),
  feature_key text not null references public.feature_flags (key) on delete cascade,
  enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (plan, feature_key)
);

create trigger feature_flags_touch_updated_at
before update on public.feature_flags
for each row execute function public.touch_updated_at();

create trigger plan_features_touch_updated_at
before update on public.plan_features
for each row execute function public.touch_updated_at();

alter table public.feature_flags enable row level security;
alter table public.plan_features enable row level security;

create policy feature_flags_read_admin
on public.feature_flags
for select
using (public.is_admin());

create policy feature_flags_write_admin
on public.feature_flags
for insert with check (public.is_admin());

create policy feature_flags_update_admin
on public.feature_flags
for update
using (public.is_admin())
with check (public.is_admin());

create policy plan_features_read_admin
on public.plan_features
for select
using (public.is_admin());

create policy plan_features_write_admin
on public.plan_features
for insert with check (public.is_admin());

create policy plan_features_update_admin
on public.plan_features
for update
using (public.is_admin())
with check (public.is_admin());

insert into public.feature_flags (key, description, default_enabled)
values
  ('tasks', 'Task management', true),
  ('rewards', 'Rewards and store', true),
  ('profiles', 'Multiple profiles', true)
on conflict (key) do nothing;

insert into public.plan_features (plan, feature_key, enabled)
values
  ('FREE', 'tasks', true),
  ('FREE', 'rewards', true),
  ('FREE', 'profiles', true),
  ('BETA', 'tasks', true),
  ('BETA', 'rewards', true),
  ('BETA', 'profiles', true),
  ('PRO', 'tasks', true),
  ('PRO', 'rewards', true),
  ('PRO', 'profiles', true)
on conflict (plan, feature_key) do nothing;
