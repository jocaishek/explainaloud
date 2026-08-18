-- The friends screen and the streak, in the reads and writes they actually need.
--
-- The tables and the policies landed in 20260820000000. What is here is the
-- set of operations the interface performs, and every one of them exists
-- because the obvious alternative is worse:
--
--   * A friend list cannot be a join in the client, because the profiles
--     policy lets you read exactly one row — your own. Reading a friend's name
--     has to go through a function that checks the friendship itself.
--   * A streak cannot be counted in the browser, because the browser would
--     need every row of `recording_days` to count them.
--   * Marking today cannot be a read followed by a write, because two tabs
--     finishing a recording at once would both read "no row" and both insert.
--
-- Everything below is therefore one round trip that returns exactly what the
-- screen renders, and nothing else.

-- ---------------------------------------------------------------------------
-- 0. A timezone that is definitely a timezone
-- ---------------------------------------------------------------------------

/* `now() at time zone $1` raises when $1 is not a real zone, and $1 here comes
 * from `Intl.DateTimeFormat().resolvedOptions().timeZone` in somebody's
 * browser. That is normally an IANA name and occasionally, on an old or
 * patched build, is not — and a hand-written request can put anything there at
 * all. An unrecognised zone must not be able to turn "save my streak" into a
 * 500, so it falls back to UTC. */
create or replace function public.safe_zone(zone text)
returns text
language plpgsql
immutable
set search_path = pg_catalog, pg_temp
as $$
declare
  candidate text := btrim(coalesce(zone, ''));
  probe timestamp;
begin
  if candidate = '' then
    return 'UTC';
  end if;

  /* Ask Postgres the question directly and catch the refusal.
   *
   * The obvious implementation looks in `pg_timezone_names`, and it is a trap:
   * that view enumerates the entire zone database on every call, and this
   * function is called once per row by `current_streak`, which is itself
   * called once per friend by `friend_overview`. A twenty-friend list would
   * have scanned twelve hundred zone names eighty times to validate the same
   * handful of strings.
   *
   * A conversion against a fixed timestamp costs a lookup instead of a scan.
   * It is `immutable` because `timezone(text, timestamp)` is — the probe has
   * no `now()` in it precisely so that stays true — which lets the planner
   * fold the whole call away when the argument is a parameter, as it always
   * is here. */
  begin
    probe := timestamptz '2000-01-01 00:00:00+00' at time zone candidate;
  exception
    when others then
      return 'UTC';
  end;

  return candidate;
end;
$$;

grant execute on function public.safe_zone(text) to authenticated, anon;

/* Re-stated with the guard in it, and then taken away from the browser.
 *
 * Same signature, same gaps-and-islands body, same "yesterday still counts"
 * rule as the migration that introduced it. Two things change.
 *
 * A nonsense zone lands on UTC instead of raising.
 *
 * And `authenticated` loses execute. It should never have had it: the function
 * takes a `target uuid`, so anybody signed in could read anybody's streak by
 * asking for their id, which is the exact thing `friend_stats` was written to
 * gate. The wrappers below still call it, because a `security definer`
 * function runs as its owner and resolves this call with the owner's rights,
 * not the caller's. */
create or replace function public.current_streak(target uuid, zone text default 'UTC')
returns integer
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with bounded as (
    select day
    from public.recording_days
    where user_id = target
      and day <= (now() at time zone public.safe_zone(zone))::date
  ),
  islands as (
    select day, day - (row_number() over (order by day))::integer as run
    from bounded
  ),
  latest as (
    select run, max(day) as last_day
    from islands
    group by run
    order by last_day desc
    limit 1
  )
  select coalesce(
    (
      select count(*)::integer
      from islands
      where run = (select run from latest)
        and (select last_day from latest)
            >= (now() at time zone public.safe_zone(zone))::date - 1
    ),
    0
  );
$$;

revoke all on function public.current_streak(uuid, text) from public;
revoke all on function public.current_streak(uuid, text) from anon;
revoke all on function public.current_streak(uuid, text) from authenticated;

/* Your own, which is the only one you may ask for by name. */
create or replace function public.own_streak(zone text default 'UTC')
returns integer
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.current_streak((select auth.uid()), zone);
$$;

