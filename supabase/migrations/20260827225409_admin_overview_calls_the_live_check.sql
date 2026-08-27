-- `admin_user_overview` is calling a function that was deleted in July.
--
-- The migration before this one added a username column to the overview. To do
-- that it had to drop and recreate the function, and the body it recreated was
-- copied from `20260728073902_admin_readonly_dashboard.sql` — the migration
-- that first created it, and the wrong one to copy from. Two months and one
-- rename later, `20260728232209_rename_admin_check_to_explainaloud.sql` had
-- repointed the overview at `is_explainaloud_admin()` and dropped
-- `is_ropes_admin()` outright.
--
-- So the recreated function calls a function that does not exist, and every
-- load of `/admin` in production has been a 500 since it deployed.
--
-- It applied cleanly, which is the part worth remembering: a `plpgsql` body is
-- parsed at creation and its identifiers are not resolved until it runs. There
-- is no version of `db push` or `db reset` that would have failed here. Only
-- calling the function finds it, and nothing called it until somebody opened
-- the page.
--
-- `create or replace` this time — the signature is unchanged, so there is no
-- reason to drop, and not dropping keeps the grants.

create or replace function public.admin_user_overview()
returns table (
  user_id uuid,
  email text,
  username text,
  first_name text,
  last_name text,
  joined_at timestamptz,
  topic_count bigint,
  recording_count bigint,
  topics jsonb
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  -- The live check, and the same one `requireAdmin` calls in the app. Those
  -- two disagreeing is what a black error page looks like from the outside:
  -- the page lets you in and then the data refuses you.
  if not public.is_explainaloud_admin() then
    raise exception 'admin access required' using errcode = '42501';
  end if;

  return query
  select
    users.id,
    users.email::text,
    profiles.username,
    profiles.first_name,
    profiles.last_name,
    users.created_at,
    coalesce(course_stats.topic_count, 0),
    coalesce(session_stats.recording_count, 0),
    coalesce(course_stats.topics, '[]'::jsonb)
  from auth.users as users
  left join public.profiles as profiles
    on profiles.user_id = users.id
  left join lateral (
    select
      count(*)::bigint as topic_count,
      jsonb_agg(
        jsonb_build_object(
          'id', courses.id,
          'topic', courses.topic,
          'name', courses.name,
          'status', courses.status,
          'created_at', courses.created_at
        )
        order by courses.created_at desc
      ) as topics
    from public.courses as courses
    where courses.user_id = users.id
  ) as course_stats on true
  left join lateral (
    select count(*)::bigint as recording_count
    from public.course_sessions as sessions
    where sessions.user_id = users.id
  ) as session_stats on true
  order by users.created_at desc;
end;
$$;

revoke all on function public.admin_user_overview() from public;
revoke all on function public.admin_user_overview() from anon;
grant execute on function public.admin_user_overview() to authenticated;
