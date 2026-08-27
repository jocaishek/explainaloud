-- The admin overview learns about usernames.
--
-- Usernames arrived after this function was written, and it has been showing
-- accounts by real name and email ever since — which are the two identifiers
-- nobody uses to talk about an account. Every other screen in the product
-- refers to people by their handle, so the one screen for looking an account up
-- was the only one that could not be searched with what you had in front of
-- you.
--
-- Nothing else changes: the same rows, the same access check, the same refusal
-- to return notes, sources, transcripts or course content.

/* `create or replace` will not do it.
 *
 * Adding a column to a `returns table` changes the function's return type, and
 * Postgres refuses that in a replace — "cannot change return type of existing
 * function". Dropping first is the documented way round, and it takes the
 * grants with it, which is why they are reissued at the bottom rather than
 * assumed. */
drop function if exists public.admin_user_overview();

create function public.admin_user_overview()
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
  if not public.is_ropes_admin() then
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
grant execute on function public.admin_user_overview() to authenticated;
