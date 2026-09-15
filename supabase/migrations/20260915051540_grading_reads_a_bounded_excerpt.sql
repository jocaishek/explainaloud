-- Let grading read the opening of a source instead of the whole document.
--
-- `SOURCE_BUDGET.grading` is 8,000 characters and has been since the budgets
-- were split: a grading pass checks spoken claims against key points that are
-- already in the prompt, with the sources there only to catch a contradiction,
-- so it deliberately does not get the chapter the course build gets.
--
-- The *query* never learned that. Every pass selected `content` whole and then
-- threw away everything past 8,000 characters in JavaScript — and a source is
-- allowed to be a 5 MB upload, so a live pass could pull several megabytes
-- across the wire, once a second, to use two per cent of it.
--
-- A stored generated column is the cheapest honest fix. It is not a function
-- body, so there is nothing here that can compile today and fail when it is
-- first called; `left()` is immutable, which is what lets the column be
-- stored; and the text stays a plain column, so RLS covers it exactly as it
-- covers `content` with no new policy to get wrong.
--
-- `content_length` rides along because the trimming note in the prompt has to
-- stay true. A model that cannot tell it is reading part of a document is the
-- model that fills in the rest from general knowledge, which is the whole
-- thing sources-only mode exists to prevent — so the reader needs to know the
-- excerpt is an excerpt, and that needs the real length.
--
-- Note for whoever applies this: adding a STORED generated column rewrites the
-- table and takes an ACCESS EXCLUSIVE lock for the duration. On this table,
-- today, that is a handful of rows.

alter table public.course_sources
  add column if not exists content_excerpt text
    generated always as (left(content, 8000)) stored;

alter table public.course_sources
  add column if not exists content_length integer
    generated always as (length(content)) stored;

comment on column public.course_sources.content_excerpt is
  'The grading budget''s worth of the opening. Written by the database so a '
  'once-a-second grading pass does not read a 5 MB document to use 8 KB of it. '
  'Course generation still reads `content` in full.';

comment on column public.course_sources.content_length is
  'Characters in `content`. Lets a reader of `content_excerpt` say truthfully '
  'that it was cut.';