revoke all on function public.own_streak(text) from public;
grant execute on function public.own_streak(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 1. Marking today, and finding out what that did to the streak
-- ---------------------------------------------------------------------------

/* One statement, one answer.
 *
 * `is_first_today` is what the notification is gated on, and it has to come
 * from the write rather than from a read before it. Somebody who records four
 * times on a Tuesday has started nothing on the second, third or fourth take,
 * and a toast that fires every time is a toast people learn to ignore before
 * they ever reach day three.
 *
 * `security definer` only so that it can call `current_streak`, which the
 * browser is no longer allowed to call directly. It takes no user id and reads
 * `auth.uid()` itself, so there is no argument that could point it at somebody
 * else's row.
 *
 * The output columns are named away from the table's own `day` and `sessions`
 * on purpose: in PL/pgSQL a `returns table` column is a variable, and a
 * variable sharing a name with a column in the query below is a conflict the
 * server refuses to guess at. */
create or replace function public.record_today(zone text default 'UTC')
returns table (
  local_day date,
  sessions_today integer,
  streak integer,
  is_first_today boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  uid uuid := (select auth.uid());
  today date;
  counted integer;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  today := (now() at time zone public.safe_zone(zone))::date;

  insert into public.recording_days as rd (user_id, day, sessions)
  values (uid, today, 1)
  on conflict (user_id, day) do update
    set sessions = rd.sessions + 1
  returning rd.sessions into counted;

  return query
    select
      today,
      counted,
      public.current_streak(uid, zone),
      counted = 1;
end;
$$;

revoke all on function public.record_today(text) from public;
grant execute on function public.record_today(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. The week, Sunday to Saturday
-- ---------------------------------------------------------------------------

/* Seven rows, always, whether or not anything was recorded.
 *
 * The grid on the dashboard has seven cells and it has them on the day the
 * account was created, so the empty days are part of the answer rather than an
 * absence the client has to reconstruct. Sunday-start because that is the week
 * this was asked for, and `extract(dow)` is already 0 on Sunday, so saying so
 * takes no arithmetic.
 *
 * `security invoker`: it reads only the caller's own rows, and the
 * `recording_days` select policy is what makes that true. */
create or replace function public.streak_week(zone text default 'UTC')
returns table (day date, sessions integer, is_today boolean)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with today as (
    select (now() at time zone public.safe_zone(zone))::date as d
  ),
  bounds as (
    select today.d, today.d - extract(dow from today.d)::integer as week_start
    from today
  )
  select
    series.d::date,
    coalesce(r.sessions, 0),
    series.d::date = bounds.d
  from bounds
  cross join lateral generate_series(
    bounds.week_start::timestamp,
    (bounds.week_start + 6)::timestamp,
    interval '1 day'
  ) as series(d)
  left join public.recording_days r
    on r.user_id = (select auth.uid())
   and r.day = series.d::date
  order by series.d;
$$;

revoke all on function public.streak_week(text) from public;
grant execute on function public.streak_week(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Who your friends are, and what they are allowed to show you
-- ---------------------------------------------------------------------------

/* The friend list, with the two numbers a friend is entitled to.
 *
 * `security definer` for the profiles read, and the friendship is checked in
 * the `where` rather than assumed by the caller: a row only appears here if
 * there is an accepted row naming both people. The columns are the same public
 * fields `search_people` returns, plus the two counts — no email, no date of
 * birth, no plan.
 *
 * The counts are computed rather than joined so a friend never receives the
 * rows behind them. Two integers is the whole picture somebody agreed to
 * share. */
create or replace function public.friend_overview()
returns table (
  user_id uuid,
  -- The row in `friendships`, so unfriending is a delete by primary key rather
  -- than a pair of `or`-ed equality filters reconstructed in the client.
  friendship_id uuid,
  username text,
  first_name text,
  last_name text,
  avatar_url text,
  topics integer,
  streak integer,
  friends_since timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    p.user_id,
    f.id,
    p.username,
    p.first_name,
    p.last_name,
    p.avatar_url,
    (select count(*)::integer from public.courses c where c.user_id = p.user_id),
    public.current_streak(p.user_id, coalesce(p.timezone, 'UTC')),
    coalesce(f.responded_at, f.created_at)
  from public.friendships f
  join public.profiles p
    on p.user_id = case
         when f.requester_id = (select auth.uid()) then f.addressee_id
         else f.requester_id
       end
  where f.status = 'accepted'
    and (select auth.uid()) in (f.requester_id, f.addressee_id)
  -- Ordered by name here and re-sorted by streak on the screen: sorting by the
  -- streak in SQL means computing every friend's streak twice, once to rank
  -- and once to return.
  order by p.first_name, p.last_name;
$$;

revoke all on function public.friend_overview() from public;
grant execute on function public.friend_overview() to authenticated;

/* Requests in both directions, in one list.
 *
 * Outgoing ones are included on purpose. A request that vanishes the moment it
 * is sent leaves somebody with no way to tell whether they asked, and asking
 * again returns a duplicate-key error about a row they cannot see. */
create or replace function public.friend_requests()
returns table (
  id uuid,
  direction text,
  user_id uuid,
  username text,
  first_name text,
  last_name text,
  avatar_url text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    f.id,
    case when f.addressee_id = (select auth.uid()) then 'incoming' else 'outgoing' end,
    p.user_id,
    p.username,
    p.first_name,
    p.last_name,
    p.avatar_url,
    f.created_at
  from public.friendships f
  join public.profiles p
    on p.user_id = case
         when f.requester_id = (select auth.uid()) then f.addressee_id
         else f.requester_id
       end
  where f.status = 'pending'
    and (select auth.uid()) in (f.requester_id, f.addressee_id)
  order by f.created_at desc;
$$;

revoke all on function public.friend_requests() from public;
grant execute on function public.friend_requests() to authenticated;

/* How many people are waiting on an answer. For the badge in the rail, which
   renders on every screen in the app and wants a number rather than a list. */
create or replace function public.incoming_request_count()
returns integer
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select count(*)::integer
  from public.friendships f
  where f.addressee_id = (select auth.uid())
    and f.status = 'pending';
$$;

revoke all on function public.incoming_request_count() from public;
grant execute on function public.incoming_request_count() to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Search, now saying where each person already stands with you
-- ---------------------------------------------------------------------------

/* Replaces the version in 20260820000000, which returned four columns and no
 * relationship. Without it every result offers "Add", including the people you
 * are already friends with and the ones who are waiting on your answer — and
 * pressing it on either produces a duplicate-key error about a row the person
 * has every right to know exists.
 *
 * Dropped rather than replaced because the return type changes, which
 * `create or replace function` will not do. */
drop function if exists public.search_people(text);

create function public.search_people(query text)
returns table (
  user_id uuid,
  username text,
  first_name text,
  last_name text,
  avatar_url text,
  /* 'friends' | 'incoming' | 'outgoing' | 'none' — what the row's button does. */
  status text,
  /* The friendship row, so answering a request from a search result needs no
     second lookup. Null when there is nothing between you yet. */
  request_id uuid
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    p.user_id,
    p.username,
    p.first_name,
    p.last_name,
    p.avatar_url,
    case
      when f.id is null then 'none'
      when f.status = 'accepted' then 'friends'
      when f.addressee_id = (select auth.uid()) then 'incoming'
      else 'outgoing'
    end,
    f.id
  from public.profiles p
  left join public.friendships f
    on least(f.requester_id, f.addressee_id)
         = least(p.user_id, (select auth.uid()))
   and greatest(f.requester_id, f.addressee_id)
         = greatest(p.user_id, (select auth.uid()))
  where
    p.username is not null
    and p.user_id <> (select auth.uid())
    and length(btrim(query)) >= 2
    and (
      p.username like lower(btrim(query)) || '%'
      or lower(p.first_name || ' ' || p.last_name) like '%' || lower(btrim(query)) || '%'
    )
  order by
    (p.username = lower(btrim(query))) desc,
    (p.username like lower(btrim(query)) || '%') desc,
    p.username
  limit 20;
$$;

/* The index the username half of that search needs.
 *
 * `profiles_username_key` is a plain btree, and a plain btree cannot serve
 * `username like 'obi%'` unless the database collation is C — which on a
 * managed Postgres it is not. Without an operator-class index the prefix
 * search is a sequential scan of every profile on every keystroke, which is
 * fine at a hundred accounts and is not fine later.
 *
 * The name half still scans, because it is a `%substring%` match and no btree
 * helps with a leading wildcard. The fix for that is a trigram index, and it
 * is deliberately not here: it needs `pg_trgm`, and adding an extension to the
 * migration that first creates this feature is a way to have the whole thing
 * fail to deploy. Add it when the profile count makes it worth the risk. */
create index if not exists profiles_username_prefix_idx
  on public.profiles (username text_pattern_ops)
  where username is not null;

revoke all on function public.search_people(text) from public;
grant execute on function public.search_people(text) to authenticated;
