-- Index the columns the app actually filters on, and the RLS policies read.
--
-- `.claude/rules/supabase.md` says to index every column a policy references
-- that is not already a primary key. Four tables were missed, and they are not
-- the quiet ones:
--
--   course_sources     read on every grading pass — roughly once a second
--                      while somebody is speaking — and on every course build.
--                      Filtered by (course_id, user_id); the only index was
--                      the `id` primary key, so each of those was a sequential
--                      scan of every source row in the project.
--
--   course_questions   the interview question bank. Same shape, same filter,
--                      same missing index; read whenever an interview starts
--                      and written back after every question asked.
--
--   friendships        `incoming_request_count()` runs in the app layout, so
--                      it runs on **every navigation inside the app** for
--                      every signed-in person. It filters `addressee_id` with
--                      `status = 'pending'`, and both RLS policies read
--                      `requester_id` and `addressee_id`. No index on any of
--                      them.
--
--   course_sessions    `user_id` is indexed, but the dashboard reads the
--                      twenty most recent by `started_at desc` and the pace
--                      chart re-reads them; a composite serves the filter and
--                      the sort from one structure.
--
-- All of these are `if not exists` and none of them change a row, so this is
-- safe to replay and safe to apply to a live database.

-- The pair, in filter order: every query names the course and then scopes it
-- to the owner, and both RLS policies read `user_id`.
create index if not exists course_sources_course_id_user_id_idx
  on public.course_sources (course_id, user_id);

create index if not exists course_questions_course_id_user_id_idx
  on public.course_questions (course_id, user_id);

-- `status` rides along so the pending count is answered from the index alone
-- rather than by visiting the rows to filter them.
create index if not exists friendships_addressee_id_status_idx
  on public.friendships (addressee_id, status);

create index if not exists friendships_requester_id_status_idx
  on public.friendships (requester_id, status);

-- Descending, because every reader of this table wants the newest first.
create index if not exists course_sessions_user_id_started_at_idx
  on public.course_sessions (user_id, started_at desc);
