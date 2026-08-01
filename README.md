<img src="./docs/logo.svg" alt="" width="88" height="88" align="left" />

# Explainaloud

**Rereading your notes feels like learning. Explaining the topic out loud is where
you find out.**

<br clear="left" />

Upload your material, talk through it for three minutes, and get back your own
words marked sentence by sentence: what you had right, what was vague, and the
steps you skipped without noticing. Nothing is typed and no audio is kept.

[ARCHITECTURE.md](./ARCHITECTURE.md) describes the production data flow and the
features that are actually implemented. This file is how to run it.

## What it does

- **Builds a course from your material.** Drop in PDF, Word, Markdown, HTML,
  CSV, LaTeX, or plain text, up to 5 MB a file. A chain of agents researches,
  drafts, independently audits, and revises
  before you see anything, and every claim is tied to an exact quote from your
  sources.
- **Sources-only mode.** A switch on any topic with uploads: use nothing beyond
  these files. The course is then allowed to come back short, and whatever your
  material does not cover is named rather than quietly supplied from elsewhere.
- **Grades what you actually said.** Your explanation is checked against the
  course's key points, one claim at a time. Half credit for a compound point you
  got half of, because that is not the same as saying nothing.
- **Colours your words as you speak them.** Green for right, red for a missing
  step, grey for anything that makes no checkable claim. You do not have to
  finish and wait for a verdict.
- **Measures pace against your own baseline**, recorded during onboarding, using
  articulation rate rather than gross words per minute, so thinking pauses do not
  count against you.
- **Interview mode.** One question at a time, drawn from a per-course bank, never
  repeating a question you have already been asked, with the next one written out
  of what the last answer missed.
- **Turns the gap report into a plan.** Every topic lands as review, practice, or
  mastered.

## Stack

| | |
|---|---|
| Framework | Next.js (App Router), React 19, TypeScript |
| Styling | Tailwind CSS v4 with OKLCH tokens, shadcn/ui, light and dark |
| Linter and formatter | Biome |
| Data and auth | Supabase Postgres with row-level security |
| AI | Gemini primary, Groq failover, validated local fallbacks for grading |
| Transcription | Groq Whisper |
| Research | Tavily basic search, for direct English videos and reading |

Node.js 22 or newer, and pnpm. `preinstall` refuses npm and yarn.

## Getting started

```bash
pnpm install
cp .env.example .env.local
$EDITOR .env.local
pnpm dev
```

## Environment variables

Everything is declared and validated in [`src/env.ts`](./src/env.ts), which fails
the build rather than the request when something is missing. `.env.example`
carries the full annotated list; these are the ones you cannot run without.

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is accepted too) |
| `GEMINI_API_KEY` | Server-only. Course generation and grading |
| `GROQ_API_KEY` | Server-only. AI failover and audio transcription |
| `TAVILY_API_KEY` | Server-only. Video and reading discovery |

Optional, but each one turns something on:

| Variable | Without it |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Share links and Open Graph images use Vercel's `*.vercel.app` host |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google sign-in falls back to a redirect through Supabase (see below) |
| `SUPABASE_SERVICE_ROLE_KEY` | The Stripe webhook cannot write the `plan` column |
| `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET` | Billing routes stay inert |

Two rules, both enforced by review rather than by tooling:

- **Never read `process.env` directly in application code.** Import `env` from
  `~/env`. The two exceptions are `src/env.ts` itself and the browser Supabase
  client, and the reasoning is in
  [`.claude/rules/env-vars.md`](./.claude/rules/env-vars.md).
- **Never prefix a secret with `NEXT_PUBLIC_`.** It would be inlined into the
  browser bundle at build time.

## Authentication

**Email and password.** Accounts must confirm the emailed link before they can
sign in. Point Supabase's **Confirm signup** template at `/auth/confirm` with a
token hash rather than leaving the default `{{ .ConfirmationURL }}`, or corporate
mail scanners will spend the single-use token before the recipient clicks it.
The exact template, and the rest of the traps, are in
[`.claude/rules/supabase.md`](./.claude/rules/supabase.md).

Before taking public sign-ups, configure a custom SMTP provider. Supabase's
built-in sender is capped at a couple of emails an hour across the whole project,
and past that `signUp` returns success and sends nothing.

**Google.** The button uses Google Identity Services, which runs the handshake on
your own origin and hands back an ID token for `signInWithIdToken`. This is what
keeps `<project-ref>.supabase.co` off Google's consent screen. It needs, in
addition to `NEXT_PUBLIC_GOOGLE_CLIENT_ID`:

- every origin you serve from listed under **Authorized JavaScript origins** in
  the Google Cloud client, including `http://localhost:3000`
- the same client id in Supabase under **Authentication → Providers → Google**
- the Supabase callback still listed under **Authorized redirect URIs**, because
  the redirect flow remains the fallback when the script or the popup is blocked

## Database

Schema changes go through Supabase CLI migrations, never the dashboard. Every
table has row-level security with one policy per operation and per role.

```bash
npx supabase migration new <short_description>
npx supabase db reset          # replay everything locally
npx supabase migration list    # local vs remote
npx supabase db push --dry-run
npx supabase db push
```

Never run `supabase config push`. It writes the local `[auth]` block over the
linked project's Site URL and redirect allow-list, and the symptom is every
sign-in bouncing to the wrong origin.

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Development server |
| `pnpm build` | Production build |
| `pnpm start` | Serve a production build |
| `pnpm format` | Format with Biome |
| `pnpm lint` | Check with Biome |
| `pnpm typecheck` | `tsc --noEmit` |

## Repository conventions

[CLAUDE.md](./CLAUDE.md) indexes the rules in `.claude/rules/`: environment
variables, the stack, styling tokens, and the Supabase migration and auth
workflow. They are worth reading before a first change, because most of them
exist because something broke.
