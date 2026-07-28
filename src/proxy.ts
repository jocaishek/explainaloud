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
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Supabase falls back to the configured Site URL when a requested OAuth
  // callback is missing from the hosted redirect allow-list. Recover that
  // valid PKCE callback here so Google sign-in cannot strand the user on `/`
  // with an unexchanged `?code=...`.
  if (pathname === "/" && request.nextUrl.searchParams.has("code")) {
    const callbackUrl = request.nextUrl.clone();
    callbackUrl.pathname = "/auth/callback";
    return NextResponse.redirect(callbackUrl);
  }

  const isProtected =
    pathname.startsWith("/dashboard") || pathname.startsWith("/onboarding");
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

  return response;
}

export const config = {
  matcher: [
    // Skip static output, image optimisation, metadata files and anything
    // with a file extension — none of it needs a session.
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.[\\w]+$).*)",
  ],
};
