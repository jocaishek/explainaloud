import { Greeting } from "~/components/greeting";
import type { Course, Folder } from "~/lib/folders";
import type { SpeechMetrics } from "~/lib/speech-metrics";
import { requireProfile } from "~/lib/supabase/server";
import { TopicGrid } from "../topic-grid";
import { PacePanel, type PaceSession } from "./pace-panel";
import { QuickActions } from "./quick-actions";

/** How many recent sessions the pace chart draws. */
const PACE_WINDOW = 12;

export default async function DashboardPage() {
  const { supabase, user, profile } = await requireProfile();

  const [
    { data: folders },
    { data: courses },
    { data: baseline },
    { data: recent },
  ] = await Promise.all([
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
    // The pace panel's two inputs. The warm-up reports a median, so the line
    // people are measured against has to be the median too — reading
    // `capable_wpm` here would tell somebody 150 during onboarding and then
    // compare them against 174, which is two numbers for one idea.
    supabase
      .from("speech_baselines")
      .select("median_wpm, capable_wpm")
      .eq("user_id", user.id)
      .maybeSingle<{ median_wpm: number; capable_wpm: number }>(),
    supabase
      .from("course_sessions")
      .select("id, speech_metrics, started_at, courses ( topic )")
      .eq("user_id", user.id)
      .not("speech_metrics", "is", null)
      .order("started_at", { ascending: false })
      .limit(PACE_WINDOW)
      .returns<
        Array<{
          id: string;
          speech_metrics: SpeechMetrics | null;
          started_at: string;
          courses: { topic: string } | null;
        }>
      >(),
  ]);

  /* Unreliable recordings are dropped rather than drawn faintly.
   *
   * `reliable` is false when there was too little speech for the windowed
   * rates to mean anything, and a bar computed from four seconds of talking is
   * not a quieter version of the truth — it is a number that should not be on
   * a chart at all. Reversed because the query is newest-first and the chart
   * reads left to right in time. */
  const paceSessions: PaceSession[] = (recent ?? [])
    .filter((row) => row.speech_metrics?.reliable)
    .map((row) => ({
      id: row.id,
      topic: row.courses?.topic ?? "Untitled",
      wpm: Math.round(row.speech_metrics?.medianWpm ?? 0),
    }))
    .filter((row) => row.wpm > 0)
    .reverse();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-12">
      <div className="flex flex-col gap-7">
        <Greeting name={profile.first_name} />
        {/* Before the topic list, not after it: arriving usually means
            knowing what you want to do rather than which topic you want to
            do it to. */}
        <QuickActions />
      </div>

      <PacePanel
        sessions={paceSessions}
        baselineWpm={baseline?.median_wpm ?? baseline?.capable_wpm ?? null}
      />

      <TopicGrid folders={folders ?? []} courses={courses ?? []} />
    </div>
  );
}
