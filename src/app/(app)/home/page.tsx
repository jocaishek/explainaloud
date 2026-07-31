import { Greeting } from "~/components/greeting";
import type { Course, Folder } from "~/lib/folders";
import { requireProfile } from "~/lib/supabase/server";
import { TopicGrid } from "../topic-grid";

export default async function DashboardPage() {
  const { supabase, user, profile } = await requireProfile();

  const [{ data: folders }, { data: courses }] = await Promise.all([
    supabase
      .from("folders")
      .select("id, name, color, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .returns<Folder[]>(),
    supabase
      .from("courses")
      .select("id, topic, name, status, folder_id, created_at, slug")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .returns<Course[]>(),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-12">
      <div>
        <Greeting name={profile.first_name} />
        <p className="mt-2 text-subtle">
          Every topic you&apos;ve started, from teach-back to gap report.
        </p>
      </div>

      <TopicGrid folders={folders ?? []} courses={courses ?? []} />
    </div>
  );
}
