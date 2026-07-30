-- Which question a recording was answering.
--
-- A session used to be "the student explained the topic", and grading scored
-- it against every key point in the course. That made a good answer to a small
-- part of the material look like a bad explanation of all of it. A session now
-- answers one section's question, and the score is read against that section's
-- key points alone.
--
-- Both columns are nullable: every existing session predates the question, and
-- a course whose generation failed still has no sections to ask about. Null
-- means "the whole topic", which is exactly how those older rows were graded.
alter table public.course_sessions
  add column if not exists question text,
  add column if not exists question_section integer;

-- The index is a position in `courses.generated.sections`, so a negative one
-- could only be a bug on the way in.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'course_sessions_question_section_range'
  ) then
    alter table public.course_sessions
      add constraint course_sessions_question_section_range
      check (question_section is null or question_section >= 0);
  end if;
end
$$;

-- Row ownership already governs this table (see the policies in
-- 20260725022024_create_courses_sessions_gaps.sql) and these columns are
-- covered by them, so there is no new policy to write: they are readable and
-- writable exactly when the row is.
