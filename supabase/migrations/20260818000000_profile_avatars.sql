-- A profile picture: one column on the profile, one storage bucket for the
-- file itself.
--
-- The bucket is public-read on purpose. An avatar is shown in the rail on
-- every screen of the app, and a private bucket means a signed URL that
-- expires — so every render either mints a new one or serves a broken image.
-- Writes are not public: the policies below scope insert, update and delete to
-- a folder named after the owner's uid, so nobody can write into anybody
-- else's prefix even though everybody can read.

alter table public.profiles
  add column if not exists avatar_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  2097152, -- 2 MB. A rail avatar renders at 32px; anything larger is waste.
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Granular, one policy per operation and per role, per the project rules.
-- `storage.foldername(name)[1]` is the first path segment, which is where the
-- upload puts the owner's uid.

drop policy if exists "avatars_select_public" on storage.objects;
create policy "avatars_select_public"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'avatars');

drop policy if exists "avatars_insert_authenticated" on storage.objects;
create policy "avatars_insert_authenticated"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "avatars_update_authenticated" on storage.objects;
create policy "avatars_update_authenticated"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "avatars_delete_authenticated" on storage.objects;
create policy "avatars_delete_authenticated"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
