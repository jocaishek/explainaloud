-- Ceilings for the four routes that never had one.
--
-- `analyze`, `transcribe` and `generate` were limited when this table was
-- built, on the reasoning that they are the routes that spend money. Three
-- others do too, and were left open to any signed-in caller in a loop:
--
--   search    /videos runs Tavily searches. Every call is a paid credit, and
--             the route already accepts `?refresh=1` to skip its own cache —
--             which is a loop that bills, by design, with nothing above it.
--   upload    /sources parses a PDF of up to 5 MB per call. No provider bill,
--             but it is the most CPU a single request can ask for, and a
--             serverless function billed by active CPU makes that a bill too.
--   baseline  /speech/baseline transcribes audio on the shared Groq key.
--   billing   /checkout and /portal each call Stripe. Cheap, but they mint
--             sessions against the account and there is no reason for anyone
--             to need dozens a minute.
--
-- Numbers are abuse ceilings, not product limits: far above anything a person
-- reaches by hand, low enough that something running flat out trips in seconds.
-- Admins bypass, as before.

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
    -- A person clicks "find videos" once and waits. Ten a minute is a fast
    -- hand on the refresh button; sixty a day is every topic they own, twice.
    when 'search' then
      v_per_minute := 10;
      v_per_day := 60;
    -- Three files per topic on the free tier, and a slow parse each.
    when 'upload' then
      v_per_minute := 10;
      v_per_day := 100;
    -- The warm-up is recorded once, and re-recorded when somebody is unhappy
    -- with it. Nobody needs it twenty times an hour.
    when 'baseline' then
      v_per_minute := 6;
      v_per_day := 40;
    when 'billing' then
      v_per_minute := 10;
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
