-- Supabase schema for GrowUp app (profiles, tasks, rewards, completions, settings, account settings)

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid not null,
  owner_id uuid not null references auth.users (id) on delete cascade,
  display_name text not null,
  avatar_id text not null default '01',
  role text not null default 'USER' check (role in ('USER', 'ADMIN')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner_id, id)
);

create unique index if not exists profiles_owner_display_name_unique
  on public.profiles (owner_id, lower(display_name));

create table if not exists public.tasks (
  id uuid not null,
  owner_id uuid not null references auth.users (id) on delete cascade,
  profile_id uuid not null,
  title text not null,
  points integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (owner_id, profile_id, id),
  foreign key (owner_id, profile_id) references public.profiles (owner_id, id) on delete cascade
);

create table if not exists public.rewards (
  id uuid not null,
  owner_id uuid not null references auth.users (id) on delete cascade,
  profile_id uuid not null,
  title text not null,
  cost integer not null,
  limit_per_cycle integer not null default 3,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  redeemed_at timestamptz,
  deleted_at timestamptz,
  primary key (owner_id, profile_id, id),
  foreign key (owner_id, profile_id) references public.profiles (owner_id, id) on delete cascade
);

create table if not exists public.redemptions (
  id uuid primary key,
  owner_id uuid not null references auth.users (id) on delete cascade,
  profile_id uuid not null,
  reward_id uuid not null,
  reward_title text not null,
  cost integer not null,
  redeemed_at timestamptz not null default now(),
  date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  foreign key (owner_id, profile_id, reward_id) references public.rewards (owner_id, profile_id, id) on delete cascade
);

create table if not exists public.completions (
  id text not null,
  owner_id uuid not null references auth.users (id) on delete cascade,
  profile_id uuid not null,
  task_id uuid not null,
  date date not null,
  points integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (owner_id, profile_id, id),
  foreign key (owner_id, profile_id, task_id) references public.tasks (owner_id, profile_id, id) on delete cascade
);

create table if not exists public.settings (
  id uuid not null,
  owner_id uuid not null references auth.users (id) on delete cascade,
  profile_id uuid not null,
  cycle_type text not null default 'biweekly' check (cycle_type in ('weekly', 'biweekly', 'monthly', 'yearly')),
  cycle_start_date date not null,
  level_up_points integer not null,
  avatar_id text not null default '01',
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner_id, profile_id, id),
  constraint settings_id_matches_profile check (id = profile_id),
  foreign key (owner_id, profile_id) references public.profiles (owner_id, id) on delete cascade
);

create table if not exists public.account_settings (
  owner_id uuid primary key references auth.users (id) on delete cascade,
  language text not null check (language in ('en', 'pt', 'fr', 'es')),
  terms_version text,
  terms_accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger tasks_touch_updated_at
before update on public.tasks
for each row execute function public.touch_updated_at();

create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

create trigger rewards_touch_updated_at
before update on public.rewards
for each row execute function public.touch_updated_at();

create trigger redemptions_touch_updated_at
before update on public.redemptions
for each row execute function public.touch_updated_at();

create trigger completions_touch_updated_at
before update on public.completions
for each row execute function public.touch_updated_at();

create trigger settings_touch_updated_at
before update on public.settings
for each row execute function public.touch_updated_at();

create trigger account_settings_touch_updated_at
before update on public.account_settings
for each row execute function public.touch_updated_at();

alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.rewards enable row level security;
alter table public.redemptions enable row level security;
alter table public.completions enable row level security;
alter table public.settings enable row level security;
alter table public.account_settings enable row level security;

create policy "profiles_read_own" on public.profiles
for select using (auth.uid() = owner_id);

create policy "profiles_write_own" on public.profiles
for insert with check (auth.uid() = owner_id);

create policy "profiles_update_own" on public.profiles
for update using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

create policy "profiles_delete_own" on public.profiles
for delete using (auth.uid() = owner_id);

create policy "tasks_read_own" on public.tasks
for select using (auth.uid() = owner_id);

create policy "tasks_write_own" on public.tasks
for insert with check (auth.uid() = owner_id);

create policy "tasks_update_own" on public.tasks
for update using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

create policy "tasks_delete_own" on public.tasks
for delete using (auth.uid() = owner_id);

create policy "rewards_read_own" on public.rewards
for select using (auth.uid() = owner_id);

create policy "rewards_write_own" on public.rewards
for insert with check (auth.uid() = owner_id);

create policy "rewards_update_own" on public.rewards
for update using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

create policy "rewards_delete_own" on public.rewards
for delete using (auth.uid() = owner_id);

create policy "redemptions_read_own" on public.redemptions
for select using (auth.uid() = owner_id);

create policy "redemptions_write_own" on public.redemptions
for insert with check (auth.uid() = owner_id);

create policy "redemptions_update_own" on public.redemptions
for update using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

create policy "redemptions_delete_own" on public.redemptions
for delete using (auth.uid() = owner_id);

create policy "completions_read_own" on public.completions
for select using (auth.uid() = owner_id);

create policy "completions_write_own" on public.completions
for insert with check (auth.uid() = owner_id);

create policy "completions_update_own" on public.completions
for update using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

create policy "completions_delete_own" on public.completions
for delete using (auth.uid() = owner_id);

create policy "settings_read_own" on public.settings
for select using (auth.uid() = owner_id);

create policy "settings_write_own" on public.settings
for insert with check (auth.uid() = owner_id);

create policy "settings_update_own" on public.settings
for update using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

create policy "account_settings_read_own" on public.account_settings
for select using (auth.uid() = owner_id);

create policy "account_settings_write_own" on public.account_settings
for insert with check (auth.uid() = owner_id);

create policy "account_settings_update_own" on public.account_settings
for update using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

create policy "account_settings_delete_own" on public.account_settings
for delete using (auth.uid() = owner_id);

create policy "settings_delete_own" on public.settings
for delete using (auth.uid() = owner_id);

create or replace function public.delete_user_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_user_account() from public;
grant execute on function public.delete_user_account() to authenticated;
