alter table public.account_settings
  add column if not exists plan text not null default 'FREE' check (plan in ('FREE', 'BETA', 'PRO')),
  add column if not exists flags jsonb not null default '{}'::jsonb;

update public.account_settings
set plan = 'FREE'
where plan is null;
