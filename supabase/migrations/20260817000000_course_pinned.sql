-- Pinning a topic to the top of the rail.
--
-- A column rather than a browser preference. The rail is the same list on a
-- laptop and a phone, and a pin that only exists on the machine it was made on
-- is a pin that appears to fall off — which is worse than not having one.
--
-- No index: this sorts a list already bounded to a page of rows per user, and
-- the query orders by `pinned` inside a filter on `user_id`, which the existing
-- index on that column already serves.

alter table public.courses
  add column if not exists pinned boolean not null default false;

comment on column public.courses.pinned is
  'Sticks this topic to the top of the sidebar rail for its owner.';
