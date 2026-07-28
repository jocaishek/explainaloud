-- Read-only administration for the single verified Ropes administrator.
-- The dashboard receives only account metadata and topic titles; private
-- notes, sources, generated course content, transcripts, and gaps stay behind
-- their existing owner-only RLS policies.

create or replace function public.is_ropes_admin()
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
      and lower(email) = 'jovanny.shek@gmail.com'
      and email_confirmed_at is not null
  );
$$;

revoke all on function public.is_ropes_admin() from public;
grant execute on function public.is_ropes_admin() to authenticated;

create or replace function public.admin_user_overview()
returns table (
  user_id uuid,
  email text,
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

-- Keep the existing function signature for deployed clients, but enforce the
-- real limits inside the database rather than trusting the caller's p_limit.
-- Verified admins succeed without creating or incrementing usage rows.
create or replace function public.claim_daily_quota(
  p_kind text,
  p_day date,
  p_limit integer
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_limit integer;
  v_rows integer := 0;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  if p_kind = 'topic' then
    v_limit := 2;
  elsif p_kind = 'recording' then
    v_limit := 5;
  else
    raise exception 'unknown quota kind: %', p_kind;
  end if;

  if p_limit is null or p_limit <> v_limit then
    raise exception 'invalid limit';
  end if;

  if public.is_ropes_admin() then
    return true;
  end if;

  insert into public.usage_daily (user_id, day)
  values (v_user, p_day)
  on conflict (user_id, day) do nothing;

  if p_kind = 'topic' then
    update public.usage_daily
      set topics_created = topics_created + 1
      where user_id = v_user and day = p_day and topics_created < v_limit;
  else
    update public.usage_daily
      set recordings_started = recordings_started + 1
      where user_id = v_user and day = p_day and recordings_started < v_limit;
  end if;

  get diagnostics v_rows = row_count;
  return v_rows > 0;
end;
$$;

revoke all on function public.claim_daily_quota(text, date, integer) from public;
grant execute on function public.claim_daily_quota(text, date, integer) to authenticated;
