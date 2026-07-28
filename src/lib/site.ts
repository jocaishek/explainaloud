// `VERCEL_PROJECT_PRODUCTION_URL` is server-scoped in `src/env.ts`, so reading
// it from a client component would throw at runtime. Fail at the import instead.
import "server-only";

import { env } from "~/env";

/**
 * Where this deployment answers, with protocol and no trailing slash.
 *
 * No hostname is written down anywhere in the repo: the domain is a property of
 * the deployment, not of the code, so moving it is an environment change and a
 * redeploy rather than an edit. Three callers need it to agree — Open Graph
 * URLs, `robots.txt`, and `sitemap.xml` — and a sitemap that disagrees with the
 * canonical host is worse than no sitemap, so the precedence lives here once.
 *
 * `NEXT_PUBLIC_SITE_URL` wins because once a custom domain is attached it is the
 * only hostname anyone sees. Vercel's own production URL is the fallback for
 * preview and pre-domain deploys, and the dev server's address locally.
 *
 * Note this is inlined at build time, not read per request: `NEXT_PUBLIC_*`
 * values are baked into the bundle, so changing it needs a redeploy to take.
 */
export function siteUrl(): string {
  const configured =
    env.NEXT_PUBLIC_SITE_URL ??
    (env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000");

  return configured.replace(/\/+$/, "");
}
