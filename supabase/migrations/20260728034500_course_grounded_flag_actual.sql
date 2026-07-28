-- Adds courses.grounded.
--
-- Rolling forward rather than editing 20260728032136: that migration was
-- committed empty by mistake and is already recorded as applied remotely, and
-- an applied migration must never be rewritten.
alter table public.courses
  add column if not exists grounded boolean not null default false;
