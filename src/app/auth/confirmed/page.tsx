import { Check } from "lucide-react";
import Link from "next/link";
import { ExplainaloudMark } from "~/components/explainaloud-mark";
import { createClient } from "~/lib/supabase/server";

export const metadata = { title: "Email confirmed · Explainaloud" };

/**
 * The page an emailed confirmation link arrives at.
 *
 * Two states, and the second one is the reason this page exists at all.
 *
 * Signed in: the code exchange in `/auth/callback` worked and the session
 * cookie belongs to this browser, so the only thing left is to say so and point
 * onward. Where onward is depends on whether onboarding has been done, which is
 * why the profile is read here rather than sending everyone to `/home` and
 * letting its guard bounce the new accounts back out again.
 *
 * Not signed in: the address is still confirmed, because the exchange had to
 * succeed for this page to be reached. What failed is the session sticking to
 * *this* browser, which happens whenever the link is opened somewhere other
 * than where the account was created. Saying "confirmed, now log in" is the
 * whole point; the previous behaviour redirected into the app and produced an
 * unexplained login screen, which reads as the confirmation having failed.
 */
export default async function EmailConfirmedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let destination = "/login";
  let signedIn = false;

  if (user) {
    signedIn = true;
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle<{ user_id: string }>();
    destination = profile ? "/home" : "/onboarding";
  }

  return (
    /* The auth screens' room: the same light page and card as sign-in and
       onboarding, so the click out of the confirmation email lands in the
       product it is confirming rather than somewhere that looks like a
       third one. */
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

      <div className="mt-12 flex w-full max-w-md flex-col items-center rounded-card border border-border bg-card p-8 text-center shadow-rest max-sm:p-6">
        <span className="flex size-12 items-center justify-center rounded-full bg-muted">
          <Check className="size-6 text-foreground" aria-hidden />
        </span>

        <h1 className="mt-6 text-balance font-normal text-[2rem] leading-10 tracking-[-0.02em] max-sm:text-[1.75rem] max-sm:leading-9">
          Your email is confirmed
        </h1>

        <p className="mt-2 text-base text-muted-foreground leading-6">
          {signedIn
            ? user?.email
              ? `${user.email} is verified and you're signed in on this device.`
              : "Your address is verified and you're signed in on this device."
            : "Your address is verified. Log in to pick up where you left off, or open this link again in the browser you signed up with."}
        </p>

        <Link
          href={destination}
          className="mt-8 inline-flex h-12 w-full items-center justify-center rounded-control bg-accent-solid px-6 font-medium text-accent-contrast text-base shadow-rest transition-[background-color,transform] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-accent-solid-hover focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[color:var(--accent-ring)] active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100"
        >
          {signedIn ? "Continue to Explainaloud" : "Log in"}
        </Link>
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
