-- Squads: a streak that belongs to a group rather than to a person.
--
-- A personal streak is a promise to yourself, and it breaks quietly. A squad's
-- breaks in front of four other people, which is the entire mechanism — the
-- day somebody does not want to record is the day the group notices, and that
-- is the day the habit is actually worth something.
--
-- Built on what is already here rather than beside it: `recording_days` is
-- still the only record of who explained something on which day, and a squad's
-- streak is a question asked of those same rows. Nothing writes a second copy
-- of the truth.

-- ---------------------------------------------------------------------------
-- 1. The squad, and its join code
-- ---------------------------------------------------------------------------

create table if not exists public.squads (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 2 and 40),
  owner_id uuid not null references auth.users (id) on delete cascade,
  /* Shared out of band — a message, a group chat — so it has to survive being
     read aloud and typed back in. Upper case, no vowels, and no 0/O or 1/I:
     the characters that get transcribed wrong are the ones left out, rather
     than the ones a support message has to explain. */
  join_code text not null,
  created_at timestamptz not null default now(),
  constraint squads_join_code_shape check (join_code ~ '^[BCDFGHJKLMNPQRSTVWXYZ23456789]{6}$')
);

create unique index if not exists squads_join_code_key
  on public.squads (join_code);

create index if not exists squads_owner_idx
  on public.squads (owner_id);

alter table public.squads enable row level security;

-- ---------------------------------------------------------------------------
-- 2. Membership
-- ---------------------------------------------------------------------------

