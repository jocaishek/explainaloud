import { Plus } from "lucide-react";
import Link from "next/link";
import { ExplainaloudMark } from "~/components/explainaloud-mark";
import { SignOutButton } from "~/components/sign-out-button";
import { Button } from "~/components/ui/button";
import { isAdminEmail } from "~/lib/admin";
import { requireProfile } from "~/lib/supabase/server";
import { DashboardNav } from "./dashboard-nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Redirects to /onboarding when the account has no profile yet.
  const { profile, user } = await requireProfile();

  return (
    /* `register-app` is the switch. Everything below this div reads the app's
       canvas, ink, accent, radii and elevation; everything outside it — the
       landing page, the auth screens — keeps the serif world. See the block of
       the same name in `globals.css` for why it is a class on the shell rather
       than a second `:root`. */
    <div className="register-app flex min-h-screen flex-col">
      {/* Sticky, because the primary action and the way back to the topic list
          should not depend on where somebody has scrolled to in a long gap
          report. Hairline underneath rather than a shadow: the bar is part of
          the page's structure, not floating over it. */}
      <header className="sticky top-0 z-40 border-border border-b bg-background/90 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-[var(--measure)] items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3 lg:gap-8">
            {/* Same mark and same wordmark as the landing masthead. The
                register changes across the sign-in on purpose; the identity
                does not. */}
            <Link
              href="/home"
              className="press flex shrink-0 items-center gap-2.5 text-strong"
            >
              <ExplainaloudMark className="size-7 shrink-0 text-[color:var(--accent-solid)]" />
              <span className="font-semibold text-[0.92rem] uppercase tracking-[0.04em]">
                Explainaloud
              </span>
            </Link>
            <DashboardNav showAdmin={isAdminEmail(user.email)} />
          </div>
          <div className="flex shrink-0 items-center gap-2 lg:gap-3">
            <Button asChild size="sm" className="gap-1.5 font-semibold">
              <Link href="/new" aria-label="New topic">
                <Plus className="size-4" />
                <span className="hidden sm:inline">New topic</span>
              </Link>
            </Button>
            <span className="hidden text-subtle text-sm sm:inline">
              {profile.first_name} {profile.last_name}
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
