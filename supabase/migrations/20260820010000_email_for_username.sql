-- Resolving a username to the address it signs in with.
--
-- Signing in by username means somebody types `@obiwankanobi` and a password,
-- and Supabase Auth wants an email. Something has to make that hop, and where
-- it lives decides whether the feature is a convenience or an email harvester.
--
-- It is not granted to `anon` or to `authenticated`. Those roles are the
-- browser: the anon key is in every page of the site, so a function they can
-- call is a function anybody can call, and one that turns a public username
-- into a private email address would let the whole user list be walked with a
-- dictionary. Only `service_role` may execute this, which means only server
-- code holding the service key — never the browser.
--
-- The server action that calls it does not return the address either. It
-- performs the sign-in itself and hands back a session or the same failure
-- message a wrong password gives, so an attacker learns nothing about whether
-- a username exists.

create or replace function public.email_for_username(candidate text)
returns text
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select u.email
  from public.profiles p
  join auth.users u on u.id = p.user_id
  where p.username = lower(btrim(candidate))
  limit 1;
$$;

revoke all on function public.email_for_username(text) from public;
revoke all on function public.email_for_username(text) from anon;
revoke all on function public.email_for_username(text) from authenticated;
grant execute on function public.email_for_username(text) to service_role;
