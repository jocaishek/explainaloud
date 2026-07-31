-- Let `slug` be null again until the code that sets it is deployed.
--
-- The previous migration added it NOT NULL and backfilled every existing row,
-- which is correct for the finished feature and wrong for the gap between the
-- two deploys: production does not yet write a slug, so every new course
-- insert would fail the constraint. A column the running code does not know
-- about must be optional until it does.
--
-- The unique index stays. It ignores nulls, so it keeps its promise for the
-- rows that have a slug without blocking the ones that do not.
alter table public.courses
  alter column slug drop not null;
