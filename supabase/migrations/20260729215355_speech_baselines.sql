-- How each person sounds when they know something.
--
-- Pace and hesitation only mean anything against the same speaker's own
-- reference: speaking rates range from roughly 100 to 190 wpm and both ends are
-- perfectly normal, so any fixed threshold would tell deliberate speakers, and
-- speakers of English as a second language, that they do not understand their
-- own material. This table holds that per-person reference.
--
-- It is keyed on auth.users rather than on profiles because the onboarding
-- warm-up is recorded *before* the profile row exists — the whole point of
-- collecting it during onboarding is to have a confident-speech reference from
-- the very first real session, rather than waiting several sessions to
-- accumulate one.
--
-- Only summary statistics are stored. No audio, and not even the transcript of
-- the warm-up: the numbers are all that is needed, and keeping the recording
-- would contradict what the Privacy Policy says about audio retention.
create table if not exists public.speech_baselines (
  user_id uuid primary key references auth.users (id) on delete cascade,
  -- 'calibration' for the onboarding warm-up, 'sessions' once real recordings
  -- have replaced it. Kept so the display can hedge on a single 30-second
  -- sample instead of presenting it as a settled picture of someone.
  source text not null default 'calibration',
  median_wpm integer not null,
  capable_wpm integer not null,
  pause_p90_ms integer not null,
  filler_per_100 numeric(5, 1) not null,
  word_count integer not null,
  speaking_seconds numeric(6, 2) not null,
  -- How many recordings are folded into these numbers.
  sample_count integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.speech_baselines enable row level security;

-- One policy per operation, and only for authenticated. `anon` gets nothing:
-- there is no reason for a signed-out visitor to read or write anyone's
-- speaking profile, and a single permissive policy would be the easiest way to
-- accidentally allow it.
create policy "speech_baselines_select_own"
  on public.speech_baselines
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "speech_baselines_insert_own"
  on public.speech_baselines
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "speech_baselines_update_own"
  on public.speech_baselines
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "speech_baselines_delete_own"
  on public.speech_baselines
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- `user_id` is the primary key, so it is already indexed and the policies above
-- need no further index.

-- Per-session delivery metrics, alongside the transcript they describe.
--
-- Stored as jsonb rather than as columns on purpose: which statistics are worth
-- keeping is not settled yet, and the thresholds that read them will be tuned
-- against recordings already collected. A jsonb blob can absorb a new field
-- without a migration; five typed columns would force one every time the
-- interpretation changed.
alter table public.course_sessions
  add column if not exists speech_metrics jsonb;

comment on column public.course_sessions.speech_metrics is
  'Delivery statistics from lib/speech-metrics: pace percentiles, pause distribution, filler rate. Descriptive only - never a judgement about the speaker on its own.';
