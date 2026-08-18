import { cookies } from "next/headers";
import { isAdminEmail } from "~/lib/admin";
import type { Folder } from "~/lib/folders";
import { requireProfile } from "~/lib/supabase/server";
import { AppShell, type RailCourse } from "./app-shell";

/**
 * How many topics the rail lists before it stops being a rail.
 *
 * Higher than the six it used to show, because the rail is now a place to file
 * things rather than a list of the last few: a folder you cannot see is a
 * folder you cannot drag into. Still bounded — a rail is not the topic grid,
 * and this query runs on every screen in the app.
 */
const RAIL_COURSES = 40;

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

  const [{ data: folders }, { data: courses }] = await Promise.all([
    supabase
      .from("folders")
      .select("id, name, color, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .returns<Folder[]>(),
    supabase
      .from("courses")
      .select("id, slug, topic, name, folder_id, pinned")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(RAIL_COURSES)
      .returns<RailCourse[]>(),
  ]);

  return (
    <AppShell
      firstName={profile.first_name}
      lastName={profile.last_name}
      showAdmin={isAdminEmail(user.email)}
      folders={folders ?? []}
      courses={courses ?? []}
      defaultCollapsed={railCollapsed}
    >
      {children}
    </AppShell>
  );
}
