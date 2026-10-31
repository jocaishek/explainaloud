import type { Course, Folder } from "~/lib/folders";
import { courseHref, courseTitle } from "~/lib/folders";
import { ownStreak } from "~/lib/own-streak";
import type { SpeechMetrics } from "~/lib/speech-metrics";
import { requireProfile } from "~/lib/supabase/server";
import { TopicGrid } from "../topic-grid";
import {
  StatCard,
  StreakIcon,
  TonightForm,
  UpNext,
  type UpNextItem,
  WeekCard,
  type WeekDay,
} from "./dashboard";
import { FirstRunTour } from "./first-run";
import { PacePanel, type PaceSession, paceStanding } from "./pace-panel";

/**
 * How many bars the pace chart draws, and how many rows it reads to find them.
 *
 * The window is wider than the chart because a session with too little speech
 * to measure is dropped rather than drawn faintly — reading exactly five rows
 * would mean two unusable ones left the chart three bars long.
 */
const PACE_BARS = 5;
const PACE_WINDOW = 20;

/** A grade at or above this is a topic in hand rather than one to practise. */
const READY_SCORE = 80;

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
    currentStreak,
    { data: week },
    { data: graded },
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
    ownStreak(zone),
    supabase.rpc("streak_week", { zone }),
    // Every recording's topic, grade and date, for Up next. Newest first, so
    // the first row seen for a course is its most recent. Unbounded, like the
    // topic hubs' read: three small columns, and a window would quietly call
    // an old topic "not explained yet".
    supabase
      .from("course_sessions")
      .select("course_id, score, started_at, analyzed_at")
      .eq("user_id", user.id)
      .order("started_at", { ascending: false })
      .returns<
        Array<{
          course_id: string;
          score: number | null;
          started_at: string;
          analyzed_at: string | null;
        }>
      >(),
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

  /* The week RPC comes back untyped, so it is narrowed here rather than
     asserted at the call. */
  const weekDays = (week ?? []) as WeekDay[];

  const topicCount = courses?.length ?? 0;
  const recorded = sessionCount ?? 0;

  const weekRecorded = weekDays.filter((d) => d.sessions > 0).length;
  const weekSessions = weekDays.reduce((sum, d) => sum + d.sessions, 0);
  const latestPace = paceSessions.at(-1)?.wpm ?? null;
  const paceDelta =
    latestPace !== null && baselineWpm
      ? latestPace - Math.round(baselineWpm)
      : null;

  /* Each topic's latest grade, and which topics have been explained at all.
     A recording that was never graded (analysis failed, or is still running)
     still counts as explained: telling somebody to explain a topic "for the
     first time" after they did is the one thing this list must not say. */
  const latest = new Map<string, { score: number | null; at: string }>();
  const spoken = new Set<string>();
  for (const row of graded ?? []) {
    spoken.add(row.course_id);
    if (row.analyzed_at && !latest.has(row.course_id)) {
      latest.set(row.course_id, { score: row.score, at: row.started_at });
    }
  }
  const explainedCount = (courses ?? []).filter((c) => spoken.has(c.id)).length;

  /* Up next, from the grades: the weakest topic to practise, a topic never
     explained, and a topic in hand that has not been said for longest. Three
     at most, and never the same topic twice. */
  const upNext: UpNextItem[] = [];
  const all = courses ?? [];
  const weakest = all
    .filter((c) => {
      const score = latest.get(c.id)?.score;
      return typeof score === "number" && score < READY_SCORE;
    })
    .sort(
      (a, b) => (latest.get(a.id)?.score ?? 0) - (latest.get(b.id)?.score ?? 0),
    )[0];
  if (weakest) {
    upNext.push({
      key: `practice-${weakest.id}`,
      tone: "practice",
      why: "Gaps to close",
      title: `Practise ${courseTitle(weakest)}`,
      detail: `Your last explanation scored ${latest.get(weakest.id)?.score}. The gap report shows what was missed`,
      href: `${courseHref(weakest)}/gaps`,
      action: "See what you missed",
    });
  }
  const fresh = all.find((c) => !spoken.has(c.id));
  if (fresh) {
    upNext.push({
      key: `fresh-${fresh.id}`,
      tone: "fresh",
      why: "Not explained yet",
      title: `Explain ${courseTitle(fresh)}`,
      detail: "About three minutes, out loud",
      href: `${courseHref(fresh)}/record`,
      action: "Start explaining",
    });
  }
  const stale = all
    .filter((c) => {
      const score = latest.get(c.id)?.score;
      return typeof score === "number" && score >= READY_SCORE;
    })
    .sort((a, b) =>
      (latest.get(a.id)?.at ?? "").localeCompare(latest.get(b.id)?.at ?? ""),
    )[0];
  if (stale) {
    const at = latest.get(stale.id)?.at;
    upNext.push({
      key: `again-${stale.id}`,
      tone: "again",
      why: "In hand",
      title: `Say ${courseTitle(stale)} again`,
      detail: at
        ? `Last explained ${new Date(at).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: zone })}. A quick run keeps it from slipping`
        : "A quick run keeps it from slipping",
      href: `${courseHref(stale)}/record`,
      action: "Explain again",
    });
  }
  if (upNext.length === 0) {
    upNext.push({
      key: "first-topic",
      tone: "fresh",
      why: "Start here",
      title: "Make your first topic",
      detail: "Type a topic or add your notes, then explain it out loud",
      href: "/new",
      action: "New topic",
    });
  }

  /* Whether there is a pace chart to draw, and the one line that stands in
     for it when there is not. */
  const pace = paceStanding({
    baselineWpm,
    plotted: paceSessions.length,
    recorded,
  });

  const date = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: zone,
  });

  return (
    <div className="mx-auto flex w-full max-w-[90rem] flex-col gap-4 px-4 py-8 pb-16 sm:px-6 lg:px-8">
      <div data-rise="">
        <TonightForm date={date} />
      </div>

      {/* Four numbers, each with what it compares to. */}
      <section
        aria-label="Your numbers"
        data-rise=""
        className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4"
      >
        <StatCard
          label="Streak"
          icon={<StreakIcon streak={currentStreak} />}
          value={currentStreak}
          unit={currentStreak === 1 ? "day" : "days"}
          note={`${weekRecorded} of 7 days this week`}
        />
        <StatCard
          label="Explanations"
          value={recorded}
          note={`${weekSessions} this week`}
        />
        <StatCard
          label="Speaking pace"
          value={baselineWpm ? Math.round(baselineWpm) : null}
          unit="wpm"
          note={
            paceDelta !== null ? (
              <>
                <span className="font-medium text-strong tabular-nums">
                  {paceDelta > 0 ? `+${paceDelta}` : paceDelta}
                </span>{" "}
                on your latest measured recording
              </>
            ) : baselineWpm ? (
              "Your usual pace"
            ) : (
              "Measured on your first recording"
            )
          }
        />
        <StatCard
          label="Topics"
          value={topicCount}
          note={`${explainedCount} explained so far`}
        />
      </section>

      <div
        data-rise=""
        className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]"
      >
        <WeekCard week={weekDays} />
        <UpNext items={upNext.slice(0, 3)} />
      </div>

      {/* Your topics, with their folders. */}
      <section
        data-rise=""
        data-tour="topics"
        className="rounded-card border border-border bg-card p-6 shadow-rest"
      >
        <TopicGrid folders={folders ?? []} courses={courses ?? []} />
      </section>

      {/* The pace chart, or the reason there is not one yet. */}
      {pace.charted ? (
        <div data-rise="">
          <PacePanel sessions={paceSessions} baselineWpm={baselineWpm} />
        </div>
      ) : (
        pace.note && (
          <p data-rise="" className="px-1 text-sm text-subtle leading-relaxed">
            {pace.note}
          </p>
        )
      )}

      {/* Three steps, once, for somebody who has just arrived. Renders
          nothing at all for everybody else. */}
      <FirstRunTour seen={tourSeen} />
    </div>
  );
}
