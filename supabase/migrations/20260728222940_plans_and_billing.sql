-- Free and Pro plans.
--
-- Pro is $9.99/month for longer recordings, more topics per day, and no daily
-- recording cap. The limits themselves stay in `claim_daily_quota` below, where
-- the client cannot reach them.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'plan_tier') then
    create type public.plan_tier as enum ('free', 'pro');
  end if;
end
$$;

alter table public.profiles
  add column if not exists plan public.plan_tier not null default 'free',
  -- Stripe's identifiers for this account. Kept so the webhook can find the
  -- right profile from a Stripe event, and so the billing portal can be opened
  -- without asking Stripe to search by email.
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  -- When the current paid period ends. A cancelled subscription keeps Pro
  -- until this passes, which is what the customer paid for.
  add column if not exists plan_renews_at timestamptz;

-- The webhook looks profiles up by Stripe id on every event.
create unique index if not exists profiles_stripe_customer_id_key
  on public.profiles (stripe_customer_id)
  where stripe_customer_id is not null;

-- ---------------------------------------------------------------------------
-- Make the paywall real.
-- ---------------------------------------------------------------------------
--
-- `profiles_update_authenticated` lets a signed-in user update their own row,
-- and row-level security has no notion of columns — so with `plan` simply added
-- to this table, anyone could open the console and run
--
--   supabase.from('profiles').update({ plan: 'pro' })
--
-- against their own row with the public anon key, and be Pro for free.
--
-- Column privileges are the mechanism that does understand columns. A
-- table-wide UPDATE grant would override a per-column revoke, so the grant has
-- to be withdrawn first and handed back one column at a time. These five are
-- exactly what onboarding and the settings form write; `plan`, the Stripe ids
-- and the renewal date are writable only by the service role, which is to say
-- only by the Stripe webhook.
revoke update on public.profiles from authenticated;
revoke update on public.profiles from anon;

grant update (first_name, last_name, date_of_birth, use_type, updated_at)
  on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Plan-aware daily quota.
-- ---------------------------------------------------------------------------
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
  v_plan public.plan_tier;
  v_limit integer;
  v_rows integer := 0;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  -- `p_limit` is accepted for compatibility with deployed clients and then
  -- ignored. The previous version required it to equal the server's own
  -- number, which was a way to catch drift — but with two plans the correct
  -- value now depends on the caller's subscription, so a client that guessed
  -- wrong would raise instead of being told it was out of quota. The database
  -- knows the plan; it does not need to be told the limit.
  perform p_limit;

  if public.is_ropes_admin() then
    return true;
  end if;

  select coalesce(profiles.plan, 'free')
    into v_plan
    from public.profiles
    where profiles.user_id = v_user;
  v_plan := coalesce(v_plan, 'free');

  insert into public.usage_daily (user_id, day)
  values (v_user, p_day)
  on conflict (user_id, day) do nothing;

  if p_kind = 'topic' then
    v_limit := case v_plan when 'pro' then 10 else 2 end;
    update public.usage_daily
      set topics_created = topics_created + 1
      where user_id = v_user and day = p_day and topics_created < v_limit;
  elsif p_kind = 'recording' then
    if v_plan = 'pro' then
      -- Unlimited, but still counted: the number is what the dashboard shows
      -- back to the user, and what makes abuse visible later.
      update public.usage_daily
        set recordings_started = recordings_started + 1
        where user_id = v_user and day = p_day;
      return true;
    end if;
    v_limit := 5;
    update public.usage_daily
      set recordings_started = recordings_started + 1
      where user_id = v_user and day = p_day and recordings_started < v_limit;
  else
    raise exception 'unknown quota kind: %', p_kind;
  end if;

  get diagnostics v_rows = row_count;
  return v_rows > 0;
end;
$$;

revoke all on function public.claim_daily_quota(text, date, integer) from public;
revoke all on function public.claim_daily_quota(text, date, integer) from anon;
grant execute on function public.claim_daily_quota(text, date, integer)
  to authenticated;
