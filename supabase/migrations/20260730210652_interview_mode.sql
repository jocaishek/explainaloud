-- "Podcast mode" is now "interview mode".
--
-- The name was doing the product a disservice: a podcast is something
-- produced and pleasant that you listen to, and NotebookLM's Audio Overview
-- already owns that association in exactly this market. What this actually is
-- is a timed oral exam — three questions sharing one clock, no going back —
-- and calling it what it is sets the expectation right before someone starts
-- talking.
--
-- Rows first, then the constraint, or the update fails against the old check.
update public.course_sessions set mode = 'interview' where mode = 'podcast';

alter table public.course_sessions
  drop constraint if exists course_sessions_mode_valid;

alter table public.course_sessions
  add constraint course_sessions_mode_valid
  check (mode in ('topic', 'interview'));
