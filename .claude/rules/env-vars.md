# Environment Variables

Never use `process.env` directly in application code. All environment variables are validated through `src/env.ts` using `@t3-oss/env-nextjs` and Zod. Import and use the `env` object instead:

```ts
import { env } from "~/env";
env.NEXT_PUBLIC_SUPABASE_URL;
```

`process.env` appears in exactly two places, and nowhere else:

1. The `runtimeEnv` block of `src/env.ts` itself.
2. `src/lib/supabase/client.ts`, the browser Supabase client.

## Why the browser client is exempt

Importing `~/env` from a module that runs in the browser pulls Zod and
`@t3-oss/env-nextjs` into the client bundle of every page that touches the
database. That was the largest single chunk in the app, downloaded and parsed
on every visit, to read two strings.

It bought nothing in return. `NEXT_PUBLIC_*` values are inlined as string
literals at build time, so by the time browser code runs they are already
fixed — a schema there can only re-check a constant. The validation that
matters happens at build and boot, where `src/env.ts` still does it: the
server imports it, so a missing or malformed value fails before a browser is
ever served.

**The exemption covers `NEXT_PUBLIC_*` values read in client code, and nothing
else.** A server module reading `process.env` directly is still a bug — those
values are genuinely unknown until runtime, and validating them is the entire
point of `src/env.ts`. Anything secret must never be referenced from client
code at all, however it is read.

When adding a variable, still declare it in `src/env.ts`. That is what keeps
the build honest and `.env.example` meaningful.
