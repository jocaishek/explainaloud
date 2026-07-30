-- Podcast mode: several questions answered back to back in one sitting.
--
-- Each answer stays its own session row, which is the whole reason this is a
-- column and not a table. A session already carries the question, the
-- transcript, the spans, the score, the pace metrics and its gap rows; an
-- interview is those rows in order, not a different kind of thing. Grouping
-- them by a run id gets the recap and the "3 of 5 answered" counter for free,
-- and a run that is abandoned halfway leaves three real graded answers behind
-- rather than one broken parent row.
--
-- Null means a single answer recorded on its own, which is every session that
-- existed before this.
alter table public.course_sessions
  add column if not exists podcast_run uuid;

-- The recap reads every turn of one run for one user, so the run id is the
-- lookup column. Partial, because the overwhelming majority of rows are single
-- answers with nothing to group.
create index if not exists course_sessions_podcast_run_idx
  on public.course_sessions (podcast_run)
  where podcast_run is not null;

-- Ownership already governs this table (see the policies in
-- 20260725022024_create_courses_sessions_gaps.sql) and this column is covered
-- by them: a run is readable exactly when its rows are. Worth stating because
-- the run id is client-generated — it groups rows, it never grants access to
-- them, so two users colliding on a uuid would still see only their own turns.
