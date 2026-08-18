-- A username and a date of birth are set once and then they are what they are.
--
-- Enforced by a trigger rather than by leaving the fields off a form, because
-- "the form does not offer it" is not a rule — the update goes through
-- PostgREST with the caller's own token, and the profiles update policy quite
-- correctly lets somebody write their own row. Anybody who can open a browser
-- console can write any column that policy allows. So the constraint belongs
-- next to the data.
--
-- Why these two in particular:
--
--   username      Other people learn it, type it into a search box, and use it
--                 to know who they are adding. A name that can be handed over
--                 or swapped is a name that can be used to become somebody
--                 else after the fact, and the friend list would not notice.
--
--   date_of_birth It gates the account at thirteen and it is a fact about a
--                 person rather than a preference. A field that can be edited
--                 freely is a field the age check cannot rely on.
--
-- Both may still be set from empty, which is what onboarding does, and what an
-- account created before this migration needs in order to gain a username at
-- all. What cannot happen is changing one that is already there.

create or replace function public.profiles_immutable_fields()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if old.username is not null and new.username is distinct from old.username then
    raise exception 'username cannot be changed'
      using errcode = 'check_violation';
  end if;

  if old.date_of_birth is not null
     and new.date_of_birth is distinct from old.date_of_birth then
    raise exception 'date_of_birth cannot be changed'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_immutable_fields on public.profiles;

create trigger profiles_immutable_fields
  before update on public.profiles
  for each row
  execute function public.profiles_immutable_fields();
