-- Waitlist signups for the TeachItBack landing page.
-- Captures an email and a short answer to "what are you trying to learn?".
-- Public (anon) visitors may insert their own signup but can never read,
-- update, or delete any row — only trusted roles behind the dashboard can.
create table if not exists public.waitlist_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  learning_goal text,
  created_at timestamptz not null default now()
);

alter table public.waitlist_signups enable row level security;

create policy "anon can insert waitlist signups"
  on public.waitlist_signups
  for insert
  to anon
  with check (true);

create policy "authenticated can insert waitlist signups"
  on public.waitlist_signups
  for insert
  to authenticated
  with check (true);
