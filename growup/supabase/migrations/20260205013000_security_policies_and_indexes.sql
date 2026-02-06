create or replace function public.has_accepted_terms()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.account_settings
    where owner_id = auth.uid()
      and terms_version is not null
      and terms_accepted_at is not null
  );
$$;

create or replace function public.enforce_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    if auth.role() <> 'service_role' and new.role <> 'USER' then
      raise exception 'profile role must be USER';
    end if;
  elsif (tg_op = 'UPDATE') then
    if new.role <> old.role and auth.role() <> 'service_role' then
      raise exception 'profile role cannot be changed';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_enforce_role on public.profiles;
create trigger profiles_enforce_role
before insert or update on public.profiles
for each row execute function public.enforce_profile_role();

drop policy if exists profiles_read_own on public.profiles;
drop policy if exists profiles_write_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
drop policy if exists profiles_delete_own on public.profiles;

drop policy if exists tasks_read_own on public.tasks;
drop policy if exists tasks_write_own on public.tasks;
drop policy if exists tasks_update_own on public.tasks;
drop policy if exists tasks_delete_own on public.tasks;

drop policy if exists rewards_read_own on public.rewards;
drop policy if exists rewards_write_own on public.rewards;
drop policy if exists rewards_update_own on public.rewards;
drop policy if exists rewards_delete_own on public.rewards;

drop policy if exists redemptions_read_own on public.redemptions;
drop policy if exists redemptions_write_own on public.redemptions;
drop policy if exists redemptions_update_own on public.redemptions;
drop policy if exists redemptions_delete_own on public.redemptions;

drop policy if exists completions_read_own on public.completions;
drop policy if exists completions_write_own on public.completions;
drop policy if exists completions_update_own on public.completions;
drop policy if exists completions_delete_own on public.completions;

drop policy if exists settings_read_own on public.settings;
drop policy if exists settings_write_own on public.settings;
drop policy if exists settings_update_own on public.settings;
drop policy if exists settings_delete_own on public.settings;

create policy profiles_read_own on public.profiles
for select using (auth.uid() = owner_id and public.has_accepted_terms());

create policy profiles_write_own on public.profiles
for insert with check (auth.uid() = owner_id and public.has_accepted_terms());

create policy profiles_update_own on public.profiles
for update using (auth.uid() = owner_id and public.has_accepted_terms())
with check (auth.uid() = owner_id and public.has_accepted_terms());

create policy profiles_delete_own on public.profiles
for delete using (auth.uid() = owner_id and public.has_accepted_terms());

create policy tasks_read_own on public.tasks
for select using (auth.uid() = owner_id and public.has_accepted_terms());

create policy tasks_write_own on public.tasks
for insert with check (auth.uid() = owner_id and public.has_accepted_terms());

create policy tasks_update_own on public.tasks
for update using (auth.uid() = owner_id and public.has_accepted_terms())
with check (auth.uid() = owner_id and public.has_accepted_terms());

create policy tasks_delete_own on public.tasks
for delete using (auth.uid() = owner_id and public.has_accepted_terms());

create policy rewards_read_own on public.rewards
for select using (auth.uid() = owner_id and public.has_accepted_terms());

create policy rewards_write_own on public.rewards
for insert with check (auth.uid() = owner_id and public.has_accepted_terms());

create policy rewards_update_own on public.rewards
for update using (auth.uid() = owner_id and public.has_accepted_terms())
with check (auth.uid() = owner_id and public.has_accepted_terms());

create policy rewards_delete_own on public.rewards
for delete using (auth.uid() = owner_id and public.has_accepted_terms());

create policy redemptions_read_own on public.redemptions
for select using (auth.uid() = owner_id and public.has_accepted_terms());

create policy redemptions_write_own on public.redemptions
for insert with check (auth.uid() = owner_id and public.has_accepted_terms());

create policy redemptions_update_own on public.redemptions
for update using (auth.uid() = owner_id and public.has_accepted_terms())
with check (auth.uid() = owner_id and public.has_accepted_terms());

create policy redemptions_delete_own on public.redemptions
for delete using (auth.uid() = owner_id and public.has_accepted_terms());

create policy completions_read_own on public.completions
for select using (auth.uid() = owner_id and public.has_accepted_terms());

create policy completions_write_own on public.completions
for insert with check (auth.uid() = owner_id and public.has_accepted_terms());

create policy completions_update_own on public.completions
for update using (auth.uid() = owner_id and public.has_accepted_terms())
with check (auth.uid() = owner_id and public.has_accepted_terms());

create policy completions_delete_own on public.completions
for delete using (auth.uid() = owner_id and public.has_accepted_terms());

create policy settings_read_own on public.settings
for select using (auth.uid() = owner_id and public.has_accepted_terms());

create policy settings_write_own on public.settings
for insert with check (auth.uid() = owner_id and public.has_accepted_terms());

create policy settings_update_own on public.settings
for update using (auth.uid() = owner_id and public.has_accepted_terms())
with check (auth.uid() = owner_id and public.has_accepted_terms());

create policy settings_delete_own on public.settings
for delete using (auth.uid() = owner_id and public.has_accepted_terms());

create index if not exists tasks_owner_profile_idx on public.tasks (owner_id, profile_id);
create index if not exists rewards_owner_profile_idx on public.rewards (owner_id, profile_id);
create index if not exists completions_owner_profile_idx on public.completions (owner_id, profile_id);
create index if not exists redemptions_owner_profile_idx on public.redemptions (owner_id, profile_id);
create index if not exists settings_owner_profile_idx on public.settings (owner_id, profile_id);
create index if not exists completions_owner_date_idx on public.completions (owner_id, date);
create index if not exists redemptions_owner_date_idx on public.redemptions (owner_id, date);
create index if not exists tasks_owner_deleted_idx on public.tasks (owner_id, deleted_at);
create index if not exists rewards_owner_deleted_idx on public.rewards (owner_id, deleted_at);
