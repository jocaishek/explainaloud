import { createBrowserClient } from "@supabase/ssr";

/**
 * The browser's Supabase client.
 *
 * This is the one file that reads `process.env` outside `src/env.ts`, and the
 * reason is weight rather than convenience.
 *
 * `~/env` validates through Zod at import time. That is exactly right on the
 * server, where the cost is paid once at boot and a missing variable should
 * stop the process. But this module runs in the browser, and importing it here
 * dragged Zod and `@t3-oss/env-nextjs` into the client bundle of every page
 * that touches the database — the largest single chunk in the app, to read two
 * strings.
 *
 * Validating them here would buy nothing anyway. `NEXT_PUBLIC_*` values are
 * inlined as string literals at build time, so by the time this runs they are
 * already fixed and a schema could only re-check a constant. The build is
 * where that check belongs, and `src/env.ts` still performs it — the server
 * code imports it and boots first, so a missing or malformed value fails
 * before any browser is served.
 *
 * Both names are written out in full rather than composed, because Next only
 * inlines `process.env.NEXT_PUBLIC_X` where it appears literally in the
 * source. A computed lookup would be `undefined` at runtime.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
  );
}
