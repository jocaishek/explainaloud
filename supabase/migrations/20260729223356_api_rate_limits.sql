-- Stop one account from spending the whole AI budget.
--
-- The three AI routes -- analyze, transcribe, generate -- called the providers
-- with nothing between a signed-in caller and the key. The daily quota did not
-- help: `claim_daily_quota` is claimed by the browser before recording starts,
-- so anyone willing to skip that call, or to replay a captured request with
-- curl, had unmetered access to Gemini and Groq on the project's key.
--
-- The damage is not only the bill. Both providers rate-limit per key, and every
-- user shares one, so a single caller in a loop exhausts the minute's budget and
-- everybody else's grading fails while it runs.
--
-- Why this is a rate limit and not a quota. The routes are high-frequency by
-- design: live grading calls analyze every 1.2s and caption fallback calls
-- transcribe every 4s, so one ordinary three-minute recording is ~150 analyze
-- calls. Charging a daily-quota unit per request would exhaust a free account in
-- about fifteen seconds of legitimate use. What distinguishes abuse from use
-- here is rate, so rate is what is measured.
create table if not exists public.api_rate_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  -- '<route>:minute' or '<route>:day'.
  bucket text not null,
  -- Start of the window this row counts, truncated to the minute or the day.
  window_start timestamptz not null,
  calls integer not null default 0,
  primary key (user_id, bucket, window_start)
);

-- The prune below filters on these two columns; the primary key leads with
-- user_id but puts window_start third, so it cannot serve that scan well.
create index if not exists api_rate_usage_user_window_idx
  on public.api_rate_usage (user_id, window_start);

alter table public.api_rate_usage enable row level security;

-- Deliberately no policies.
--
-- RLS with an empty policy set denies everything, which is exactly right: this
-- table is bookkeeping for the limiter and nothing else. It is written only by
-- the security-definer function below, which runs as the owner and is not
-- subject to RLS. A user reading their own counters would gain nothing, and a
-- user writing them would defeat the entire mechanism.
--
-- Supabase grants table privileges to anon and authenticated by default, so
-- those are withdrawn explicitly rather than left to RLS alone. Two locks.
revoke all on table public.api_rate_usage from anon;
revoke all on table public.api_rate_usage from authenticated;

-- Claims one call against a route's rate limits. False when either the
-- per-minute or the per-day ceiling is already reached.
--
-- Limits live in here rather than being passed in. The function is callable by
-- any authenticated session, so a limit supplied by the caller would be a limit
-- chosen by the caller. The server is the only authority on its own ceilings.
--
-- Check and increment are one statement per window, for the same reason
-- `claim_daily_quota` is: a read-then-write lets two concurrent requests both
-- observe the last free slot and both take it.
create or replace function public.claim_api_call(p_bucket text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_per_minute integer;
  v_per_day integer;
  v_rows integer;
  v_minute timestamptz := date_trunc('minute', now());
  v_day timestamptz := date_trunc('day', now());
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  -- Ceilings sit well above real use, because the failure mode of a limit that
  -- is too tight is a student mid-explanation watching the colour stop. A
  -- three-minute recording is ~150 analyze calls over three minutes, so a
  -- legitimate peak is ~50/minute; 90 leaves generous headroom while a tight
  -- loop still trips it within seconds. The daily figure is roughly twenty
  -- recordings' worth -- more than anyone studies in a day, and reached in
  -- about half an hour by something running flat out.
  case p_bucket
    when 'analyze' then
      v_per_minute := 90;
      v_per_day := 3000;
    when 'transcribe' then
      v_per_minute := 40;
      v_per_day := 900;
    when 'generate' then
      v_per_minute := 6;
      v_per_day := 60;
    else
      raise exception 'unknown rate bucket: %', p_bucket;
  end case;

  if public.is_explainaloud_admin() then
    return true;
  end if;

  -- Minute rows are only interesting for a minute, but there are up to 1440 of
  -- them per user per day. Pruning on a fraction of calls keeps the table from
  -- growing without adding a write to every single request.
  if random() < 0.01 then
    delete from public.api_rate_usage
      where user_id = v_user
        and window_start < now() - interval '1 day';
  end if;

  -- Day first: it is the coarser ceiling, so failing it early avoids consuming
  -- a minute slot for a call that was never going to be allowed.
  insert into public.api_rate_usage as usage (user_id, bucket, window_start, calls)
  values (v_user, p_bucket || ':day', v_day, 1)
  on conflict (user_id, bucket, window_start)
  do update set calls = usage.calls + 1
    where usage.calls < v_per_day;
  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    return false;
  end if;

  insert into public.api_rate_usage as usage (user_id, bucket, window_start, calls)
  values (v_user, p_bucket || ':minute', v_minute, 1)
  on conflict (user_id, bucket, window_start)
  do update set calls = usage.calls + 1
    where usage.calls < v_per_minute;
  get diagnostics v_rows = row_count;
  return v_rows > 0;
end;
$$;

revoke all on function public.claim_api_call(text) from public;
revoke all on function public.claim_api_call(text) from anon;
grant execute on function public.claim_api_call(text) to authenticated;
