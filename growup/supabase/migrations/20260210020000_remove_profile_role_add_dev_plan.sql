-- Remove role from profiles and add DEV plan option.

drop trigger if exists profiles_enforce_role on public.profiles;
drop function if exists public.enforce_profile_role();

alter table if exists public.profiles
  drop column if exists role;

alter table if exists public.account_settings
  drop constraint if exists account_settings_plan_check,
  add constraint account_settings_plan_check check (plan in ('FREE', 'BETA', 'PRO', 'DEV'));

alter table if exists public.plan_features
  drop constraint if exists plan_features_plan_check,
  add constraint plan_features_plan_check check (plan in ('FREE', 'BETA', 'PRO', 'DEV'));

insert into public.plan_features (plan, feature_key, enabled)
values
  ('DEV', 'tasks', true),
  ('DEV', 'rewards', true),
  ('DEV', 'profiles', true)
on conflict (plan, feature_key) do nothing;
