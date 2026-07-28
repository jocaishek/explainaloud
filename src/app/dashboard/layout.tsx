import { Plus } from "lucide-react";
import Link from "next/link";
import { SignOutButton } from "~/components/sign-out-button";
import { Button } from "~/components/ui/button";
import { requireProfile } from "~/lib/supabase/server";
import { DashboardNav } from "./dashboard-nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Redirects to /onboarding when the account has no profile yet.
  const { profile } = await requireProfile();

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="flex w-full items-center justify-between border-b border-border px-8 py-5">
        <div className="flex items-center gap-8">
          <Link
            href="/dashboard"
            className="text-base font-semibold tracking-tight text-strong"
          >
            TeachItBack
          </Link>
          <DashboardNav />
        </div>
        <div className="flex items-center gap-4">
          <Button
            asChild
            size="sm"
            className="gap-1.5 rounded-full bg-brand font-semibold text-white transition-transform duration-200 ease-out hover:bg-brand/90 active:scale-[0.97]"
          >
            <Link href="/dashboard/new">
              <Plus className="size-4" />
              New topic
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
