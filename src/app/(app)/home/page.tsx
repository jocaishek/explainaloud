import type { Course, Folder } from "~/lib/folders";
import type { SpeechMetrics } from "~/lib/speech-metrics";
import { requireProfile } from "~/lib/supabase/server";
import { TopicGrid } from "../topic-grid";
import { FirstRunTour } from "./first-run";
import { HomeHeader } from "./home-header";
import { PacePanel, type PaceSession } from "./pace-panel";
import { QuickActions } from "./quick-actions";
import { StatCards } from "./stat-cards";

/**
 * How many bars the pace chart draws, and how many rows it reads to find them.
 *
 * The window is wider than the chart because a session with too little speech
 * to measure is dropped rather than drawn faintly — reading exactly five rows
 * would mean two unusable ones left the chart three bars long.
 */
const PACE_BARS = 5;
const PACE_WINDOW = 20;

export default async function DashboardPage() {
  const { supabase, user, profile } = await requireProfile();

  const [
    { data: folders },
    { data: courses },
    { data: baseline },
    { data: recent },
    { count: sessionCount },
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
      .select("id, speech_metrics, started_at, courses ( topic, slug )")
      .eq("user_id", user.id)
      .not("speech_metrics", "is", null)
      .order("started_at", { ascending: false })
      .limit(PACE_WINDOW)
      .returns<
        Array<{
          id: string;
          speech_metrics: SpeechMetrics | null;
          started_at: string;
          courses: { topic: string; slug: string } | null;
        }>
      >(),
    // Head-only: the rail wants the number, never the rows.
    supabase
      .from("course_sessions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
  ]);

  /* Unreliable recordings are dropped rather than drawn faintly.
   *
   * `reliable` is false when there was too little speech for the windowed
   * rates to mean anything, and a bar computed from four seconds of talking is
   * not a quieter version of the truth — it is a number that should not be on
   * a chart at all.
   *
   * A session whose course has no slug is dropped too: every bar is a link to
   * the session it stands for, and one that cannot be opened is a control
   * that does nothing.
   *
   * Sliced before the reverse, because the query is newest-first and it is
   * the five most recent that are wanted; reversed after, because the chart
   * reads left to right in time. */
  const paceSessions: PaceSession[] = (recent ?? [])
    .filter((row) => row.speech_metrics?.reliable && row.courses?.slug)
    .map((row) => ({
      id: row.id,
      topic: row.courses?.topic ?? "Untitled",
      wpm: Math.round(row.speech_metrics?.medianWpm ?? 0),
      href: `/home/${row.courses?.slug}/gaps?session=${row.id}`,
      when: new Date(row.started_at).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
      }),
    }))
    .filter((row) => row.wpm > 0)
    .slice(0, PACE_BARS)
    .reverse();

  const baselineWpm = baseline?.median_wpm ?? baseline?.capable_wpm ?? null;

  const topicCount = courses?.length ?? 0;
  const recorded = sessionCount ?? 0;

  const stats = [
    {
      label: "Explanations recorded",
      value: recorded,
      caption: "Across every topic you have started.",
      empty: "None yet — your first one is three minutes away.",
    },
    {
      label: "Your speaking pace",
      value: baselineWpm ?? 0,
      unit: "wpm",
      caption: "Your own baseline, with the pauses left out.",
      empty: "Measured on your first take.",
    },
    {
      label: "Topics",
      value: topicCount,
      caption: "Courses built from your own material.",
      empty: "Upload something to start one.",
    },
  ];

  /* Where this account stands, in one line, said from the numbers rather than
     from a copy deck. The three states are the three shapes an account can be
     in, and each one names the next thing to do rather than congratulating
     anybody for arriving. */
  const lede =
    topicCount === 0
      ? "Nothing here yet. Start a topic and the rest of this page fills itself in."
      : recorded === 0
        ? `${topicCount} ${topicCount === 1 ? "topic" : "topics"} ready to go. The next step is explaining one out loud.`
        : `${recorded} ${recorded === 1 ? "explanation" : "explanations"} across ${topicCount} ${topicCount === 1 ? "topic" : "topics"}. Carry on below, or start something new.`;

  return (
    /* One column, one measure, from the top of the page to the bottom of the
       topic list. The rail down the left is the app's frame; everything in
       here is the screen. */
    <div className="mx-auto flex w-full max-w-[var(--measure)] flex-col gap-stack px-4 py-8 pb-14 sm:px-6 lg:px-10 lg:py-10 lg:pb-16">
      <HomeHeader firstName={profile.first_name} lede={lede} />

      <StatCards stats={stats} />

      {/* The two panels of the second row: what to do, and how the doing has
          been going. Side by side on a wide screen because they answer the
          same question from opposite ends — one is the loop, the other is
          your record of running it. */}
      <div className="grid items-stretch gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,21rem)]">
        {/* One `data-rise` each rather than one on the row, so the two panels
            arrive left then right. The index comes from document order — see
            `ScrollReveal` — so nothing here has to know its own position. */}
        <div data-rise="" className="h-full">
          {/* Before the topic list, not after it: arriving usually means
              knowing what you want to do rather than which topic you want to
              do it to. */}
          <QuickActions />
        </div>
        <div data-rise="" className="h-full">
          <PacePanel
            sessions={paceSessions}
            baselineWpm={baselineWpm}
            recorded={recorded}
          />
        </div>
      </div>

      <div data-rise="" data-tour="topics">
        <TopicGrid folders={folders ?? []} courses={courses ?? []} />
      </div>

      {/* Three steps, once, for somebody who has just arrived. Renders
          nothing at all for everybody else. */}
      <FirstRunTour />
    </div>
  );
}