create table if not exists public.squad_members (
  squad_id uuid not null references public.squads (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (squad_id, user_id)
);

/* Both directions are asked constantly: "who is in this squad" when drawing
   one, and "which squads am I in" on every page that mentions them. The
   primary key serves the first; this serves the second, and it is also the
   column every policy below joins on. */
create index if not exists squad_members_user_idx
  on public.squad_members (user_id);

alter table public.squad_members enable row level security;

/* Membership, asked without recursion.
 *
 * `squad_members`' own policies cannot be written in terms of
 * `squad_members` — a policy that selects from the table it guards is
 * infinite. A `security definer` function reads the row with RLS off, which
 * is the standard way out of that and is safe here because it answers exactly
 * one question about exactly the caller. */
create or replace function public.in_squad(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.squad_members
    where squad_id = target
      and user_id = (select auth.uid())
  );
$$;

revoke all on function public.in_squad(uuid) from public;
revoke all on function public.in_squad(uuid) from anon;
grant execute on function public.in_squad(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Policies, one per operation and per role
-- ---------------------------------------------------------------------------

/* A squad is visible to the people in it. Not to anybody holding the code:
   the code buys you a join, and joining is what makes you a member. */
drop policy if exists "squads_select_authenticated" on public.squads;
create policy "squads_select_authenticated"
  on public.squads for select to authenticated
  using (public.in_squad(id) or owner_id = (select auth.uid()));

drop policy if exists "squads_insert_authenticated" on public.squads;
create policy "squads_insert_authenticated"
  on public.squads for insert to authenticated
  with check (owner_id = (select auth.uid()));

/* Renaming is the owner's. The code is not editable at all — a squad whose
   code can be rotated is a squad whose members can be locked out by one
   person, and there is no reason to want that. */
drop policy if exists "squads_update_authenticated" on public.squads;
create policy "squads_update_authenticated"
  on public.squads for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop policy if exists "squads_delete_authenticated" on public.squads;
create policy "squads_delete_authenticated"
  on public.squads for delete to authenticated
  using (owner_id = (select auth.uid()));

/* Members see each other. That is the point of a shared streak: you cannot
   know whether today is safe without knowing who has not recorded. */
drop policy if exists "squad_members_select_authenticated" on public.squad_members;
create policy "squad_members_select_authenticated"
  on public.squad_members for select to authenticated
  using (public.in_squad(squad_id));

/* You may add yourself and nobody else. Joining goes through `join_squad`
   below, which is what checks the code; this is the floor under it. */
drop policy if exists "squad_members_insert_authenticated" on public.squad_members;
create policy "squad_members_insert_authenticated"
  on public.squad_members for insert to authenticated
  with check (user_id = (select auth.uid()));

/* Nothing on a membership row is editable. Leaving is a delete. */

/* You may remove yourself; an owner may remove anybody. An owner who leaves
   takes the squad with them — see `leave_squad`. */
drop policy if exists "squad_members_delete_authenticated" on public.squad_members;
create policy "squad_members_delete_authenticated"
  on public.squad_members for delete to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.squads
      where squads.id = squad_members.squad_id
        and squads.owner_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- 4. The streak itself
-- ---------------------------------------------------------------------------

/* A day counts for the squad when it counted for everybody in it.
 *
 * `recording_days.day` is already a *local* date — written in the timezone the
 * person was standing in when they recorded — so comparing those dates across
 * members is comparing everybody's own Tuesday, which is the semantics a squad
 * spanning two timezones needs and the one it would be wrong to recompute
 * here.
 *
 * The run is then the same island-and-gap count `current_streak` uses on one
 * person, over the days the whole squad finished. Deliberately the same shape:
 * the two numbers sit next to each other on the screen, and a squad streak
 * that counted forgiveness differently from a personal one would be a bug
 * reported as a lie.
 *
 * Today is allowed to be incomplete — a squad checked at nine in the morning
 * has not failed, it has not finished — which is the `>= today - 1` at the
 * end, exactly as in `current_streak`.
 *
 * One query rather than a loop. The first draft walked back a day at a time
 * asking "did everybody record on this one", which is up to 366 round trips
 * inside a function the friends page calls once per squad.
 */
create or replace function public.squad_streak(target uuid)
returns integer
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with size as (
    select count(*)::integer as members
    from public.squad_members
    where squad_id = target
  ),
  complete as (
    select d.day
    from public.recording_days d
    join public.squad_members m on m.user_id = d.user_id
    where m.squad_id = target
      and public.in_squad(target)
    group by d.day
    having count(distinct d.user_id) = (select members from size)
       and (select members from size) > 0
  ),
  islands as (
    select day, day - (row_number() over (order by day))::integer as run
    from complete
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
        and (select last_day from latest) >= (now() at time zone 'UTC')::date - 1
    ),
    0
  );
$$;

revoke all on function public.squad_streak(uuid) from public;
revoke all on function public.squad_streak(uuid) from anon;
grant execute on function public.squad_streak(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. What a squad looks like on screen
-- ---------------------------------------------------------------------------

/* One round trip for the whole panel.
 *
 * A squad is only legible as a list of who has and has not recorded today, so
 * returning the squads and then querying each one's members would be a request
 * per squad — and the answer is small enough to arrive in one.
 */
create or replace function public.squad_overview()
returns table (
  squad_id uuid,
  squad_name text,
  join_code text,
  is_owner boolean,
  streak integer,
  member_id uuid,
  member_username text,
  member_avatar_url text,
  recorded_today boolean
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    s.id,
    s.name,
    s.join_code,
    s.owner_id = (select auth.uid()),
    public.squad_streak(s.id),
    p.id,
    p.username,
    p.avatar_url,
    exists (
      select 1 from public.recording_days d
      where d.user_id = p.id
        and d.day = (now() at time zone public.safe_zone(p.timezone))::date
    )
  from public.squads s
  join public.squad_members mine
    on mine.squad_id = s.id
   and mine.user_id = (select auth.uid())
  join public.squad_members m on m.squad_id = s.id
  join public.profiles p on p.id = m.user_id
  order by s.created_at, p.username;
$$;

revoke all on function public.squad_overview() from public;
revoke all on function public.squad_overview() from anon;
grant execute on function public.squad_overview() to authenticated;

-- ---------------------------------------------------------------------------
-- 6. Creating, joining and leaving
-- ---------------------------------------------------------------------------

/* The code is generated here rather than in the browser.
 *
 * A client-generated code is a code somebody can choose, and a chosen code is
 * a way to squat on a memorable one or to guess at somebody else's. The retry
 * loop is for the collision that a unique index would otherwise surface as a
 * 23505 the caller has to understand.
 */
create or replace function public.create_squad(squad_name text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  alphabet text := 'BCDFGHJKLMNPQRSTVWXYZ23456789';
  code text;
  made uuid;
  attempt integer := 0;
begin
  if (select auth.uid()) is null then
    raise exception 'not signed in';
  end if;

  /* A cap, because a squad is a group of people who study together and a
     hundred of those is a mailing list. It also bounds `squad_streak`. */
  if (
    select count(*) from public.squad_members where user_id = (select auth.uid())
  ) >= 5 then
    raise exception 'too many squads';
  end if;

  loop
    attempt := attempt + 1;
    code := '';
    for i in 1..6 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::integer, 1);
    end loop;

    begin
      insert into public.squads (name, owner_id, join_code)
      values (btrim(squad_name), (select auth.uid()), code)
      returning id into made;
      exit;
    exception when unique_violation then
      if attempt >= 8 then
        raise;
      end if;
    end;
  end loop;

  insert into public.squad_members (squad_id, user_id)
  values (made, (select auth.uid()));

  return made;
end;
$$;

revoke all on function public.create_squad(text) from public;
revoke all on function public.create_squad(text) from anon;
grant execute on function public.create_squad(text) to authenticated;

/* Joining by code.
 *
 * `security definer` because the whole point is to read a row the caller is
 * not yet allowed to see. It takes the code and returns the squad it joined,
 * so a wrong code is a null rather than an error somebody has to interpret.
 *
 * The cap on members is here rather than in a constraint because it is a
 * property of the group, not of a row, and a check constraint cannot count
 * its own table.
 */
create or replace function public.join_squad(code text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  found uuid;
  size integer;
begin
  if (select auth.uid()) is null then
    raise exception 'not signed in';
  end if;

  select id into found
  from public.squads
  where join_code = upper(btrim(code));

  if found is null then
    return null;
  end if;

  if (
    select count(*) from public.squad_members where user_id = (select auth.uid())
  ) >= 5 then
    raise exception 'too many squads';
  end if;

  select count(*) into size
  from public.squad_members
  where squad_id = found;

  if size >= 12 then
    raise exception 'squad is full';
  end if;

  insert into public.squad_members (squad_id, user_id)
  values (found, (select auth.uid()))
  on conflict do nothing;

  return found;
end;
$$;

revoke all on function public.join_squad(text) from public;
revoke all on function public.join_squad(text) from anon;
grant execute on function public.join_squad(text) to authenticated;

/* Leaving, and what an owner leaving means.
 *
 * The squad goes with them. Handing ownership to whoever joined next is the
 * other option and it is worse: it makes somebody responsible for a group they
 * did not start, silently, on a day they were not asked. */
create or replace function public.leave_squad(target uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if exists (
    select 1 from public.squads
    where id = target and owner_id = (select auth.uid())
  ) then
    delete from public.squads where id = target;
    return;
  end if;

  delete from public.squad_members
  where squad_id = target and user_id = (select auth.uid());
end;
$$;

revoke all on function public.leave_squad(uuid) from public;
revoke all on function public.leave_squad(uuid) from anon;
grant execute on function public.leave_squad(uuid) to authenticated;
