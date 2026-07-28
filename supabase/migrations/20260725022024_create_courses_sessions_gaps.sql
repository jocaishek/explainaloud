-- Dashboard data model: a course (from Topic Input), the recording
-- sessions where a student explains it back, and the gaps flagged during
-- a session. Every row is owned by exactly one auth.uid() and is only ever
-- visible to that user - this is the first per-user RLS pattern in this
-- project (waitlist_signups is anon-insert-only with no ownership column).

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  topic text not null,
  input_notes text,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.course_sessions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  transcript text,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.gaps (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.course_sessions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  phrase text not null,
  category text not null,
  explanation text,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists courses_user_id_idx on public.courses (user_id);
create index if not exists course_sessions_user_id_idx on public.course_sessions (user_id);
create index if not exists course_sessions_course_id_idx on public.course_sessions (course_id);
create index if not exists gaps_user_id_idx on public.gaps (user_id);
create index if not exists gaps_session_id_idx on public.gaps (session_id);

alter table public.courses enable row level security;
alter table public.course_sessions enable row level security;
alter table public.gaps enable row level security;

-- courses: one policy per operation, authenticated owners only
create policy "select own courses"
  on public.courses for select to authenticated
  using (auth.uid() = user_id);

create policy "insert own courses"
  on public.courses for insert to authenticated
  with check (auth.uid() = user_id);

create policy "update own courses"
  on public.courses for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "delete own courses"
  on public.courses for delete to authenticated
  using (auth.uid() = user_id);

-- course_sessions
create policy "select own course_sessions"
  on public.course_sessions for select to authenticated
  using (auth.uid() = user_id);

create policy "insert own course_sessions"
  on public.course_sessions for insert to authenticated
  with check (auth.uid() = user_id);

create policy "update own course_sessions"
  on public.course_sessions for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "delete own course_sessions"
  on public.course_sessions for delete to authenticated
  using (auth.uid() = user_id);

-- gaps
create policy "select own gaps"
  on public.gaps for select to authenticated
  using (auth.uid() = user_id);

create policy "insert own gaps"
  on public.gaps for insert to authenticated
  with check (auth.uid() = user_id);

create policy "update own gaps"
  on public.gaps for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "delete own gaps"
  on public.gaps for delete to authenticated
  using (auth.uid() = user_id);
