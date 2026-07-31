-- A bank of questions per topic, so an interview draws rather than invents.
--
-- Questions used to be written the moment the student picked interview mode.
-- That put a model call on the critical path of a click: the card showed a
-- placeholder question, then replaced it half a second later with a different
-- one, which reads as the app changing its mind about what it is asking.
--
-- Writing them ahead of time and storing them makes the draw a database read.
-- It also makes "never ask the same question twice" something the database can
-- answer — `times_asked` is the whole mechanism: draw the least-asked first,
-- and a question is only repeated once every other one has been used.
create table if not exists public.course_questions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  question text not null,
  -- Which section this examines, and what a complete spoken answer to THIS
  -- question contains. Grading reads the key points from here: marking a
  -- narrow question against everything its section covers is what once
  -- reported "0 of 3 covered" for an answer that answered it well.
  section_index integer not null default 0,
  section text not null default '',
  key_points jsonb not null default '[]'::jsonb,
  -- How many interviews have used it. Zero means never asked.
  times_asked integer not null default 0,
  last_asked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint course_questions_section_index_range check (section_index >= 0),
  constraint course_questions_times_asked_range check (times_asked >= 0)
);

-- One row per question per course. The model is told what it has already
-- written, but "told" is not "prevented" — this is what actually stops a
-- repeated batch from filling the bank with the same question twice.
--
-- Plain columns rather than an expression over them: an insert names this as
-- its conflict target, and a `lower(question)` index cannot be named that way.
create unique index if not exists course_questions_unique_idx
  on public.course_questions (course_id, question);

-- The draw's own ordering: every question for one course, least-asked first.
create index if not exists course_questions_draw_idx
  on public.course_questions (course_id, user_id, times_asked);

alter table public.course_questions enable row level security;

-- One policy per operation, authenticated only. A question bank belongs to the
-- student it was written for: it records what they have already been asked,
-- which is a record of what they have been getting wrong.
create policy "authenticated can read own course questions"
  on public.course_questions
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "authenticated can insert own course questions"
  on public.course_questions
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "authenticated can update own course questions"
  on public.course_questions
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "authenticated can delete own course questions"
  on public.course_questions
  for delete
  to authenticated
  using (auth.uid() = user_id);
