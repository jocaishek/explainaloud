import type { Course, Folder } from "~/lib/folders";
import type { SpeechMetrics } from "~/lib/speech-metrics";
import { requireProfile } from "~/lib/supabase/server";
import { TopicGrid } from "../topic-grid";
import { FirstRunTour } from "./first-run";
import { HomeHeader } from "./home-header";
import { PacePanel, type PaceSession } from "./pace-panel";
import { StatCards } from "./stat-cards";
import { StreakStrip, type WeekDay } from "./streak-strip";

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

  /* Read separately rather than as part of `requireProfile`'s select, and on
     purpose.
     *
     * That select is one string listing every column, and PostgREST fails the
     * whole statement if any name in it does not exist — which `maybeSingle`
     * reports as no row, which `requireProfile` reads as "has not onboarded"
     * and redirects to `/onboarding`. Migrations here are applied by hand and
     * the deploy happens on merge, so naming a new column there means every
     * signed-in person is bounced to onboarding for the length of that window.
     *
     * Asking for it on its own costs one primary-key lookup on a connection
     * this request already holds, and its failure mode is contained: an error
     * leaves `tourSeen` false and somebody sees the tour once. */
  const { data: tourRow } = await supabase
    .from("profiles")
    .select("tour_seen_at")
    .eq("user_id", user.id)
    .maybeSingle<{ tour_seen_at: string | null }>();
  const tourSeen = tourRow?.tour_seen_at != null;

  /* The zone the streak is counted in.
   *
   * The profile's, not the server's, and not this request's headers either: a
   * run of days is a run of *their* days, and midnight in Auckland is 11am in
   * London. Recordings are filed against the browser's live zone (see
   * `markRecordingDay`), which is the same answer for everybody who has not
   * moved since signing up, and the better one for anybody who has. */
  const zone = profile.timezone ?? "UTC";

  const [
    { data: folders },
    { data: courses },
    { data: baseline },
    { data: recent },
    { count: sessionCount },
    { data: streak },
    { data: week },
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
    supabase.rpc("own_streak", { zone }),
    supabase.rpc("streak_week", { zone }),
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

  /* The two RPCs come back untyped, so they are narrowed here rather than
     asserted at the call. A streak that failed to load is not a streak of
     zero, but on a dashboard the difference is invisible and the alternative
     is an error state for a decoration. */
  const currentStreak = typeof streak === "number" ? streak : 0;
  const weekDays = (week ?? []) as WeekDay[];

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

      {/* Your topics, immediately.
       *
       * They used to be the last thing on the page, under a streak band, a
       * row of totals and a two-panel row — so opening the app put four
       * screens of summary between somebody and the only thing on it that is
       * theirs. The summary is worth having and it is not worth arriving at
       * first: a dashboard whose top half is about the dashboard is a page
       * you scroll past every time.
       *
       * The panel that used to lead — a numbered "Start here" of the three
       * steps — is gone rather than moved. It was a restatement of the loop
       * for somebody who had already learned it, and every route in it is
       * still one click away: the grid's own new-topic tile is `/new`, and
       * Record sits in the rail. The first-run tour still teaches the loop,
       * once, to the only people who need telling. */}
      <div data-rise="" data-tour="topics">
        <TopicGrid folders={folders ?? []} courses={courses ?? []} />
      </div>

      {/* The streak band goes the full measure, and has to.
       *
       * It was briefly put in a `1fr` column beside the pace panel, on the
       * arithmetic that the measure is 72rem and 1fr would therefore be
       * about 720px. That forgot the 256px rail: the content column is the
       * viewport minus the rail, so at 1280px the band actually got 592px.
       * Its three tracks need ~530px between the number and the seven day
       * circles, which left the sentence sixty pixels to wrap in and pushed
       * the last day off the card. A band whose own week does not fit is not
       * a band. */}
      {weekDays.length > 0 && (
        <StreakStrip streak={currentStreak} week={weekDays} />
      )}

      <StatCards stats={stats} />

      <div data-rise="">
        <PacePanel
          sessions={paceSessions}
          baselineWpm={baselineWpm}
          recorded={recorded}
        />
      </div>

      {/* Three steps, once, for somebody who has just arrived. Renders
          nothing at all for everybody else. */}
      <FirstRunTour seen={tourSeen} />
    </div>
  );
}
