# Ropes

Ropes turns a topic and optional source material into a focused course, then
grades a spoken teach-back against every course key point. See
[ARCHITECTURE.md](./ARCHITECTURE.md) for the production data flow and the
features that are actually implemented.

## Stack

- **Framework**: Next.js (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **Linter/Formatter**: Biome
- **Data and auth**: Supabase
- **AI**: Gemini with Groq failover; local validated fallbacks for grading
- **Research**: Tavily basic search, restricted to direct YouTube video pages

## Getting Started

```bash
# Node.js 22 or newer is required.

# Install dependencies
pnpm install

# Fill in your env vars
$EDITOR .env.local

# Start the dev server
pnpm dev
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon/public key |
| `GEMINI_API_KEY` | Server-only course generation and grading provider |
| `GROQ_API_KEY` | Server-only AI failover and audio transcription |
| `TAVILY_API_KEY` | Server-only basic search for direct course videos |

Fill in your values in `.env.local` for development and in the Vercel project
settings for Preview and Production. Never prefix server-only keys with
`NEXT_PUBLIC_`.

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm format` | Format code with Biome |
| `pnpm lint` | Lint code with Biome |
| `pnpm typecheck` | Run TypeScript type checking |

## Optional: Doppler for Secrets Management

For team environments, consider using [Doppler](https://www.doppler.com/) to manage env vars:

```bash
# Install Doppler CLI, then:
doppler setup
doppler run -- pnpm dev
```
