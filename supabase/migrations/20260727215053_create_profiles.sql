-- Onboarding profile captured after sign-up: the name we greet people by,
-- their date of birth, and how they intend to use TeachItBack. A row here is
-- what marks an account as having finished onboarding — the dashboard
-- redirects back to /onboarding until one exists.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'use_type') then
    create type public.use_type as enum ('school', 'teacher', 'personal');
  end if;
end
$$;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null,
  last_name text not null,
  date_of_birth date not null,
  use_type public.use_type not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Trim-and-length guards so a profile can never be blank or absurd. The
  -- client validates too, but the client is not a trust boundary.
  constraint profiles_first_name_not_blank
    check (length(btrim(first_name)) between 1 and 80),
  constraint profiles_last_name_not_blank
    check (length(btrim(last_name)) between 1 and 80),
  -- Nobody predates the calendar or is born in the future. The 13-year
  -- minimum age is enforced in the app; this only rejects nonsense.
  constraint profiles_date_of_birth_sane
    check (date_of_birth > date '1900-01-01' and date_of_birth < current_date)
);

alter table public.profiles enable row level security;

-- user_id is the primary key, so it is already indexed for these policies.

create policy "profiles_select_authenticated"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "profiles_insert_authenticated"
  on public.profiles for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "profiles_update_authenticated"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "profiles_delete_authenticated"
  on public.profiles for delete to authenticated
  using ((select auth.uid()) = user_id);
