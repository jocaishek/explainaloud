-- Expose onboarding profiles to signed-in users through the Data API.
-- Row-level security still limits every operation to the user's own row.
grant usage on type public.use_type to authenticated;
grant select, insert, update, delete on table public.profiles to authenticated;
