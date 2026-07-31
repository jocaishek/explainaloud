-- Whether a course must be built from its uploaded files and nothing else.
--
-- Grounding was already implied by uploading a file, but "grounded" only ever
-- meant "prefer the sources": the build still ran a web search for further
-- reading, still wrote YouTube queries, and the model still filled thin spots
-- from its own knowledge. Someone revising from a specific set of lecture
-- notes wants the opposite — a course that is allowed to be short, and that
-- says what the files do not cover instead of quietly supplying it.
--
-- Defaults to false so every existing course keeps the behaviour it was built
-- with. No new RLS policies: the column rides on `courses`, whose row-level
-- policies already scope it to its owner.
alter table public.courses
  add column if not exists sources_only boolean not null default false;

comment on column public.courses.sources_only is
  'When true, the course is generated strictly from its uploaded sources: no web research, no video or reading suggestions, and no outside knowledge.';
