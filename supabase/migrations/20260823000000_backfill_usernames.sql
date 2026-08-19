-- Everybody gets a username, without being asked for one.
--
-- Accounts made before usernames existed have `null`, and the previous answer
-- was a card on the friends screen inviting them to pick one. That was the
-- wrong shape for the problem. A person who signed up months ago did not
-- choose to be nameless — the column did not exist yet — so being sent to a
-- form to fix something they did not break is a chore invented by the
-- migration order. Their name is already on the account. Use it.
--
-- New accounts still choose, at onboarding, where choosing is the point.
--
-- **This runs once and cannot run again meaningfully.** It only touches rows
-- where `username is null`, and the immutability trigger from
-- 20260820020000 permits exactly that transition — null to a value — and
-- nothing else. A second run finds nothing to do.

-- ---------------------------------------------------------------------------
-- 1. A name, reduced to characters a username may contain
-- ---------------------------------------------------------------------------

/* Diacritics are folded rather than dropped, so José becomes `jose` and not
 * `jos`. Somebody whose name does not fit in ASCII should still get something
 * recognisable as theirs, and losing a letter from the middle of it is worse
 * than losing the accent on top of it.
 *
 * The pair of strings below is generated, not typed. Hand-writing a 67-pair
 * `translate` map is how you end up with the two sides a different length,
 * which Postgres accepts silently by ignoring the tail — every name with a
 * `ñ` in it would have folded to the wrong letter and nobody would have seen
 * it until somebody complained about their handle.
 *
 * Characters outside the map (Cyrillic, CJK, `ł`, `ß`) are stripped by the
 * regex rather than transliterated. That is a real limit and the fallback in
 * `derive_username` is what covers it: a name that folds to fewer than three
 * characters gets padded from the account id instead. */
create or replace function public.fold_name(value text)
returns text
language sql
immutable
set search_path = pg_catalog, pg_temp
as $$
  select regexp_replace(
    translate(
      lower(coalesce(value, '')),
      'àáâãäåāăąèéêëēĕėęěìíîïĩīĭįıòóôõöøōŏőùúûüũūŭůűųñńņňçćĉċčýÿŷšśŝşžźżđþ',
      'aaaaaaaaaeeeeeeeeeiiiiiiiiiooooooooouuuuuuuuuunnnncccccyyysssszzzdt'
    ),
    '[^a-z0-9]', '', 'g'
  );
$$;

-- ---------------------------------------------------------------------------
-- 2. First name and last name, run together, made unique
-- ---------------------------------------------------------------------------

/* `security definer` because it reads every row of `profiles` to find a free
 * name, which no signed-in caller may do. It is granted to nobody: the only
 * thing that calls it is the backfill below, running as the migration. */
create or replace function public.derive_username(
  first_name text,
  last_name text,
  seed uuid
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  base text;
  candidate text;
  suffix text;
  n integer := 1;
  /* Names nobody may hold however they are spelled on their passport. The
     same list `src/lib/username.ts` refuses at signup — kept short here
     because it only has to cover the impersonation cases, which are the ones
     where an accident matters. */
  reserved text[] := array[
    'about','account','admin','administrator','api','auth','billing','contact',
    'explainaloud','help','home','login','logout','mod','moderator','official',
    'owner','privacy','profile','record','root','security','settings','signup',
    'staff','support','system','team','terms','test','undefined','null'
  ];
begin
  base := public.fold_name(first_name) || public.fold_name(last_name);
  base := substr(base, 1, 20);

  /* Under three characters the shape constraint rejects it. Pad from the
     account id, which is already unique, rather than from a counter. */
  if length(base) < 3 then
    base := substr(base || replace(seed::text, '-', ''), 1, 8);
  end if;

  candidate := base;

  loop
    exit when candidate <> all(reserved)
          and not exists (
            select 1 from public.profiles p where p.username = candidate
          );

    n := n + 1;

    /* Give up rather than spin. Ten thousand people sharing one folded name
       is not a case worth handling gracefully, and an account id is always
       free. */
    if n > 9999 then
      return substr('u' || replace(seed::text, '-', ''), 1, 20);
    end if;

    suffix := n::text;
    candidate := substr(base, 1, 20 - length(suffix)) || suffix;
  end loop;

  return candidate;
end;
$$;

revoke all on function public.derive_username(text, text, uuid) from public;
revoke all on function public.derive_username(text, text, uuid) from anon;
revoke all on function public.derive_username(text, text, uuid) from authenticated;

-- ---------------------------------------------------------------------------
-- 3. The backfill
-- ---------------------------------------------------------------------------

/* Row by row rather than one `update ... from`, because each name has to be
   checked against the names assigned by the rows before it. A set-based
   update computes every candidate against the table as it was before the
   statement began, so two people called Jordan Lee would both be handed
   `jordanlee` and the unique index would abort the whole migration. */
do $$
declare
  person record;
  chosen text;
begin
  for person in
    select user_id, first_name, last_name
    from public.profiles
    where username is null
    order by created_at
  loop
    chosen := public.derive_username(
      person.first_name, person.last_name, person.user_id
    );
    update public.profiles
    set username = chosen,
        updated_at = now()
    where user_id = person.user_id
      and username is null;
  end loop;
end
$$;
