import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { env } from "~/env";

/**
 * Session refresh + route protection.
 *
 * `getClaims()` verifies the signed access token and refreshes it when needed.
 * With asymmetric signing keys, verification is local after the project's
 * public key is cached, avoiding an Auth-server round trip on every tab click.
 * Everything else — API routes that check auth themselves, static assets and
 * prefetches — skips this middleware work entirely.
 */
/**
 * The one hostname the live site answers on.
 *
 * A Vercel production deployment is reachable at three or four addresses — the
 * custom domain, `<project>.vercel.app`, and a per-deployment hash URL — and
 * whichever one you arrive at is the one you stay on, because every link in
 * the app is relative and sign-in builds its redirect from
 * `window.location.origin`. Follow a stale link or an old bookmark once and the
 * whole session, address bar included, is a deployment URL.
 *
 * Only production is pinned. Preview deployments are supposed to live on their
 * own hostname; sending them here would make reviewing a pull request
 * impossible.
 */
function canonicalHost(): string | null {
  if (env.VERCEL_ENV !== "production" || !env.NEXT_PUBLIC_SITE_URL) {
    return null;
  }
  try {
    return new URL(env.NEXT_PUBLIC_SITE_URL).host;
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Before anything session-shaped happens, so sign-in starts on the real
  // domain and the PKCE cookie is written where the callback will read it.
  const canonical = canonicalHost();
  if (canonical && request.nextUrl.host !== canonical) {
    const url = request.nextUrl.clone();
    url.host = canonical;
    url.protocol = "https:";
    url.port = "";
    return NextResponse.redirect(url, 308);
  }

  // Supabase falls back to the configured Site URL whenever a requested
  // redirect is missing from the hosted allow-list, so a link that should have
  // opened the callback opens the landing page instead — with the credential
  // still sitting unread in the query string. To the person holding the link
  // this is "it just took me back to the start of the website".
  //
  // Recovered from any path rather than only from `/`, because Site URL is
  // whatever the project has configured and need not be the root.
  if (!pathname.startsWith("/auth/")) {
    const params = request.nextUrl.searchParams;
    if (params.has("code")) {
      const callbackUrl = request.nextUrl.clone();
      callbackUrl.pathname = "/auth/callback";
      return NextResponse.redirect(callbackUrl);
    }
    if (params.has("token_hash") && params.has("type")) {
      const confirmUrl = request.nextUrl.clone();
      confirmUrl.pathname = "/auth/confirm";
      return NextResponse.redirect(confirmUrl);
    }
  }

  // Everything behind sign-in. `requireUser` redirects too, but doing it here
  // means an unauthenticated request never renders a page to throw it away.
  const isProtected = [
    "/home",
    "/onboarding",
    "/record",
    "/gaps",
    "/re-teach",
    "/settings",
    "/new",
    "/admin",
  ].some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  const needsSession = isProtected || pathname === "/";

  if (!needsSession) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  const authenticated = typeof data?.claims.sub === "string";

  if (!authenticated && isProtected) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // A signed-in visitor asking for the landing page is asking for the app.
  //
  // The root is a sales pitch, and someone who already has a session reads
  // arriving there as having been logged out — so they sign in again, which is
  // the "why do I keep having to sign in" this fixes.
  if (authenticated && pathname === "/") {
    return NextResponse.redirect(new URL("/home", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    // Skip static output, image optimisation, metadata files and anything
    // with a file extension — none of it needs a session.
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.[\\w]+$).*)",
  ],
};
