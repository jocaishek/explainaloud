import { cookies } from "next/headers";
import { isAdminEmail } from "~/lib/admin";
import { requireProfile } from "~/lib/supabase/server";
import { AppShell, type SidebarTopic } from "./app-shell";

/** How many topics the rail lists before it stops being a rail. */
const RAIL_TOPICS = 6;

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Redirects to /onboarding when the account has no profile yet.
  const { supabase, profile, user } = await requireProfile();

  /* Whether the rail was left retracted, read here rather than in the browser
     so the first paint is already the right width. Doing it client-side means
     rendering 256px of rail and then snapping it to 68px after hydration,
     which is a layout jump on every navigation for anybody who prefers it
     closed. */
  const railCollapsed = (await cookies()).get("rail-collapsed")?.value === "1";

  /* The rail's topic list. Six columns of one indexed table, ordered by a
     column that is already indexed — cheap enough to run on every screen in
     the app, which is what a persistent rail means. */
  const { data: topics } = await supabase
    .from("courses")
    .select("id, slug, topic, name")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(RAIL_TOPICS)
    .returns<SidebarTopic[]>();

  return (
    <AppShell
      firstName={profile.first_name}
      lastName={profile.last_name}
      showAdmin={isAdminEmail(user.email)}
      topics={topics ?? []}
      defaultCollapsed={railCollapsed}
    >
      {children}
    </AppShell>
  );
}
