# Database Migrations

All database schema changes must go through Supabase CLI migrations — never modify the database manually.

## Workflow

1. Create a new migration:
   ```bash
   npx supabase migration new <short_description>
   ```
   This creates a timestamped SQL file in `supabase/migrations/`.

2. Write your SQL in the generated file. Follow these rules:
   - Add a header comment explaining the purpose
   - Always enable RLS: `alter table <table> enable row level security;`
   - Write granular RLS policies: one per operation (`select`, `insert`, `update`, `delete`) and per role (`anon`, `authenticated`). Never use `FOR ALL`.
   - Use `if not exists` / `if exists` guards where appropriate
   - Add indexes on columns referenced in RLS policies that are not already primary keys

3. Test locally:
   ```bash
   npx supabase db reset
   ```
   This destroys and recreates the local DB, replaying all migrations from scratch.

4. Check migration status:
   ```bash
   npx supabase migration list
   ```

5. Deploy to remote (after `supabase link`):
   ```bash
   npx supabase db push --dry-run   # preview first
   npx supabase db push             # apply
   ```

## Check it before you open a pull request

```bash
pnpm check:migrations
```

Replays every migration in order and checks that each one only references
functions and columns that exist by the time it runs. It fails on what *your
branch adds* and only mentions already-merged problems in passing, so it is a
gate rather than a backlog.

**This catches what running the migration cannot.** Postgres does not resolve
the identifiers inside a `plpgsql` body until somebody calls the function — so
a migration can apply perfectly, on a fresh database and on production, and
still be broken. That is not a hypothetical:

- `admin_user_overview` was recreated calling `is_ropes_admin()`, which a
  rename had dropped a month earlier. It applied cleanly on both, and then
  returned a 500 on every load of `/admin` until somebody opened the page.
- A squad migration joined `public.profiles p on p.id`, and `profiles` keys on
  `user_id` and has no `id` column at all.

It is a text-level model, not a parser. It will not catch a type error, a bad
plan or a broken policy, and it is not a reason to skip `db reset`. It catches
the class of mistake that survives being run.

**And run the page.** Both of the above would also have been caught by opening
the screen the migration exists for, once, before merging. A migration is not
verified by applying; it is verified by something calling it.

## Rules

- Never reset or revert a migration that has been deployed to production — always roll forward
- Never modify an existing migration file after it has been applied — create a new one instead
- Commit all migration files to version control

## Never run `supabase config push`

`db push` deploys migrations and is the workflow above. `config push` is a
different command: it writes `supabase/config.toml` to the linked project,
including the whole `[auth]` block.

That block describes the **local** stack. Pushing it overwrites production's
Site URL and redirect allow-list with values meant for a developer's machine,
and Supabase falls back to Site URL whenever a requested redirect is not
allow-listed — so the symptom is every sign-in bouncing to the wrong origin
with an unexchanged `?code=`, which `src/proxy.ts` can only partly recover.

Production auth URLs are managed in the Supabase dashboard, under
Authentication → URL Configuration. `config.toml` reads its values from the
environment (see `.env.example`) so no hostname is committed, but that is a
safeguard against the literal, not a licence to push the file.

## The confirmation email template

`/auth/confirm` verifies a token hash on the server. It only receives one if
the project's **Authentication → Email Templates → Confirm signup** template
sends it there:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup&next=/auth/confirmed">
  Confirm your email
</a>
```

The default template uses `{{ .ConfirmationURL }}`, which points at Supabase's
own `/auth/v1/verify` endpoint and then redirects back. Two things break there,
and both look identical to the person holding the link — they land on the
landing page as if they had never clicked anything:

- **Mail scanners.** Corporate filters follow every link in an email before
  the recipient does. The token is single-use, so it is spent by the time it
  is clicked.
- **The fragment.** A project on the implicit flow returns the session in the
  URL hash, which no server route can read.

A token hash has neither problem: it is verified against the cookie store the
request already owns, so the session exists before the page renders.

Do the same for **Reset password** with `type=recovery` and
`next=/auth/update-password`.

## Confirmation emails that never arrive

Supabase's built-in SMTP is a development convenience with a hard, low
send limit — a couple of emails an hour across the entire project, shared by
every user. Past it, `signUp` and `resend` both return success and no mail is
sent. From the outside this is indistinguishable from the feature being
broken, and it gets worse the more people sign up.

A production project needs a custom SMTP provider configured under
**Authentication → Emails → SMTP Settings**. Check there first whenever
"the email won't send" is reported, before looking at any of this code.

Two other things that produce the same report:

- **Signing up again does not resend.** For an address that already exists,
  `signUp` returns an obfuscated success and sends nothing — deliberately, so
  the form cannot be used to discover who has an account. Resending needs
  `supabase.auth.resend({ type: "signup" })`, which is what the "Send a new
  confirmation email" action on a failed login calls.
- **A one-minute per-address cooldown**, separate from the project quota.
