import type { MetadataRoute } from "next";
import { siteUrl } from "~/lib/site";

/**
 * What crawlers may index.
 *
 * The landing page is the only thing worth indexing. Everything else is either
 * behind sign-in or a machine endpoint, and while `src/proxy.ts` already
 * redirects unauthenticated visitors away from the protected routes, a redirect
 * is not a request to stay out — without this a crawler still spends its budget
 * discovering them, and the redirect targets can surface as thin duplicates of
 * the landing page.
 *
 * `/auth/*` is disallowed for a sharper reason: those URLs carry one-time codes
 * in the query string, and an indexed callback URL is a recovery link published
 * to anyone who searches for it.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/auth/", "/dashboard/", "/onboarding/"],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
    host: siteUrl(),
  };
}
