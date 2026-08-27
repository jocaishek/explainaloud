-- Rename one account whose handle the blocklist should have refused.
--
-- The username rules only ever applied to the moment somebody picked one, and
-- until now the profanity check matched the whole handle rather than any part
-- of it — so a handle ending in a word that was on the list took it. The check
-- has been fixed; this is the one name that got in before it was.
--
-- A moderation action, done as a migration on purpose. The alternative is
-- somebody running an UPDATE against production from a shell, which leaves no
-- record of what was changed, by whom, or why, and no way for the next person
-- to find out. This leaves all three in the history.
--
-- The trigger has to come off for it. `profiles_immutable_fields` refuses any
-- change to a username that is already set, deliberately and correctly — a
-- handle other people have learned should not be swappable, or it becomes a
-- way to be mistaken for somebody else afterwards. That reasoning is about the
-- account holder, not about the database owner, and disabling it for the
-- length of one statement is the honest way to say "this is an exception"
-- rather than weakening the rule for everybody.
--
-- Everything here is conditional, so this is a no-op on any database where the
-- name has already been changed, was never taken, or where the new one is
-- somehow occupied — including every local reset from scratch.

do $$
declare
  target uuid;
begin
  select user_id into target
  from public.profiles
  where username = 'rithviklikesdick';

  if target is null then
    raise notice 'nothing to rename';
    return;
  end if;

  if exists (select 1 from public.profiles where username = 'rithviklikes') then
    raise notice 'rithviklikes is taken; leaving the flagged name in place';
    return;
  end if;

  alter table public.profiles disable trigger profiles_immutable_fields;
  update public.profiles set username = 'rithviklikes' where user_id = target;
  alter table public.profiles enable trigger profiles_immutable_fields;

  raise notice 'renamed to rithviklikes';
end
$$;

/* And if the block above threw, the trigger must not be left off.
 *
 * Supabase runs a migration in a transaction and `alter table` is
 * transactional, so a failure rolls the disable back with everything else.
 * This is belt and braces for the case where that stops being true — a
 * profiles table that accepts username changes is a quieter problem than a
 * failed migration, and it would not be noticed. */
alter table public.profiles enable trigger profiles_immutable_fields;
