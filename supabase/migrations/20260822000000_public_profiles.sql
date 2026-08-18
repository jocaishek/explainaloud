-- A profile page anybody signed in can open.
--
-- `/profiles/<username>` is a real place. Until now a person existed only as a
-- row in somebody's search results, which meant the decision to add them had
-- to be made from a name and a handle and nothing else. A page they can be
-- sent to is what makes "add them, or don't" an actual choice.
--
-- **Signed in, not public.** This is granted to `authenticated` and to nobody
-- else. There is no anonymous read, so a profile cannot be crawled, indexed,
-- or enumerated by anything that has not made an account.
--
-- **What a stranger sees, and what they do not.** Identity is open: the name,
-- the handle, the picture, and how long the account has existed. The two
-- numbers are not. `topics` and `streak` come back null unless the caller is
-- the person themselves or an accepted friend, which is the same rule
-- `friend_overview` enforces and the same rule the Terms and the Privacy
-- Policy state in words.
--
-- That split is deliberate and it is the whole design. Being findable is what
-- makes a friends feature work; a study record readable by every account on
-- the service is a different product, and not one anybody agreed to when they
-- signed up. So the page is open and the numbers are earned.

create or replace function public.public_profile(handle text)
returns table (
  user_id uuid,
  username text,
  first_name text,
  last_name text,
  avatar_url text,
  member_since timestamptz,
  /* 'self' | 'friends' | 'incoming' | 'outgoing' | 'none' — what the button
     on the page does. */
  status text,
  /* The friendship row, so answering a request from the page needs no second
     lookup. Null when there is nothing between you. */
  request_id uuid,
  /* Null for a stranger. Not zero: zero is a fact about somebody's studying
     and null is "you are not being told", and a page that renders 0 for both
     is a page that reports every stranger as having done nothing. */
  topics integer,
  streak integer
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with me as (
    select (select auth.uid()) as uid
  ),
  target as (
    select p.user_id, p.username, p.first_name, p.last_name,
           p.avatar_url, p.created_at, p.timezone
    from public.profiles p
    where p.username = lower(btrim(handle))
    limit 1
  ),
  rel as (
    /* The one row that can exist between these two people, whichever way
       round it was asked. Same expression as `friendships_pair_key`, so the
       unique index serves the lookup. `f.status` is renamed on the way out:
       leaving it called `status` would collide with this function's own output
       column of that name. */
    select f.id, f.status as pair_status, f.addressee_id
    from public.friendships f, target t, me
    where least(f.requester_id, f.addressee_id) = least(t.user_id, me.uid)
      and greatest(f.requester_id, f.addressee_id) = greatest(t.user_id, me.uid)
    limit 1
  )
  select
    t.user_id,
    t.username,
    t.first_name,
    t.last_name,
    t.avatar_url,
    t.created_at,
    case
      when t.user_id = me.uid then 'self'
      when r.id is null then 'none'
      when r.pair_status = 'accepted' then 'friends'
      when r.addressee_id = me.uid then 'incoming'
      else 'outgoing'
    end,
    r.id,
    case
      when t.user_id = me.uid or r.pair_status = 'accepted'
      then (select count(*)::integer from public.courses c where c.user_id = t.user_id)
    end,
    case
      when t.user_id = me.uid or r.pair_status = 'accepted'
      then public.current_streak(t.user_id, coalesce(t.timezone, 'UTC'))
    end
  from target t
  cross join me
  left join rel r on true
  where me.uid is not null;
$$;

revoke all on function public.public_profile(text) from public;
revoke all on function public.public_profile(text) from anon;
grant execute on function public.public_profile(text) to authenticated;
