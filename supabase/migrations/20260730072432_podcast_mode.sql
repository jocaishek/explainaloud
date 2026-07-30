-- Podcast mode: one recording, three questions.
--
-- A session is still one recording and still costs one of the day's, which is
-- what makes the two modes a real choice rather than a discount: topic mode
-- spends it explaining a whole topic, podcast mode spends it answering three
-- questions. So this is columns on the session, not rows beside it.
--
-- `segments` holds the per-question breakdown: what was asked, the slice of
-- transcript that answered it, and what that answer scored. The session's own
-- transcript, spans, report and score stay the merged whole, so the gap report
-- and Re-Teach keep reading one session the way they always have and need to
-- know nothing about questions.
--
-- Shape of each element, enforced in the application rather than here because
-- the grader's output shape is the application's business:
--   { "question": text, "section_index": int, "transcript": text,
--     "score": int, "verdict": text }
alter table public.course_sessions
  add column if not exists mode text not null default 'topic',
  add column if not exists segments jsonb;

-- Existing sessions are all topic mode, which the default already gave them.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'course_sessions_mode_valid'
  ) then
    alter table public.course_sessions add constraint course_sessions_mode_valid
      check (mode in ('topic', 'podcast'));
  end if;
end
$$;

-- Ownership already governs this table (see the policies in
-- 20260725022024_create_courses_sessions_gaps.sql) and both columns are
-- covered by them: they are readable and writable exactly when the row is.
