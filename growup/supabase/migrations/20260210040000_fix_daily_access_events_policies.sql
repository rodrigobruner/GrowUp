-- Ensure daily_access_events policies allow insert/update for the owner once terms are accepted.
drop policy if exists daily_access_events_insert_own on public.daily_access_events;
drop policy if exists daily_access_events_update_own on public.daily_access_events;

create policy daily_access_events_insert_own
on public.daily_access_events
for insert
with check (auth.uid() = owner_id and public.has_accepted_terms());

create policy daily_access_events_update_own
on public.daily_access_events
for update
using (auth.uid() = owner_id and public.has_accepted_terms())
with check (auth.uid() = owner_id and public.has_accepted_terms());
