-- A second admin.
--
-- The address is checked in two places and both have to agree: this function,
-- which gates the data, and `ADMIN_EMAILS` in `src/lib/admin.ts`, which decides
-- whether the nav link is drawn and whether the per-day caps apply. Changing
-- only the TypeScript hands somebody a link to a page whose every query is then
-- refused, which reads as a bug rather than as a permission.
--
-- `in (...)` rather than a second `or lower(email) = ...` so the next addition
-- is one line inside the list rather than another branch to keep in step.
--
-- `email_confirmed_at is not null` is retained deliberately: an unconfirmed
-- address is one anybody could have typed at signup, so without it the admin
-- check would trust a claim nobody has proved.

create or replace function public.is_explainaloud_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.users
    where id = auth.uid()
      and lower(email) in ('jovanny.shek@gmail.com', 'rboyapati2010@gmail.com')
      and email_confirmed_at is not null
  );
$$;

-- `create or replace` keeps the existing privileges, so these are not strictly
-- required. They are restated because this file then describes the function's
-- permissions in full rather than depending on a reader knowing that, and
-- because it stays correct if the function is ever dropped and recreated
-- instead. `security definer` makes the grants the only thing standing between
-- `anon` and a function that reads `auth.users`, which is not a line to leave
-- implicit.
revoke all on function public.is_explainaloud_admin() from public;
revoke all on function public.is_explainaloud_admin() from anon;
grant execute on function public.is_explainaloud_admin() to authenticated;
