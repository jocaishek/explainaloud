-- Sources the model is allowed to read, generated course content, richer
-- session/gap records, and the per-day usage counters that cap free use at
-- 2 topics and 5 recordings.

-- ── Sources ────────────────────────────────────────────────────────────────
create table if not exists public.course_sources (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  filename text not null,
  mime_type text not null,
  byte_size integer not null,
  -- Extracted plain text. This, and only this, is what the model is shown.
  content text not null,
  created_at timestamptz not null default now(),

  constraint course_sources_content_not_blank
    check (length(btrim(content)) > 0),
  constraint course_sources_size_sane
    check (byte_size > 0 and byte_size <= 5 * 1024 * 1024)
);

create index if not exists course_sources_user_id_idx
  on public.course_sources (user_id);
create index if not exists course_sources_course_id_idx
  on public.course_sources (course_id);

alter table public.course_sources enable row level security;

create policy "course_sources_select_authenticated"
  on public.course_sources for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "course_sources_insert_authenticated"
  on public.course_sources for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "course_sources_update_authenticated"
  on public.course_sources for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "course_sources_delete_authenticated"
  on public.course_sources for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ── Generated course content ───────────────────────────────────────────────
alter table public.courses
  add column if not exists generated jsonb,
  add column if not exists generated_at timestamptz,
  add column if not exists generated_by text;

-- ── Session enrichment ─────────────────────────────────────────────────────
alter table public.course_sessions
  add column if not exists spans jsonb,
  add column if not exists report jsonb,
  add column if not exists score integer,
  add column if not exists analyzed_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'course_sessions_score_range'
  ) then
    alter table public.course_sessions add constraint course_sessions_score_range
      check (score is null or (score >= 0 and score <= 100));
  end if;
end
$$;

alter table public.gaps
  add column if not exists quiz text;

-- ── Daily usage counters ───────────────────────────────────────────────────
-- One row per user per local day. `day` is supplied by the caller as the
-- user's own calendar date, so a limit resets at the student's midnight and
-- not at the server's.
create table if not exists public.usage_daily (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  topics_created integer not null default 0,
  recordings_started integer not null default 0,
  primary key (user_id, day),

  constraint usage_daily_non_negative
    check (topics_created >= 0 and recordings_started >= 0)
);

alter table public.usage_daily enable row level security;

-- Read-only to the client: the UI shows "3 of 5 left", but only the
-- security-definer function below may increment. Deliberately no insert or
-- update policy — a user must not be able to reset their own counters.
create policy "usage_daily_select_authenticated"
  on public.usage_daily for select to authenticated
  using ((select auth.uid()) = user_id);

-- Atomically claim one unit of quota; returns true when the claim succeeded.
-- The conditional update runs under the row lock taken by the upsert, so two
-- concurrent requests cannot both observe "4 used" and both proceed.
create or replace function public.claim_daily_quota(
  p_kind text,
  p_day date,
  p_limit integer
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_rows integer := 0;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  if p_kind not in ('topic', 'recording') then
    raise exception 'unknown quota kind: %', p_kind;
  end if;

  -- Guard against a client passing a limit of its own choosing.
  if p_limit is null or p_limit < 0 or p_limit > 1000 then
    raise exception 'invalid limit';
  end if;

  insert into public.usage_daily (user_id, day)
  values (v_user, p_day)
  on conflict (user_id, day) do nothing;

  if p_kind = 'topic' then
    update public.usage_daily
      set topics_created = topics_created + 1
      where user_id = v_user and day = p_day and topics_created < p_limit;
  else
    update public.usage_daily
      set recordings_started = recordings_started + 1
      where user_id = v_user and day = p_day and recordings_started < p_limit;
  end if;

  get diagnostics v_rows = row_count;
  return v_rows > 0;
end;
$$;

revoke all on function public.claim_daily_quota(text, date, integer) from public;
grant execute on function public.claim_daily_quota(text, date, integer) to authenticated;
