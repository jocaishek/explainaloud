import type { NextConfig } from "next";

/**
 * Response headers for every route.
 *
 * Worth setting deliberately now that the app answers on a domain of its own:
 * a custom hostname is the thing an attacker frames, sniffs, or leaks a
 * referrer to, and none of these are on by default.
 *
 * The microphone allowance is the one that must not be tightened. Permissions
 * Policy defaults to `self` when the header is absent, but naming it here means
 * dropping `microphone` from the list would silently kill recording — the whole
 * product — with a console warning as the only clue.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  // frame-ancestors only. A full script/style policy is a separate piece of
  // work — Next inlines its own bootstrap, and a half-written CSP that has to
  // be loosened with 'unsafe-inline' buys nothing.
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  {
    key: "Permissions-Policy",
    value: "microphone=(self), camera=(), geolocation=(), payment=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  // The dev-only overlay badge sits bottom-left, right on top of the landing
  // page's footer wordmark. It never ships in a production build; this just
  // keeps it out of the way while working on the design.
  devIndicators: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  /**
   * The old `/dashboard/*` addresses.
   *
   * Permanent, because they are gone for good — but note the course rule keeps
   * the id in place of the slug. `courseIdForSlug` accepts either, so an old
   * bookmark lands on the right course and the address bar tidies itself up
   * the next time the student clicks a link.
   */
  async redirects() {
    return [
      { source: "/dashboard", destination: "/home", permanent: true },
      {
        source: "/dashboard/courses/:id",
        destination: "/home/:id",
        permanent: true,
      },
      {
        source: "/dashboard/courses/:id/:rest*",
        destination: "/home/:id/:rest*",
        permanent: true,
      },
      {
        source: "/dashboard/:path*",
        destination: "/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
