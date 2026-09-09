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
    /* The landing's room, with the app's controls standing in it.
     *
     * Two classes, and the split is the whole point. `lp-v2` re-points the
     * colour tokens to the landing's navy, so the stock, the ink and the
     * accent are the ones the visitor was just looking at. `register-app`
     * stays on the card itself, because this screen is a form and the
     * landing's register sets `--r-card: 0px` and `--elev-rest: none` — good
     * for a marketing panel, and for an input it produces a square shadowless
     * box that reads as an unstyled fallback.
     *
     * The previous version had it the other way round: app controls in an app
     * room, which put a flat grey page with a plain white box on it exactly
     * one screen before the password field. That is every sign-in page ever
     * made, and it was the loudest seam in the product.
     *
     * The ground is `lp-atmosphere`'s own gradient — the deliberate static
     * frame that block was designed to fall back to. The WebGL water that
     * used to run behind this form is gone: a shader booting, compiling and
     * ping-ponging framebuffers behind a password field bought atmosphere at
     * the cost of the one screen where nothing should move, and on a phone it
     * bought jank. A still gradient in the same palette keeps the room. */
    <main className="lp-v2 lp-atmosphere relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden px-6 py-16 text-primary-foreground">
      {/* A soft vertical scrim so labels clear contrast where the gradient is
          brightest. Far lighter than the one the water needed — the ground no
          longer changes frame to frame. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 z-[1] bg-[linear-gradient(180deg,rgba(4,12,26,0.3),rgba(3,9,20,0.55))]"
      />

      <Link
        href="/"
        className="press relative z-[2] flex items-center gap-2.5 font-semibold text-[0.92rem] text-primary-foreground uppercase tracking-[0.04em] transition-opacity hover:opacity-80"
      >
        <ExplainaloudMark className="size-8 shrink-0" />
        Explainaloud
      </Link>

      <div
        data-rise=""
        className="relative z-[2] mt-12 flex w-full max-w-md flex-col items-center text-center"
      >
        {/* The mono kicker, the landing's only label voice. It says which of
            the two doors this is, so the serif line underneath can be a
            sentence rather than a form title. */}
        <span className="font-mono text-[0.68rem] text-primary-foreground/65 uppercase leading-[1.5] tracking-[0.09em]">
          {signingUp ? "New account" : "Welcome back"}
        </span>
        {/* The landing's headline voice: the display face at its display
            weight and tracking, not the app's heading style. */}
        <h1 className="mask-line mt-3 text-balance font-display text-[clamp(2rem,5vw,2.9rem)] leading-[1.12]">
          <span>
            {signingUp
              ? "Find the gaps you didn't know you had."
              : "Pick up where you left off."}
          </span>
        </h1>
        <p className="mt-4 max-w-[34ch] text-[0.98rem] text-primary-foreground/75 leading-[1.6]">
          {signingUp
            ? "Upload your notes, talk through them for three minutes, and read back what you missed."
            : "Your topics and everything you have explained are where you left them."}
        </p>
      </div>

      {/* `register-app` scoped to the card alone: the controls keep their own
          radii, elevation and density, which is what an input needs, while
          everything around them stays in the landing's world. */}
      <div
        data-rise=""
        className="register-app relative z-[2] mt-9 w-full max-w-md"
      >
        <AuthCard initialMode={mode} />
      </div>

      <p className="relative z-[2] mt-10 font-mono text-[0.68rem] text-primary-foreground/60 uppercase tracking-[0.09em]">
        <Link
          href="/"
          className="press transition-colors hover:text-primary-foreground"
        >
          ← Back to home
        </Link>
      </p>
    </main>
  );
}
