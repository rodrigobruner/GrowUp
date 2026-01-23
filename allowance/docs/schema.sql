-- Supabase schema for Allowance app (tasks, rewards, completions, settings)

create extension if not exists pgcrypto;

create table if not exists public.tasks (
  id uuid primary key,
  owner_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  points integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.rewards (
  id uuid primary key,
  owner_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  cost integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  redeemed_at timestamptz,
  deleted_at timestamptz
);

create table if not exists public.completions (
  id text primary key,
  owner_id uuid not null references auth.users (id) on delete cascade,
  task_id uuid not null references public.tasks (id) on delete cascade,
  date date not null,
  points integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.settings (
  id uuid primary key,
  owner_id uuid not null references auth.users (id) on delete cascade,
  cycle_type text not null check (cycle_type in ('weekly', 'biweekly', 'monthly', 'yearly')),
  cycle_start_date date not null,
  language text not null check (language in ('en', 'pt')),
  level_up_points integer not null,
  avatar_id text not null default '01',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.settings
add column if not exists avatar_id text not null default '01';

create unique index if not exists settings_owner_unique on public.settings (owner_id);

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

create trigger rewards_touch_updated_at
before update on public.rewards
for each row execute function public.touch_updated_at();

create trigger completions_touch_updated_at
before update on public.completions
for each row execute function public.touch_updated_at();

create trigger settings_touch_updated_at
before update on public.settings
for each row execute function public.touch_updated_at();

alter table public.tasks enable row level security;
alter table public.rewards enable row level security;
alter table public.completions enable row level security;
alter table public.settings enable row level security;

create policy "tasks_read_own" on public.tasks
for select using (auth.uid() = owner_id);

create policy "tasks_write_own" on public.tasks
for insert with check (auth.uid() = owner_id);

create policy "tasks_update_own" on public.tasks
for update using (auth.uid() = owner_id);

create policy "tasks_delete_own" on public.tasks
for delete using (auth.uid() = owner_id);

create policy "rewards_read_own" on public.rewards
for select using (auth.uid() = owner_id);

create policy "rewards_write_own" on public.rewards
for insert with check (auth.uid() = owner_id);

create policy "rewards_update_own" on public.rewards
for update using (auth.uid() = owner_id);

create policy "rewards_delete_own" on public.rewards
for delete using (auth.uid() = owner_id);

create policy "completions_read_own" on public.completions
for select using (auth.uid() = owner_id);

create policy "completions_write_own" on public.completions
for insert with check (auth.uid() = owner_id);

create policy "completions_update_own" on public.completions
for update using (auth.uid() = owner_id);

create policy "completions_delete_own" on public.completions
for delete using (auth.uid() = owner_id);

create policy "settings_read_own" on public.settings
for select using (auth.uid() = owner_id);

create policy "settings_write_own" on public.settings
for insert with check (auth.uid() = owner_id);

create policy "settings_update_own" on public.settings
for update using (auth.uid() = owner_id);

create policy "settings_delete_own" on public.settings
for delete using (auth.uid() = owner_id);
