import type { EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "~/lib/supabase/server";

/** The `type` values an emailed link may legitimately carry. */
const OTP_TYPES = new Set<EmailOtpType>([
  "signup",
  "email",
  "email_change",
  "recovery",
  "invite",
  "magiclink",
]);

/**
 * Where an emailed confirmation link lands, when the template sends a token
 * hash rather than a code.
 *
 * Supabase's default confirmation email points at its own `/auth/v1/verify`
 * endpoint, which consumes the token and then redirects here. Two things go
 * wrong with that on the way to a server-rendered app: corporate mail scanners
 * follow links before the person does and spend the single-use token, and a
 * project configured for the implicit flow hands the session back in the URL
 * *fragment*, which no server route can read — so the arrival looks
 * indistinguishable from a stranger visiting the site, which is exactly what
 * "it just brought them back to the start" is.
 *
 * A token hash avoids both. It is verified here, on the server, against the
 * cookie store this request already owns, so the session is written the same
 * way `/auth/callback` writes it and the browser is signed in on arrival.
 *
 * This route only works once the project's "Confirm signup" template is
 * changed to point at it — see the note in `.claude/rules/supabase.md`. Until
 * then it costs nothing and answers nobody.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const rawType = searchParams.get("type");
  const next = searchParams.get("next");

  // Only ever a relative, same-app path — never follow an externally supplied
  // `next` as given.
  const destination =
    next?.startsWith("/") && !next.startsWith("//") ? next : "/auth/confirmed";

  const forwardedHost = request.headers
    .get("x-forwarded-host")
    ?.split(",")[0]
    ?.trim();
  const host = forwardedHost ?? request.headers.get("host");
  const forwardedProto = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim();
  const protocol = forwardedProto ?? new URL(origin).protocol.replace(":", "");
  const browserOrigin = host ? `${protocol}://${host}` : origin;

  const type = rawType as EmailOtpType | null;
  if (!tokenHash || !type || !OTP_TYPES.has(type)) {
    console.error("[auth/confirm] missing or unknown token", {
      hasToken: !!tokenHash,
      type: rawType,
    });
    return NextResponse.redirect(`${browserOrigin}/login?auth_error=no_code`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    type,
    token_hash: tokenHash,
  });

  if (error) {
    // Nearly always an expired or already-spent token: the link has a lifetime,
    // and a mail scanner that followed it first has already used it up.
    console.error("[auth/confirm] verification failed", {
      reason: error.message,
      type,
    });
    return NextResponse.redirect(
      `${browserOrigin}/login?auth_error=link_expired`,
    );
  }

  return NextResponse.redirect(`${browserOrigin}${destination}`);
}
