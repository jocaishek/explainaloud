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
    <main className="flex min-h-screen w-full flex-col items-center justify-center bg-[#0b0f14] px-6 py-16 text-white">
      <Link
        href="/"
        className="flex items-center gap-2 text-base font-semibold tracking-tight text-white transition-opacity hover:opacity-80"
      >
        <ExplainaloudMark className="size-6 shrink-0 text-brand" />
        Explainaloud
      </Link>

      <div className="mt-10 flex w-full max-w-md flex-col items-center text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-balance">
          {signingUp ? "Create your account" : "Welcome back"}
        </h1>
        <p className="mt-2 text-sm text-[#A1A1AA]">
          {signingUp
            ? "Explain what you're learning out loud and find the gaps."
            : "Pick up where you left off."}
        </p>
      </div>

      <div className="mt-8 w-full max-w-md">
        <AuthCard initialMode={mode} />
      </div>

      <p className="mt-10 text-sm text-[#71717A]">
        <Link href="/" className="transition-colors hover:text-white">
          ← Back to home
        </Link>
      </p>
    </main>
  );
}
