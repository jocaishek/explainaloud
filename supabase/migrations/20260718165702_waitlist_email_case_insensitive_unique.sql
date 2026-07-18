-- Enforce case-insensitive uniqueness on waitlist emails.
-- "hello@gmail.com" and "Hello@gmail.com" must be treated as the same
-- signup, otherwise the plain `unique` constraint on email lets
-- duplicates/spam through via casing variations.
create unique index if not exists waitlist_signups_email_lower_idx
  on public.waitlist_signups (lower(email));
