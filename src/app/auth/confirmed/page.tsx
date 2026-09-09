import { CheckCircle2 } from "lucide-react";
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
    /* The auth screens' room. This page was a hardcoded near-black one-off —
       neither the landing's navy nor the app's stock — so the click out of the
       confirmation email landed somewhere that looked like a third product.
       The content block below carries `register-app` for the same reason the
       auth card does: the accent tokens the button reads take their
       lit-on-navy polarity from the `.lp-v2 .register-app` override, which is
       a descendant selector. */
    <main className="lp-v2 lp-atmosphere flex min-h-screen w-full flex-col items-center justify-center px-6 py-16 text-white">
      <Link
        href="/"
        className="flex items-center gap-2 text-base font-semibold tracking-tight text-white transition-opacity hover:opacity-80"
      >
        <ExplainaloudMark className="size-6 shrink-0 text-brand-ink" />
        Explainaloud
      </Link>

      <div className="register-app mt-10 flex w-full max-w-md flex-col items-center bg-transparent text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-brand/10">
          <CheckCircle2 className="size-7 text-brand-ink" aria-hidden />
        </span>

        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-balance">
          Your email is confirmed
        </h1>

        <p className="mt-3 text-sm leading-6 text-[#A1A1AA]">
          {signedIn
            ? user?.email
              ? `${user.email} is verified and you're signed in on this device.`
              : "Your address is verified and you're signed in on this device."
            : "Your address is verified. Log in to pick up where you left off, or open this link again in the browser you signed up with."}
        </p>

        <Link
          href={destination}
          className="press mt-8 inline-flex h-11 items-center justify-center rounded-full bg-accent-solid px-7 font-semibold text-accent-contrast transition-colors duration-200 hover:bg-accent-solid-hover"
        >
          {signedIn ? "Continue to Explainaloud" : "Log in"}
        </Link>
      </div>

      <p className="mt-10 text-sm text-[#71717A]">
        <Link href="/" className="transition-colors hover:text-white">
          Back to home
        </Link>
      </p>
    </main>
  );
}
