"use client";

import { type FormEvent, useEffect, useState } from "react";
import { GoogleSignIn } from "~/components/google-sign-in";
import { PasswordField } from "~/components/password-field";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { emailError } from "~/lib/email";
import { passwordRequirementError } from "~/lib/password";
import { createClient } from "~/lib/supabase/client";
import { newConsent, stashPendingConsent } from "~/lib/terms-consent";

/**
 * Sign up, sign in, and password reset.
 *
 * Lifted out of the landing page so authentication has a URL of its own. As a
 * section at the bottom of a marketing page it could only be reached by
 * scrolling, which meant no way to link someone straight to sign-in, no way to
 * bookmark it, and an expired-session redirect that dropped people at the top
 * of a sales pitch instead of at the form they needed.
 *
 * Every redirect below is still built from `window.location.origin`, so this
 * follows whatever domain it is served from with nothing to update at cutover.
 */
export type AuthMode = "signup" | "login";
type Stage = "form" | "check-email" | "forgot-password" | "reset-sent";

function oauthErrorMessage(): string {
  return "That sign-in method isn't set up yet. Try email instead.";
}

/**
 * Where the emailed confirmation link lands.
 *
 * A confirmation page rather than straight into the app, because this link is
 * frequently opened somewhere other than where the account was created: a
 * phone, a webmail tab in a different browser, a work laptop. Dropping someone
 * into onboarding there is disorienting, and if the session cookie did not
 * survive the hop they get bounced to a login screen with no indication that
 * the thing they clicked actually worked.
 *
 * `/auth/confirmed` says plainly that the address is verified, then offers the
 * way forward, and it can tell "verified and signed in here" apart from
 * "verified, but you will need to log in on this device".
 */
function verificationRedirect(): string {
  return `${window.location.origin}/auth/callback?next=/auth/confirmed`;
}

/**
 * Messages for a failed `/auth/callback`. The origin-mismatch case is worth
 * calling out separately: it is a project configuration problem, not something
 * the visitor can fix by trying again, and the generic "try again" wording
 * sends people into a loop.
 */
const AUTH_CALLBACK_ERRORS: Record<string, string> = {
  origin_mismatch:
    "Sign-in started on a different address than it finished on, so the session couldn't be completed. If you're an admin, add this exact site URL to the Supabase redirect allow-list.",
  exchange_failed:
    "That sign-in link has already been used or has expired. Start again.",
  no_code: "The sign-in link was incomplete. Start again.",
  // Distinct from `exchange_failed` on purpose: this one is frequently not the
  // person's fault at all. Corporate mail scanners follow links before anyone
  // clicks them, and the token is single-use — so the first thing to say is
  // that a fresh link will work, not that they did something wrong.
  link_expired:
    "That confirmation link has expired or was already opened. Send yourself a new one and it will work.",
  default: "We couldn't finish signing you in. Please try again.",
};

function authErrorMessage(mode: AuthMode, message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("email not confirmed")) {
    return "Verify your email before logging in. Check your inbox for the confirmation link.";
  }
  if (
    lower.includes("already registered") ||
    lower.includes("already exists")
  ) {
    return "That email already has an account. Try logging in instead.";
  }
  if (lower.includes("invalid login credentials")) {
    return "Wrong email or password.";
  }
  if (mode === "signup" && lower.includes("password")) {
    return "Password isn't strong enough. Use 8+ characters with a mix of uppercase, lowercase, numbers, and symbols.";
  }
  return "Something went wrong. Try again.";
}

