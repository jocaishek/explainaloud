import { type NextRequest, NextResponse } from "next/server";
import { env } from "~/env";
import { createClient } from "~/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin: serverOrigin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");
  // When Next is bound to 0.0.0.0 in development, request.url can contain
  // that bind address even though the browser used localhost. Redirecting to
  // the bind address loses the localhost-scoped PKCE/session cookies.
  const forwardedHost = request.headers
    .get("x-forwarded-host")
    ?.split(",")[0]
    ?.trim();
  const host = forwardedHost ?? request.headers.get("host");
  const forwardedProto = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim();
  const protocol =
    forwardedProto ?? new URL(serverOrigin).protocol.replace(":", "");
  let browserOrigin = host ? `${protocol}://${host}` : serverOrigin;
  const browserUrl = new URL(browserOrigin);
  if (env.NODE_ENV === "development" && browserUrl.hostname === "0.0.0.0") {
    browserUrl.hostname = "localhost";
    browserOrigin = browserUrl.origin;
  }
  // Only ever redirect to a relative, same-app path - never follow an
  // externally supplied `next` value as-is.
  const destination =
    next?.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${browserOrigin}${destination}`);
    }
  }

  return NextResponse.redirect(`${browserOrigin}/?auth_error=1`);
}
