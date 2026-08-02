import Link from "next/link";
import { AuthCard, type AuthMode } from "~/components/auth-card";
import { ExplainaloudMark } from "~/components/explainaloud-mark";

/**
 * The shell around the sign-in form: a way back to the landing page, the
 * wordmark, a heading, and the card itself.
 *
 * Shared by `/login` and `/signup` so the two routes differ only in which form
 * opens first — a visitor who picked "Log in" should not have to notice a
 * toggle to get the form they asked for.
 */
export function AuthScreen({ mode }: { mode: AuthMode }) {
  const signingUp = mode === "signup";

  return (
    /* The app register, not the landing's.
     *
     * Sign-in is the seam between the two worlds, and it belongs on the app
     * side of it: this screen is a card with a form in it, and the landing
     * page has neither cards nor forms — its whole world is flat rules on
     * photocopy stock. Rendering it against the monument's tokens gave a
     * square-cornered, shadowless panel that looked like an unstyled fallback
     * rather than a deliberate flat one.
     *
     * Putting it here also means somebody arriving from the landing page meets
     * the app's look one screen *before* they are asked for a password, so the
     * change of register reads as arriving somewhere rather than as the site
     * breaking on submit. */
    <main className="register-app flex min-h-screen w-full flex-col items-center justify-center px-6 py-16 text-strong">
      <Link
        href="/"
        className="flex items-center gap-2 text-base font-semibold tracking-tight text-strong transition-opacity hover:opacity-80"
      >
        <ExplainaloudMark className="size-6 shrink-0 text-brand-ink" />
        Explainaloud
      </Link>

      <div className="mt-10 flex w-full max-w-md flex-col items-center text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-balance">
          {signingUp ? "Create your account" : "Welcome back"}
        </h1>
        <p className="mt-2 text-sm text-foreground">
          {signingUp
            ? "Explain what you're learning out loud and find the gaps."
            : "Pick up where you left off."}
        </p>
      </div>

      <div className="mt-8 w-full max-w-md">
        <AuthCard initialMode={mode} />
      </div>

      <p className="mt-10 text-sm text-subtle">
        <Link href="/" className="transition-colors hover:text-strong">
          ← Back to home
        </Link>
      </p>
    </main>
  );
}
