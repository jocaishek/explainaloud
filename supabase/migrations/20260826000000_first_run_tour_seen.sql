-- Remember on the account that the first-run tour has been shown.
--
-- It was kept in `localStorage` under `explainaloud:tour:v1`, and the comment
-- in `first-run.tsx` argued that a repeat showing is a mild annoyance not
-- worth a column. That reasoning holds on a desktop browser and fails on a
-- phone, which is where it was actually reported: the tour came back on
-- every sign-in.
--
-- Two mobile-specific reasons, neither of which is a bug in the tour:
--
--   * **An emailed link opens in an in-app webview.** Tapping a confirmation
--     or magic link from Mail, Gmail or Messages hands the page to that app's
--     embedded browser, which has its own storage partition and often throws
--     it away when the sheet closes. Every sign-in that starts in an inbox is
--     a fresh `localStorage` — so the tour is not repeating, it is being shown
--     for the first time, again, to a browser that has never seen it.
--
--   * **Safari evicts script-written storage after seven days** of no
--     interaction with the site as a first-party. An app somebody opens
--     before an exam and then not again for a fortnight loses the key.
--
-- Neither is fixable from the client, because in both cases the client
-- genuinely has no memory. The account does.
--
-- A timestamp rather than a boolean: it costs the same to store and it says
-- when, which is the question anybody debugging this will actually have. Null
-- means "not yet shown", which is the state a new row starts in.

alter table public.profiles
  add column if not exists tour_seen_at timestamptz;

-- Existing accounts have all had the chance to see it, and most dismissed it
-- long ago in a `localStorage` this migration cannot read. Backfilling stops
-- the fix from causing exactly the thing it fixes: a wave of tours shown to
-- established users the first time they open the app after this deploys.
update public.profiles
  set tour_seen_at = now()
  where tour_seen_at is null;

-- `20260728222940_plans_and_billing` revoked table-wide UPDATE on profiles and
-- handed back a named column list, so a column added later is writable by
-- nobody until it is named here. `20260824000000` had to repair three columns
-- that missed this and its comment asks the next person not to repeat it.
grant update (tour_seen_at)
  on public.profiles to authenticated;
