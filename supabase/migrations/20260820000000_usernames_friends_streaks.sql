-- Usernames, friendships and streaks.
--
-- Three features, one migration, because they are one idea: an account stops
-- being private to itself. Everything here is written so that the *database*
-- is what enforces it — a unique username that is only unique because a form
-- checked first is not unique, it is unique until two people submit within the
-- same second.

-- ---------------------------------------------------------------------------
-- 1. Usernames
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists username text,
  -- IANA zone, captured from the browser at onboarding. A streak is a run of
  -- days, and which day a recording landed on is a question that cannot be
  -- answered without knowing where the person was standing.
  add column if not exists timezone text;

/* Stored lowercase, and the constraint says so.
 *
 * Case-insensitive uniqueness can be done two ways: fold on read, or fold on
 * write. Folding on write is the one that cannot be got wrong later — every
 * query, index and comparison in the app is then a plain equality on a plain
 * text column, and there is no path where `Obiwan` and `obiwan` are two rows
 * because somebody forgot a `lower()`.
 *
 * The shape is deliberately narrow: 3 to 20 characters, lowercase letters,
 * digits and underscore, and it may not start or end with an underscore or
 * carry two in a row. That excludes the whole family of names that exist to
 * impersonate — trailing dots, doubled separators, leading punctuation — and
 * it excludes them by construction rather than by a blocklist somebody has to
 * keep adding to. */
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_username_shape'
  ) then
    alter table public.profiles
      add constraint profiles_username_shape check (
        username is null or (
          username = lower(username)
          and username ~ '^[a-z0-9](?:[a-z0-9]|_(?!_)){1,18}[a-z0-9]$'
        )
      );
  end if;
end
$$;

/* The guarantee. A unique index, not a "check if taken then insert", because
   between those two statements is where the duplicate gets in. Two people
   claiming the same name in the same instant means one of them gets a 23505
   and is asked to pick again, which is correct and is the only version of this
   that is actually true under load. */
create unique index if not exists profiles_username_key
  on public.profiles (username)
  where username is not null;

-- ---------------------------------------------------------------------------
-- 2. Friendships
-- ---------------------------------------------------------------------------

/* Mutual, with a request and an acceptance.
 *
 * Not a one-way follow, because of what a friend can see: how many topics you
 * have and how many days you have recorded in a row. That is a picture of
 * somebody's study habits, and it should take their agreement rather than
 * anybody's decision to press a button. */
create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users (id) on delete cascade,
  addressee_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint friendships_not_self check (requester_id <> addressee_id)
);

/* One row per pair, whichever way round it was asked.
 *
 * A plain `unique (requester_id, addressee_id)` allows A→B and B→A to coexist,
 * which is two pending requests between the same two people and a friendship
 * that can be accepted twice. Ordering the pair in the index makes the
 * relationship the thing that is unique, rather than the direction it was
 * asked in. */
create unique index if not exists friendships_pair_key
  on public.friendships (
    least(requester_id, addressee_id),
    greatest(requester_id, addressee_id)
  );

create index if not exists friendships_addressee_idx
  on public.friendships (addressee_id, status);
create index if not exists friendships_requester_idx
  on public.friendships (requester_id, status);

alter table public.friendships enable row level security;

-- Granular: one policy per operation, per role.

create policy "friendships_select_authenticated"
  on public.friendships for select to authenticated
  using (
    (select auth.uid()) in (requester_id, addressee_id)
  );

-- You may only ask on your own behalf, and only ever as pending.
create policy "friendships_insert_authenticated"
  on public.friendships for insert to authenticated
  with check (
    (select auth.uid()) = requester_id
    and status = 'pending'
  );

/* Only the person who was asked may accept. Without the `addressee_id` check
   the requester could accept their own request, which is the entire security
   model of this table in one line. */
create policy "friendships_update_authenticated"
  on public.friendships for update to authenticated
  using ((select auth.uid()) = addressee_id and status = 'pending')
  with check ((select auth.uid()) = addressee_id and status = 'accepted');

-- Either side may withdraw: cancelling a request, declining one, unfriending.
create policy "friendships_delete_authenticated"
  on public.friendships for delete to authenticated
  using ((select auth.uid()) in (requester_id, addressee_id));

-- ---------------------------------------------------------------------------
-- 3. Streaks
-- ---------------------------------------------------------------------------

/* One row per person per day they recorded.
 *
 * Derived rather than counted: a stored `streak_count` on the profile drifts
 * the first time a write fails halfway, and then nobody can tell whether the
 * number is wrong or the person really did record eleven days running. A day
 * either has a row or it does not, and the streak is whatever that says.
 *
 * `day` is a plain date, already converted into the recorder's own timezone by
 * the caller. Storing a timestamp and converting on read would mean every
 * query needs the zone, including the ones a friend runs. */
