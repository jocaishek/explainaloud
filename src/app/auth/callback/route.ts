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

  if (!code) {
    console.error("[auth/callback] no code in query", {
      host,
      url: request.url,
    });
    return NextResponse.redirect(`${browserOrigin}/?auth_error=no_code`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (!error) {
    return NextResponse.redirect(`${browserOrigin}${destination}`);
  }

  // The exchange needs the PKCE code verifier that was written as a cookie when
  // sign-in started. If the flow began on one hostname and Supabase sent the
  // callback to another — which it does whenever the requested redirect is
  // missing from the project's allow-list and it falls back to the Site URL —
  // that cookie isn't readable here and the exchange fails. Distinguish that
  // from a genuinely bad or reused code so the log names a cause.
  const verifierMissing = /code verifier|code_verifier|pkce/i.test(
    error.message,
  );
  console.error("[auth/callback] code exchange failed", {
    reason: error.message,
    host,
    verifierMissing,
  });

  return NextResponse.redirect(
    `${browserOrigin}/?auth_error=${verifierMissing ? "origin_mismatch" : "exchange_failed"}`,
  );
}
