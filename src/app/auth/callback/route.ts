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
  const explicitNext =
    next?.startsWith("/") && !next.startsWith("//") ? next : null;

  if (!code) {
    console.error("[auth/callback] no code in query", {
      host,
      url: request.url,
    });
    return NextResponse.redirect(`${browserOrigin}/?auth_error=no_code`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (!error) {
    // Where to land. An explicit `next` wins — email verification and password
    // reset both name their destination. Otherwise decide from the account
    // itself rather than defaulting to /dashboard.
    //
    // Google sign-in sends no `next`, so a first-time Google account used to be
    // dropped at /dashboard, whose profile guard bounced it to /onboarding —
    // and any hiccup in that bounce left the person on the landing page having
    // to click "log in" again despite already having a session. Asking for the
    // profile here settles it in one hop: no row means onboarding is unfinished.
    let destination = explicitNext;
    if (!destination) {
      const userId = data.session?.user.id;
      if (userId) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("user_id", userId)
          .maybeSingle<{ user_id: string }>();
        destination = profile ? "/dashboard" : "/onboarding";
      } else {
        destination = "/dashboard";
      }
    }
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
