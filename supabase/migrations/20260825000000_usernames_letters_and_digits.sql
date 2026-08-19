-- Usernames are letters and digits. No underscore, and no separator at all.
--
-- The shape shipped with the friends work allowed a single underscore between
-- two alphanumerics, on the reasoning that one separator cannot be doubled
-- into an impersonation. That is true and it was still the wrong call: it
-- means `@ada_lovelace` and `@adalovelace` are two different people, told
-- apart by a character nobody says out loud and half of everybody forgets
-- when they type a friend's handle from memory. A handle is something one
-- person reads to another. It should survive being read.
--
-- So the alphabet is `[a-z0-9]` and nothing else, which also collapses the
-- whole family of look-alike names to one spelling per name.
--
-- Two steps, in this order. Existing names are folded first, while the old
-- constraint still accepts everything they are being folded *from* and
-- everything they are being folded *to*; only then is the constraint
-- tightened. Doing it the other way round aborts the migration on the first
-- row that has not been folded yet.

-- ---------------------------------------------------------------------------
-- 1. Fold the names people already hold
-- ---------------------------------------------------------------------------

/* Row by row, for the same reason the backfill was: each folded name has to
   be checked against the names the earlier rows have just taken. Two people
   holding `ada_lovelace` and `adalovelace` now want the same string, and a
   set-based update would hand it to both and die on the unique index.

   Whoever already holds the run-together spelling keeps it, and gets no
   update at all: the loop only visits rows that contain a separator, so a
   plain `adalovelace` is never a candidate to be moved, and the `exists`
   check below is what stops `ada_lovelace` taking it. That is the fair
   answer — the person who has to move is the one whose handle was only ever
   distinguishable by punctuation. The `order by` is not doing that work; it
   is there so that two rows folding onto the same name are resolved the same
   way every time the migration is replayed. */
do $$
declare
  person record;
  base text;
  candidate text;
  suffix text;
  n integer := 1;
begin
  for person in
    select user_id, username
    from public.profiles
    where username is not null
      and username <> regexp_replace(username, '[^a-z0-9]', '', 'g')
    order by user_id
  loop
    base := regexp_replace(person.username, '[^a-z0-9]', '', 'g');

    /* `a_b` is three characters and legal under the old shape; without its
       underscore it is two, which is under the floor. Pad from the account
       id, exactly as `derive_username` does, so the fallback is unique
       rather than a counter that can collide with a real name. */
    if length(base) < 3 then
      base := substr(
        base || replace(person.user_id::text, '-', ''), 1, 8
      );
    end if;

    base := substr(base, 1, 20);
    candidate := base;
    n := 1;

    loop
      exit when not exists (
        select 1
        from public.profiles p
        where p.username = candidate
          and p.user_id <> person.user_id
      );

      n := n + 1;

      if n > 9999 then
        candidate := substr(
          'u' || replace(person.user_id::text, '-', ''), 1, 20
        );
        exit;
      end if;

      suffix := n::text;
      candidate := substr(base, 1, 20 - length(suffix)) || suffix;
    end loop;

    update public.profiles
    set username = candidate
    where user_id = person.user_id;
  end loop;
end
$$;

-- ---------------------------------------------------------------------------
-- 2. Tighten the shape
-- ---------------------------------------------------------------------------

/* Dropped and re-added rather than altered: a check constraint has no `alter`
   that changes its expression, and `not valid` plus a later `validate` would
   leave a window where the old shape is still accepted. Every existing row
   already satisfies the new expression by step 1, so the full-table
   validation this does is the point rather than a cost.

   `if exists` on the drop because a database restored from before the friends
   work has no such constraint to lose. */
alter table public.profiles
  drop constraint if exists profiles_username_shape;

alter table public.profiles
  add constraint profiles_username_shape check (
    username is null or (
      username = lower(username)
      and username ~ '^[a-z0-9]{3,20}$'
    )
  );
