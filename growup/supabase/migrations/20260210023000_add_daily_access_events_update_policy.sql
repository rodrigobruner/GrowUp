create policy daily_access_events_update_own
on public.daily_access_events
for update
using (auth.uid() = owner_id and public.has_accepted_terms())
with check (auth.uid() = owner_id and public.has_accepted_terms());
