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
    /* The app register, on the landing's ground.
     *
     * The controls stay in the app register — this screen is a card with a
     * form in it, and rendering those against the landing's tokens gives
     * square-cornered shadowless inputs that read as an unstyled fallback. But
     * the *room* they stand in is the landing's: warm stock, a sunset lifting
     * off the corner, the display serif on the heading, a mono kicker above
     * it. The previous version put app controls in an app room and the seam
     * landed here, one screen before the password field — a flat grey page
     * with a plain white box on it, which is every sign-in page ever made.
     *
     * `ground-tint-soft` is the same field the landing's last light section
     * carries, so arriving here reads as the next page of the same document
     * rather than as the site handing you to a different product. */
    <main className="register-app ground ground-tint-soft flex min-h-screen w-full flex-col items-center justify-center px-6 py-16 text-strong">
      <Link
        href="/"
        className="press flex items-center gap-2.5 font-semibold text-[0.92rem] uppercase tracking-[0.04em] text-strong transition-opacity hover:opacity-80"
      >
        <ExplainaloudMark className="size-7 shrink-0 text-brand-ink" />
        Explainaloud
      </Link>

      <div
        data-rise=""
        className="mt-12 flex w-full max-w-md flex-col items-center text-center"
      >
        {/* The mono kicker, the landing's only label voice. It says which of
            the two doors this is, so the serif line underneath can be a
            sentence rather than a form title. */}
        <span className="font-mono text-[0.68rem] uppercase leading-[1.5] tracking-[0.09em] text-subtle">
          {signingUp ? "New account" : "Welcome back"}
        </span>
        {/* Source Serif at display size, weight 400 — the landing's headline
            voice. A bold grotesque here was the single loudest tell that this
            screen belonged to a different product. */}
        <h1 className="mask-line mt-3 text-balance font-display font-normal text-[clamp(1.9rem,5vw,2.6rem)] leading-[1.15] tracking-[-0.015em]">
          <span>
            {signingUp
              ? "Find the gaps you didn't know you had."
              : "Pick up where you left off."}
          </span>
        </h1>
        <p className="mt-4 max-w-[34ch] text-[0.95rem] leading-[1.6] text-subtle">
          {signingUp
            ? "Upload your notes, talk through them for three minutes, and read back what you missed."
            : "Your topics and everything you have explained are where you left them."}
        </p>
      </div>

      <div data-rise="" className="mt-9 w-full max-w-md">
        <AuthCard initialMode={mode} />
      </div>

      <p className="mt-10 font-mono text-[0.68rem] uppercase tracking-[0.09em] text-subtle">
        <Link href="/" className="press transition-colors hover:text-strong">
          ← Back to home
        </Link>
      </p>
    </main>
  );
}
