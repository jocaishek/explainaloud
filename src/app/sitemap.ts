import type { MetadataRoute } from "next";
import { siteUrl } from "~/lib/site";

/**
 * Every publicly reachable page — which today is the landing page alone.
 *
 * Deliberately not generated from the route tree: almost every route under
 * `/home` is per-user and sign-in gated, so a crawl of the file system
 * would list URLs that answer with a redirect for everyone who isn't signed in.
 * A short hand-kept list that is true beats a long generated one that isn't.
 *
 * `lastModified` is the build time rather than a stored date. It is honest at
 * the granularity that matters — the page is static, so it can only have
 * changed when the app was last built — and it needs no date literal that would
 * go stale the moment the copy is edited.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    {
      url: `${siteUrl()}/`,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
