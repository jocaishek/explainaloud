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
  /* Four directives, and deliberately not a script policy.
   *
   * A real `script-src` needs per-request nonces threaded through Next's own
   * inline bootstrap, and the half-written version — `'unsafe-inline'` to make
   * the app work again — is a policy that blocks nothing while looking like it
   * does. That remains a separate piece of work.
   *
   * These four are free. None of them can break a page that was not already
   * doing something it should not, and each closes a real technique:
   *
   *   frame-ancestors  clickjacking. The app takes microphone permission on a
   *                    click, which is exactly what a transparent overlay is
   *                    for.
   *   base-uri         a single injected `<base>` tag silently re-points every
   *                    relative script and form on the page.
   *   form-action      where a form may POST. Without it, an injected form
   *                    posts a session anywhere.
   *   object-src       Flash-era plugin embedding, still a script vector.
   */
  {
    key: "Content-Security-Policy",
    value:
      "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'",
  },
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
      // Renamed to match the tabs inside a topic, which have always been
      // `/{slug}/gaps` and `/{slug}/re-teach`. The old spellings are in
      // browser histories and in at least one first-run tour, so they keep
      // working rather than 404ing somebody mid-session.
      { source: "/gapreport", destination: "/gaps", permanent: true },
      { source: "/reteach", destination: "/re-teach", permanent: true },
    ];
  },
};

export default nextConfig;
