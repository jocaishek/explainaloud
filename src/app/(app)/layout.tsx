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
      {/* Opaque, and no blur.
       *
       * This was `bg-background/90 backdrop-blur-sm`, which is the most
       * expensive thing that can be put on a sticky element: a bar pinned to
       * the top of a scrolling page has to re-snapshot and re-blur the strip
       * behind it on every single frame of every scroll, across the full
       * width of the window.
       *
       * What that bought was ten per cent of the page showing through, then
       * blurred. At that transmission the blur is very nearly invisible, and
       * the ninety per cent that was already opaque is doing all the work of
       * making the bar read as a surface. Going fully opaque loses a hairline
       * of translucency nobody could describe and removes a full-width
       * compositor pass per frame. */}
      <header className="sticky top-0 z-40 border-border border-b bg-background">
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
              {/* The wordmark costs 125px of a 375px screen, and it was the
                  reason the bar broke: mark, wordmark and the page menu came
                  to 254px inside a 210px box, so the menu overflowed its own
                  group and the New topic button was drawn on top of it.
                  The mark stays at every width — it is the identity, and it
                  is legible at 28px in a way the tracked wordmark is not
                  worth 125px to repeat. */}
              <span className="hidden font-semibold text-[0.92rem] uppercase tracking-[0.04em] sm:inline">
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
