-- What a course is for: learning something, or rehearsing something you will
-- say out loud.
--
-- The pipeline already served both. A deck uploaded as "sources" produces key
-- points that are the speaker's own talking points, and the gap report already
-- names the ones they never reached, how fast they went and where they slowed.
-- What was missing was anywhere to record which of the two somebody meant, so
-- every screen called it studying.
--
-- Defaults to 'study' so every existing course keeps its current behaviour and
-- nothing has to be backfilled.

alter table public.courses
  add column if not exists purpose text not null default 'study';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'courses_purpose_check'
  ) then
    alter table public.courses
      add constraint courses_purpose_check check (purpose in ('study', 'talk'));
  end if;
end $$;

-- No index and no RLS change on purpose: it is never a filter on its own, only
-- ever read alongside a course row the existing policies already gate by
-- `user_id`.
