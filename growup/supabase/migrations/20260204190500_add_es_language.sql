alter table public.account_settings
  drop constraint if exists account_settings_language_check;

alter table public.account_settings
  add constraint account_settings_language_check
  check (language in ('en', 'pt', 'fr', 'es'));
