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
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="flex w-full items-center justify-between gap-3 border-b border-border px-3 py-4 sm:px-6 lg:px-8 lg:py-5">
        <div className="flex min-w-0 items-center gap-2 lg:gap-8">
          {/* Set exactly as the masthead on the landing page: same mark,
              same size, same uppercase wordmark at the same width and
              tracking. Signing in should not feel like arriving at a
              different product. */}
          <Link
            href="/home"
            className="press flex shrink-0 items-center gap-2.5 text-strong"
          >
            <ExplainaloudMark className="size-7 shrink-0 text-brand-ink" />
            <span className="font-semibold text-[0.92rem] uppercase tracking-[0.04em] [font-stretch:87%]">
              Explainaloud
            </span>
          </Link>
          <DashboardNav showAdmin={isAdminEmail(user.email)} />
        </div>
        <div className="flex shrink-0 items-center gap-2 lg:gap-4">
          <Button
            asChild
            size="sm"
            className="gap-1.5 bg-brand-deep font-semibold text-white hover:bg-brand"
          >
            <Link href="/new" aria-label="New topic">
              <Plus className="size-4" />
              <span className="hidden sm:inline">New topic</span>
            </Link>
          </Button>
          <span className="hidden text-sm text-subtle sm:inline">
            {profile.first_name} {profile.last_name}
          </span>
          <SignOutButton />
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