export function AuthCard({
  initialMode = "signup",
}: {
  initialMode?: AuthMode;
}) {
  // Which form opens first. `/login` asks for sign-in, `/signup` for sign-up;
  // the toggle inside still switches between them without changing route.
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [stage, setStage] = useState<Stage>("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | null>(null);
  /**
   * Which Google button is on screen.
   *
   * Starts optimistic and drops to "redirect" the moment `GoogleSignIn` says
   * it cannot run: no client id configured, or a script this network will not
   * load. Sign-in must not depend on a third-party script arriving.
   */
  const [googleMode, setGoogleMode] = useState<"identity" | "redirect">(
    "identity",
  );
  const [resending, setResending] = useState(false);
  /** Login failed because the address was never confirmed. Offer a new link. */
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("authError") === "session-expired") {
      setMode("login");
      setError(
        "That sign-in is no longer valid. Sign in again, or create the account again if it was removed.",
      );
      // Drop the query so a refresh does not replay the error. No hash any
      // more — this is its own page, not a section to scroll to.
      window.history.replaceState({}, "", window.location.pathname);
      return;
    }

    const authError = params.get("auth_error");
    if (authError) {
      setMode("login");
      setError(AUTH_CALLBACK_ERRORS[authError] ?? AUTH_CALLBACK_ERRORS.default);
      // Drop the query so a refresh does not replay the error. No hash any
      // more — this is its own page, not a section to scroll to.
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  function switchMode(next: AuthMode) {
    setMode(next);
    setError(null);
    setNeedsVerification(false);
    setResendStatus(null);
  }

  async function handleOAuth(provider: "google") {
    setError(null);
    setOauthLoading(provider);

    if (mode === "signup") stashPendingConsent(newConsent());

    const supabase = createClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });

    if (oauthError) {
      setError(oauthErrorMessage());
      setOauthLoading(null);
    }
    // On success the browser redirects away, so no further state change here.
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (mode === "signup") {
      // Reject throwaway and undeliverable domains before we ever ask
      // Supabase to create the account.
      const addressError = emailError(email);
      if (addressError) {
        setError(addressError);
        return;
      }
      const requirementError = passwordRequirementError(password);
      if (requirementError) {
        setError(requirementError);
        return;
      }
    }

    setSubmitting(true);

    const supabase = createClient();
    const trimmedEmail = email.trim().toLowerCase();

    if (mode === "signup") {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          emailRedirectTo: verificationRedirect(),
          // Record the agreement on the account itself. A checkbox that gates
          // the button but leaves no trace proves nothing later; this stamps
          // when they accepted and which version they accepted.
          data: newConsent(),
        },
      });

      setSubmitting(false);

      if (signUpError) {
        setError(authErrorMessage(mode, signUpError.message));
        return;
      }

      if (data.session) {
        // New account — collect the profile before the dashboard.
        window.location.assign("/onboarding");
      } else {
        setStage("check-email");
      }
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    });

    if (signInError) {
      setSubmitting(false);
      setError(authErrorMessage(mode, signInError.message));
      // The one failure with an action attached. Everything else is "try
      // again"; this one needs a new email, and there was no way to ask for
      // one without going back through signup — which does not resend for an
      // address that already exists, so it looks like the mail is broken.
      setNeedsVerification(
        signInError.message.toLowerCase().includes("email not confirmed"),
      );
      return;
    }

    // A full navigation guarantees the newly written auth cookies are present
    // before server-side dashboard and onboarding guards run.
    window.location.assign("/home");
  }

  async function handleForgotPassword(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      {
        redirectTo: `${window.location.origin}/auth/callback?next=/auth/update-password`,
      },
    );

    setSubmitting(false);

    if (resetError) {
      setError("Something went wrong. Try again.");
      return;
    }

    setStage("reset-sent");
  }

  async function handleResendVerification() {
    setResending(true);
    setResendStatus(null);

    const supabase = createClient();
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: verificationRedirect(),
      },
    });

    setResending(false);
    if (!resendError) {
      setResendStatus("A new verification link is on its way.");
      return;
    }
    // Say which wall was hit. "Try again later" for a rate limit sends people
    // into a loop of trying again immediately, and the two limits behind this
    // are different problems: one clears in a minute, the other is the
    // project's mail quota and clears when the hour does — or when a real SMTP
    // provider is configured, which is not something the visitor can do.
    const reason = resendError.message.toLowerCase();
    setResendStatus(
      reason.includes("rate limit") || reason.includes("too many")
        ? "Too many emails have gone out recently. Wait a few minutes and try once more. If it keeps failing, the site owner needs to look at the mail settings."
        : "We couldn't send it just now. Wait a minute, then try again.",
    );
  }

  return (
    <div className="flex min-h-24 w-full flex-col items-center justify-start">
      {stage === "forgot-password" && (
        <form
          onSubmit={handleForgotPassword}
          className="glow-ring flex w-full flex-col gap-4 rounded-2xl bg-card p-6"
        >
          <div>
            <h3 className="text-base font-semibold text-strong">
              Reset your password
            </h3>
            <p className="mt-1 text-sm text-subtle">
              We&apos;ll email you a link to set a new password.
            </p>
          </div>
          <Input
            type="email"
            required
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 border-input bg-muted text-base text-strong placeholder:text-subtle"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          {needsVerification && (
            <div className="flex flex-col gap-1.5 rounded-lg border border-border/60 bg-white/[0.03] p-3">
              <p className="text-xs leading-5 text-foreground">
                Didn&apos;t get it, or has the link expired? Signing up again
                won&apos;t send another one. This will.
              </p>
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={resending || !email.trim()}
                className="w-fit text-xs font-semibold text-strong underline underline-offset-2 disabled:opacity-50"
              >
                {resending ? "Sending…" : "Send a new confirmation email"}
              </button>
              {resendStatus && (
                <p className="text-xs text-foreground">{resendStatus}</p>
              )}
            </div>
          )}
          <Button
            type="submit"
            disabled={submitting}
            className="shine h-11 rounded-full bg-brand font-semibold text-white shadow-[0_0_30px_-8px_var(--color-brand)] transition-[transform,box-shadow] duration-200 ease-out hover:bg-brand/90 hover:shadow-[0_0_44px_-8px_var(--color-brand)] active:scale-[0.97]"
          >
            {submitting ? "Sending…" : "Send reset link"}
          </Button>
          <button
            type="button"
            onClick={() => {
              setStage("form");
              setError(null);
            }}
            className="text-center text-xs font-medium text-foreground underline underline-offset-2 hover:text-strong"
          >
            Back to log in
          </button>
        </form>
      )}

      {stage === "reset-sent" && (
        <p className="text-sm text-foreground">
          Check your email for a link to reset your password.
        </p>
      )}

      {stage === "form" && (
        <form
          onSubmit={handleSubmit}
          className="glow-ring flex w-full flex-col gap-4 rounded-2xl bg-card p-6"
        >
          <div className="flex flex-col gap-2">
            {/* Google's own button when Identity Services is available, so
                the handshake happens on this origin and the consent screen
                names this domain rather than a Supabase project ref. The
                styled button below is what everyone else gets. */}
            {googleMode === "identity" ? (
              <GoogleSignIn
                disabled={submitting}
                onUnavailable={() => setGoogleMode("redirect")}
                onError={setError}
                onStart={() => {
                  if (mode === "signup") stashPendingConsent(newConsent());
                  setOauthLoading("google");
                }}
              />
            ) : (
              <Button
                type="button"
                variant="outline"
                disabled={oauthLoading !== null}
                onClick={() => handleOAuth("google")}
                className="h-11 gap-2 rounded-full border-input bg-muted font-medium text-strong transition-transform duration-200 ease-out hover:bg-accent active:scale-[0.98]"
              >
                <GoogleIcon className="size-4" />
                {oauthLoading === "google"
                  ? "Redirecting…"
                  : "Continue with Google"}
              </Button>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-subtle">
            <span className="h-px flex-1 bg-white/10" />
            or continue with email
            <span className="h-px flex-1 bg-white/10" />
          </div>

          <div className="flex flex-col gap-3">
            <Input
              type="email"
              required
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 border-input bg-muted text-base text-strong placeholder:text-subtle"
            />
            <PasswordField
              value={password}
              onChange={setPassword}
              minLength={mode === "signup" ? 8 : undefined}
              autoComplete={
                mode === "signup" ? "new-password" : "current-password"
              }
              showStrength={mode === "signup"}
            />
            {mode === "login" && (
              <button
                type="button"
                onClick={() => {
                  setStage("forgot-password");
                  setError(null);
                }}
                className="self-end text-xs font-medium text-foreground underline underline-offset-2 hover:text-strong"
              >
                Forgot password?
              </button>
            )}
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            type="submit"
            size="default"
            disabled={submitting || oauthLoading !== null}
            className="shine h-11 rounded-full bg-brand font-semibold text-white shadow-[0_0_30px_-8px_var(--color-brand)] transition-[transform,box-shadow] duration-200 ease-out hover:bg-brand/90 hover:shadow-[0_0_44px_-8px_var(--color-brand)] active:scale-[0.97]"
          >
            {submitting
              ? mode === "signup"
                ? "Signing up…"
                : "Logging in…"
              : mode === "signup"
                ? "Sign up"
                : "Log in"}
          </Button>
          {mode === "signup" && <AcceptTerms />}
          <p className="text-center text-xs text-subtle">
            {mode === "signup" ? (
              <>
                Already a member?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("login")}
                  className="font-medium text-foreground underline underline-offset-2 hover:text-strong"
                >
                  Log in
                </button>
              </>
            ) : (
              <>
                New here?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("signup")}
                  className="font-medium text-foreground underline underline-offset-2 hover:text-strong"
                >
                  Sign up
                </button>
              </>
            )}
          </p>
        </form>
      )}

      {stage === "check-email" && (
        <div className="glow-ring flex w-full flex-col gap-5 rounded-2xl bg-card p-6">
          <div>
            <h3 className="text-base font-semibold text-strong">
              Verify your email
            </h3>
            <p className="mt-2 text-sm leading-6 text-foreground">
              We sent a verification link to{" "}
              <span className="font-medium text-strong">
                {email.trim().toLowerCase()}
              </span>
              . Open it to continue to Explainaloud.
            </p>
          </div>

          <p className="text-xs leading-5 text-subtle">
            Didn&apos;t get it? Check spam, or resend the email after a minute.
          </p>

          {resendStatus && (
            <p role="status" className="text-sm text-foreground">
              {resendStatus}
            </p>
          )}

          <Button
            type="button"
            variant="outline"
            disabled={resending}
            onClick={handleResendVerification}
            className="h-11 rounded-full border-input bg-muted font-medium text-strong transition-transform duration-200 ease-out hover:bg-accent active:scale-[0.98]"
          >
            {resending ? "Resending…" : "Resend verification email"}
          </Button>

          <button
            type="button"
            onClick={() => {
              setMode("login");
              setStage("form");
              setResendStatus(null);
            }}
            className="text-center text-xs font-medium text-foreground underline underline-offset-2 hover:text-strong"
          >
            Back to log in
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * The agreement, stated rather than ticked.
 *
 * A checkbox is the right control when acceptance is a separate decision the
 * person could reasonably decline while still doing the thing — it is not one
 * here. Nobody signs up intending to refuse the Terms, so the tick was a step
 * that could only ever be completed, placed between someone and the product,
 * and its most common outcome was an error message telling them to do the one
 * thing they were always going to do.
 *
 * Consent is still recorded on the account exactly as before: `newConsent()`
 * stamps when they accepted and which version, on both the email and Google
 * paths. What changed is what triggers the stamp — pressing "Sign up" under a
 * sentence saying that is what it means, which is how nearly every service
 * does this and is what the sentence is for.
 *
 * Plain anchors with `target="_blank"` rather than `next/link`, so reading the
 * Terms opens a genuine second tab and does not lose a half-filled form.
 */
function AcceptTerms() {
  return (
    <p className="text-center text-xs leading-5 text-subtle">
      By signing up you agree to our{" "}
      <a
        href="/terms"
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-foreground underline underline-offset-2 hover:text-strong"
      >
        Terms of Service
      </a>{" "}
      and{" "}
      <a
        href="/privacy"
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-foreground underline underline-offset-2 hover:text-strong"
      >
        Privacy Policy
      </a>
      .
    </p>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    // biome-ignore lint/a11y/noSvgWithoutTitle: decorative, paired with visible button label
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.87c2.27-2.09 3.55-5.17 3.55-8.66Z"
        fill="#4285F4"
      />
      <path
        d="M12 24c3.24 0 5.95-1.07 7.94-2.9l-3.87-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.1A12 12 0 0 0 12 24Z"
        fill="#34A853"
      />
      <path
        d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58v-3.1H1.27a12 12 0 0 0 0 10.78l4-3.1Z"
        fill="#FBBC05"
      />
      <path
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.94 1.19 15.24 0 12 0A12 12 0 0 0 1.27 6.61l4 3.1C6.22 6.86 8.87 4.75 12 4.75Z"
        fill="#EA4335"
      />
    </svg>
  );
}
