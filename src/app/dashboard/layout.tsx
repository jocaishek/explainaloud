import { Plus } from "lucide-react";
import Link from "next/link";
import { RopesMark } from "~/components/ropes-mark";
import { SignOutButton } from "~/components/sign-out-button";
import { Button } from "~/components/ui/button";
import { UpgradeButton } from "~/components/upgrade-button";
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
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-base font-semibold tracking-tight text-strong"
          >
            <RopesMark className="size-6 shrink-0 text-brand" />
            Ropes
          </Link>
          <DashboardNav showAdmin={isAdminEmail(user.email)} />
        </div>
        <div className="flex shrink-0 items-center gap-2 lg:gap-4">
          {/* Only for people who would gain something. Showing "Upgrade" to a
              subscriber reads as the app not knowing who they are. */}
          {profile.plan === "free" && (
            <UpgradeButton className="hidden sm:inline-flex" />
          )}
          <Button
            asChild
            size="sm"
            className="gap-1.5 rounded-full bg-brand font-semibold text-white transition-transform duration-200 ease-out hover:bg-brand/90 active:scale-[0.97]"
          >
            <Link href="/dashboard/new" aria-label="New topic">
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