create table if not exists public.recording_days (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  sessions integer not null default 1,
  created_at timestamptz not null default now(),
  primary key (user_id, day)
);

alter table public.recording_days enable row level security;

create policy "recording_days_select_authenticated"
  on public.recording_days for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "recording_days_insert_authenticated"
  on public.recording_days for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "recording_days_update_authenticated"
  on public.recording_days for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "recording_days_delete_authenticated"
  on public.recording_days for delete to authenticated
  using ((select auth.uid()) = user_id);

/* Consecutive days ending today or yesterday, in the caller's own zone.
 *
 * Yesterday counts as still-running on purpose: a streak that dies at midnight
 * punishes somebody for not having recorded yet *today*, which at 9am is every
 * person who has one. It ends when a whole day has been missed. */
create or replace function public.current_streak(target uuid, zone text default 'UTC')
returns integer
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  /* Gaps and islands, which is the standard shape for "how many consecutive
     days" and worth writing the standard way rather than inventing one.
     *
     * Subtracting a row number from a date turns every unbroken run into a
     * constant: three days in a row all yield the same value, and a missed day
     * changes it. Grouping on that gives the runs, and the streak is the run
     * containing the most recent day. */
  with bounded as (
    select day
    from public.recording_days
    where user_id = target
      and day <= (now() at time zone coalesce(zone, 'UTC'))::date
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
        -- A run that ended before yesterday is a streak that is over. Yesterday
        -- still counts: ending it at midnight would mean every person has a
        -- broken streak every morning until they record again.
        and (select last_day from latest)
            >= (now() at time zone coalesce(zone, 'UTC'))::date - 1
    ),
    0
  );
$$;

revoke all on function public.current_streak(uuid, text) from public;
grant execute on function public.current_streak(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Finding people, without handing out the profiles table
-- ---------------------------------------------------------------------------

/* Search by username or by name.
 *
 * `security definer` because the profiles policies deliberately let you read
 * exactly one row — your own — and that is the right default for a table
 * holding a date of birth. This function is the one hole in it, and it is
 * shaped so that the hole is only ever the four fields below: no email, no
 * date of birth, no plan, no Stripe id.
 *
 * `search_path` is pinned, which for a definer function is not optional: an
 * unpinned one runs whatever `public` means to the caller. */
create or replace function public.search_people(query text)
returns table (
  user_id uuid,
  username text,
  first_name text,
  last_name text,
  avatar_url text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p.user_id, p.username, p.first_name, p.last_name, p.avatar_url
  from public.profiles p
  where
    p.username is not null
    and p.user_id <> (select auth.uid())
    and length(btrim(query)) >= 2
    and (
      p.username like lower(btrim(query)) || '%'
      or lower(p.first_name || ' ' || p.last_name) like '%' || lower(btrim(query)) || '%'
    )
  order by
    -- An exact username first, then username prefixes, then name matches.
    (p.username = lower(btrim(query))) desc,
    (p.username like lower(btrim(query)) || '%') desc,
    p.username
  limit 20;
$$;

revoke all on function public.search_people(text) from public;
grant execute on function public.search_people(text) to authenticated;

/* Is this name free? Asked by the onboarding form as somebody types.
 *
 * Its own function rather than a select, for the same reason as the search:
 * answering "is this taken" must not require the ability to read the row that
 * took it. It returns a boolean and nothing else — not who has it. */
create or replace function public.username_available(candidate text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select not exists (
    select 1 from public.profiles
    where username = lower(btrim(candidate))
      and user_id <> coalesce((select auth.uid()), '00000000-0000-0000-0000-000000000000'::uuid)
  );
$$;

revoke all on function public.username_available(text) from public;
grant execute on function public.username_available(text) to authenticated, anon;

/* What a friend is allowed to see, and the friendship check is inside it.
 *
 * The alternative — policies on `courses` and `recording_days` that admit
 * friends — would mean a friend could read every row of both tables and count
 * them himself. What a friend gets is two numbers. */
create or replace function public.friend_stats(target uuid)
returns table (topics integer, streak integer)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    (select count(*)::integer from public.courses c where c.user_id = target),
    public.current_streak(
      target,
      coalesce((select p.timezone from public.profiles p where p.user_id = target), 'UTC')
    )
  where
    target = (select auth.uid())
    or exists (
      select 1 from public.friendships f
      where f.status = 'accepted'
        and (
          (f.requester_id = (select auth.uid()) and f.addressee_id = target)
          or (f.addressee_id = (select auth.uid()) and f.requester_id = target)
        )
    );
$$;

revoke all on function public.friend_stats(uuid) from public;
grant execute on function public.friend_stats(uuid) to authenticated;
