alter table public.daily_access_events
  add column if not exists last_accessed_at timestamptz;

update public.daily_access_events
set last_accessed_at = accessed_at::timestamptz
where last_accessed_at is null;
