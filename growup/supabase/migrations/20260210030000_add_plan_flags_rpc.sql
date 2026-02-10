create or replace function public.get_current_plan_feature_flags()
returns jsonb
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select coalesce(
    jsonb_object_agg(flags.key, coalesce(features.enabled, flags.default_enabled)),
    '{}'::jsonb
  )
  from public.feature_flags flags
  left join public.plan_features features
    on features.feature_key = flags.key
   and features.plan = (
     select plan
     from public.account_settings
     where owner_id = auth.uid()
   );
$$;

revoke all on function public.get_current_plan_feature_flags() from public;
grant execute on function public.get_current_plan_feature_flags() to authenticated;
