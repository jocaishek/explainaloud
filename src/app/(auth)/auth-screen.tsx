import Link from "next/link";
import { AuthCard, type AuthMode } from "~/components/auth-card";
import { ExplainaloudMark } from "~/components/explainaloud-mark";

/**
 * The shell around the sign-in form: the wordmark, a heading, the card, and a
 * way back to the landing page.
 *
 * Shared by `/login` and `/signup` so the two routes differ only in which form
 * opens first — a visitor who picked "Log in" should not have to notice a
 * toggle to get the form they asked for.
 *
 * The same page, stock and card as the app and as onboarding, on purpose. It
 * used to stand in the landing's navy room with the app's controls nested
 * inside it, which made this one screen a third register — and the two
 * screens after it (onboarding, then home) are light. Somebody signing up
 * should not cross a seam three times in a minute.
 */
export function AuthScreen({ mode }: { mode: AuthMode }) {
  const signingUp = mode === "signup";

  return (
    <main className="flex min-h-svh w-full flex-col items-center bg-background px-6 py-10 text-foreground max-sm:px-4 sm:justify-center sm:py-16">
      <Link
        href="/"
        className="flex items-center gap-2 rounded-control text-foreground transition-opacity duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] hover:opacity-80 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[color:var(--accent-ring)]"
      >
        <ExplainaloudMark disc className="size-5 shrink-0 text-strong" />
        <span className="font-medium text-base tracking-[-0.02em]">
          explainaloud
        </span>
      </Link>

      <div
        data-rise=""
        className="mt-12 flex w-full max-w-md flex-col items-center text-center"
      >
        <h1 className="text-balance font-normal text-[2rem] leading-10 tracking-[-0.02em] max-sm:text-[1.75rem] max-sm:leading-9">
          {signingUp
            ? "Find the gaps you didn't know you had"
            : "Pick up where you left off"}
        </h1>
        <p className="mt-2 max-w-[36ch] text-base text-muted-foreground leading-6">
          {signingUp
            ? "Upload your notes, talk through them for three minutes, and read back what you missed"
            : "Your topics and everything you've explained are where you left them"}
        </p>
      </div>

      <div data-rise="" className="mt-8 w-full max-w-md">
        <AuthCard initialMode={mode} />
      </div>

      <Link
        href="/"
        className="mt-8 rounded-control px-3 py-2 text-muted-foreground text-sm transition-colors duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[color:var(--accent-ring)]"
      >
        Back to home
      </Link>
    </main>
  );
}
