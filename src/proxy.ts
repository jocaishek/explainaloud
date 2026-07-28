import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { env } from "~/env";

/**
 * Session refresh + route protection.
 *
 * `getUser()` is a network call to Supabase's auth server, so it runs only
 * where it changes the outcome: on protected routes and on `/`, which needs a
 * fresh session cookie so a returning visitor's "Sign up" turns into a
 * working dashboard link. Everything else — API routes that check auth
 * themselves, static assets, prefetches — skips it entirely. Doing this on
 * every matched request was costing a round-trip per navigation.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && isProtected) {
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
