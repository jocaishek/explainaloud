-- Folders group topics on the dashboard home screen, and topics gain a
-- user-editable display name distinct from the topic text they were created
-- from. `courses.name` is nullable: null means "never renamed", and the UI
-- falls back to `topic`, so existing rows need no backfill.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'folder_color') then
    create type public.folder_color as enum (
      'default', 'red', 'orange', 'yellow', 'green', 'blue', 'purple'
    );
  end if;
end
$$;

create table if not exists public.folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  color public.folder_color not null default 'default',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint folders_name_not_blank
    check (length(btrim(name)) between 1 and 60)
);

create index if not exists folders_user_id_idx on public.folders (user_id);

alter table public.courses
  add column if not exists folder_id uuid
    references public.folders (id) on delete set null;

alter table public.courses
  add column if not exists name text;

-- Same guard on the new column, but null is allowed and means "use the topic".
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'courses_name_not_blank'
  ) then
    alter table public.courses add constraint courses_name_not_blank
      check (name is null or length(btrim(name)) between 1 and 120);
  end if;
end
$$;

-- Deleting a folder nulls folder_id rather than cascading the topics away,
-- so this index also serves the "loose topics" query (folder_id is null).
create index if not exists courses_folder_id_idx on public.courses (folder_id);

alter table public.folders enable row level security;

create policy "folders_select_authenticated"
  on public.folders for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "folders_insert_authenticated"
  on public.folders for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "folders_update_authenticated"
  on public.folders for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "folders_delete_authenticated"
  on public.folders for delete to authenticated
  using ((select auth.uid()) = user_id);
