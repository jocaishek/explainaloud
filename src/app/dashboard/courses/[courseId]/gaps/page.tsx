import Link from "next/link";
import {
  DeliverySummary,
  SlowSpotCallout,
} from "~/components/delivery-summary";
import { KnowledgeScore } from "~/components/knowledge-score";
import { ScrollToTargetLink } from "~/components/scroll-to-target-link";
import { SessionPicker } from "~/components/session-picker";
import type { GapReport, SpanStatus } from "~/lib/ai/schemas";
import { PACE_DROP_FRACTION, type SpeechMetrics } from "~/lib/speech-metrics";
import { requireUser } from "~/lib/supabase/server";
import { cn } from "~/lib/utils";

type GapRow = {
  id: string;
  phrase: string;
  category: string;
  explanation: string | null;
  resolved: boolean;
  created_at: string;
};

type StoredSpan = {
  text: string;
  status: SpanStatus;
  issue: string | null;
};

type SessionReport = {
  id: string;
  transcript: string | null;
  score: number | null;
  spans: StoredSpan[] | null;
  report: GapReport | null;
  speech_metrics: SpeechMetrics | null;
  /** What they were asked. Null for sessions recorded before questions. */
  question: string | null;
  gaps: GapRow[];
};

type BaselineRow = { capable_wpm: number; median_wpm: number };

/**
 * Whether the slowest stretch of speech landed on something the grader also
 * flagged.
 *
 * Substring matching in both directions, over normalised text, because the two
 * sides come from different places: the stretch is whatever words fell inside a
 * ten-second window, so it starts and ends mid-sentence, while a weakness
 * phrase is the grader's own wording of the point that was missed. Neither
 * contains the other reliably, and requiring an exact match would mean this
 * never fires.
 */
function weaknessOnSlowStretch(stretch: string, weaknesses: GapRow[]) {
  const haystack = normalized(stretch);
  if (haystack.length < 12) return null;
  return (
    weaknesses.find((weakness) => {
      const phrase = normalized(weakness.phrase);
      // Two or three words are too common to be evidence of anything.
      if (phrase.length < 12) return false;
      return haystack.includes(phrase) || phrase.includes(haystack);
    }) ?? null
  );
}

function normalized(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function relatedWeakness(text: string, index: number, weaknesses: GapRow[]) {
  if (weaknesses.length === 0) return null;
  const spanText = normalized(text);
  const exact = weaknesses.find((weakness) => {
    const phrase = normalized(weakness.phrase);
    return (
      phrase.length > 0 &&
      (spanText.includes(phrase) || phrase.includes(spanText))
    );
  });
  return exact ?? weaknesses[index % weaknesses.length] ?? null;
}

export default async function GapReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  /** `?session=` picks which recording to read. Absent means the newest. */
  searchParams: Promise<{ session?: string }>;
}) {
  const { courseId } = await params;
  const { session: wanted } = await searchParams;
  const { supabase, user } = await requireUser();

  // Every graded recording, newest first. The report used to be whichever was
  // most recent with no way to reach the others, which made every earlier
  // attempt unreadable the moment you recorded again — and the whole point of
  // recording repeatedly is to compare.
  const { data: graded } = await supabase
    .from("course_sessions")
    .select("id, started_at, score, mode")
    .eq("course_id", courseId)
    .eq("user_id", user.id)
    .not("report", "is", null)
    .order("started_at", { ascending: false })
    .limit(30)
    .returns<
      Array<{
        id: string;
        started_at: string;
        score: number | null;
        mode: string | null;
      }>
    >();

  const [{ data: session }, { data: baseline }, { data: pastSessions }] =
    await Promise.all([
      (wanted
        ? supabase
            .from("course_sessions")
            .select(
              "id, transcript, score, spans, report, speech_metrics, question, gaps ( id, phrase, category, explanation, resolved, created_at )",
            )
            .eq("course_id", courseId)
            .eq("user_id", user.id)
            .eq("id", wanted)
        : supabase
            .from("course_sessions")
            .select(
              "id, transcript, score, spans, report, speech_metrics, question, gaps ( id, phrase, category, explanation, resolved, created_at )",
            )
            .eq("course_id", courseId)
            .eq("user_id", user.id)
            .not("report", "is", null)
            .order("started_at", { ascending: false })
            .limit(1)
      ).maybeSingle<SessionReport>(),
      // The warm-up's reference, if they recorded one.
      supabase
        .from("speech_baselines")
        .select("capable_wpm, median_wpm")
        .eq("user_id", user.id)
        .maybeSingle<BaselineRow>(),
      // Fallback reference for anyone who skipped the warm-up: their own past
      // sessions. Across every course, because how fast someone talks is a fact
      // about them rather than about the topic. Capped because a rolling recent
      // window tracks a speaker who is getting more fluent, where a lifetime
      // average would not.
      supabase
        .from("course_sessions")
        .select("speech_metrics")
        .eq("user_id", user.id)
        .not("speech_metrics", "is", null)
        .order("started_at", { ascending: false })
        .limit(10)
        .returns<{ speech_metrics: SpeechMetrics | null }[]>(),
    ]);

  if (!session?.report) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-subtle">
          No gap report yet. Explain the topic once and your score, transcript,
          strengths, and weaknesses will appear here.
        </p>
        <Link
          href={`/dashboard/courses/${courseId}/record`}
          className="w-fit rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Start explaining
        </Link>
      </div>
    );
  }

  const score = Math.round(session.score ?? session.report.score);
  const spans = session.spans ?? [];
  const weaknesses = (session.gaps ?? []) as GapRow[];
  const hasClassifiedClaim = spans.some(
    (span) =>
      span.status === "correct" ||
      span.status === "gap" ||
      span.status === "vague",
  );
  const markSubstantiveNeutralAsGap =
    score < 50 && weaknesses.length > 0 && !hasClassifiedClaim;

  // "missing_step" means the student never reached the point. Everything else
  // is a claim they made that was wrong. Only the second kind is a mistake.
  const mistakes = weaknesses.filter(
    (weakness) => weakness.category !== "missing_step",
  );
  const notCovered = weaknesses.filter(
    (weakness) => weakness.category === "missing_step",
  );

  // Everything that answers "how did I do" sits above the fold, before the
  // transcript: the score, the pace, and the one place those two agree.
  const metrics = session.speech_metrics;

  // Two ways to know how someone usually sounds, in order of quality.
  //
  // The warm-up is better because it is deliberately a topic they know, so it
  // captures confident speech. Averaging past sessions cannot make that
  // distinction — it mixes topics they knew with topics they did not — but it
  // is far better than comparing against nothing, and it costs the user
  // nothing to obtain.
  const reliablePastWpm = (pastSessions ?? [])
    .map((row) => row.speech_metrics)
    .filter((m): m is SpeechMetrics => !!m?.reliable)
    .map((m) => m.medianWpm)
    .filter((wpm) => wpm > 0);

  // Median rather than mean: one recording where someone paused to find a
  // reference should not drag their "usual" down for weeks.
  const sessionAverage =
    reliablePastWpm.length >= 2
      ? Math.round(
          [...reliablePastWpm].sort((a, b) => a - b)[
            Math.floor(reliablePastWpm.length / 2)
          ] as number,
        )
      : null;

  const baselineWpm =
    baseline?.capable_wpm ?? baseline?.median_wpm ?? sessionAverage;
  const slowSpot =
    metrics?.reliable && metrics.slowestStretch && baselineWpm
      ? metrics.slowestStretch
      : null;
  // The same threshold the comparison helper uses, so the callout and any
  // future pace judgement cannot disagree about what counts as a real dip.
  const slowSpotWeakness =
    slowSpot &&
    baselineWpm &&
    slowSpot.wpm <= baselineWpm * (1 - PACE_DROP_FRACTION)
      ? weaknessOnSlowStretch(slowSpot.text, weaknesses)
      : null;

  return (
    <div className="flex flex-col gap-8">
      {(graded?.length ?? 0) > 1 && (
        <SessionPicker
          sessions={graded ?? []}
          current={session.id}
          courseId={courseId}
          basePath="gaps"
        />
      )}

      {/* A score means nothing without the question it answers. Ahead of it,
          because it is the thing the rest of the page is about. */}
      {session.question && (
        <div className="flex flex-col gap-1.5 rounded-xl border border-brand/20 bg-brand/[0.06] p-5">
          <span className="font-mono text-[10px] tracking-[0.14em] text-subtle uppercase">
            You were asked
          </span>
          <p className="text-base leading-relaxed font-medium text-strong">
            {session.question}
          </p>
        </div>
      )}

      <KnowledgeScore score={score} verdict={session.report.verdict} />

      {metrics?.reliable && (
        <DeliverySummary
          wpm={metrics.medianWpm}
          usualWpm={baselineWpm}
          recordingsSoFar={reliablePastWpm.length}
        />
      )}

      {slowSpot && slowSpotWeakness && baselineWpm && (
        <SlowSpotCallout
          text={slowSpot.text}
          wpm={slowSpot.wpm}
          baselineWpm={baselineWpm}
        />
      )}

      {session.transcript && spans.length > 0 && (
        <section
          aria-labelledby="transcript-heading"
          className="flex flex-col gap-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2
              id="transcript-heading"
              className="text-base font-semibold text-strong"
            >
              Your transcript
            </h2>
            <div className="flex items-center gap-3 text-xs text-subtle">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-green-500" />
                Accurate
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-red-500" />
                Needs work
              </span>
            </div>
          </div>
          <p className="max-w-3xl rounded-xl bg-surface p-4 text-sm leading-7 text-foreground">
            {spans.map((span, index) => {
              const substantive = span.text.trim().length > 0;
              const status =
                span.status === "neutral" &&
                substantive &&
                markSubstantiveNeutralAsGap
                  ? "gap"
                  : span.status;
              const weakness =
                status === "gap"
                  ? relatedWeakness(span.text, index, weaknesses)
                  : null;

              if (status === "gap" && weakness) {
                return (
                  <ScrollToTargetLink
                    // biome-ignore lint/suspicious/noArrayIndexKey: transcript spans are positional
                    key={`${index}-${span.text.slice(0, 16)}`}
                    targetId={`weakness-${weakness.id}`}
                    title={span.issue ?? "Jump to this weakness"}
                    className="rounded bg-red-500/10 text-red-600 transition-colors hover:bg-red-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50 dark:text-red-400"
                  >
                    {span.text}
                  </ScrollToTargetLink>
                );
              }

              return (
                <span
                  // biome-ignore lint/suspicious/noArrayIndexKey: transcript spans are positional
                  key={`${index}-${span.text.slice(0, 16)}`}
                  className={cn(
                    status === "correct" &&
                      "text-green-600 dark:text-green-400",
                    // Vague is grey, not red: too woolly to check is not the
                    // same as wrong, and colouring it red says it is.
                    (status === "vague" || status === "neutral") &&
                      "text-subtle",
                  )}
                >
                  {span.text}
                </span>
              );
            })}
          </p>
          <p className="text-xs text-subtle">
            Select any red text to jump to the matching weakness.
          </p>
        </section>
      )}

      <section
        aria-labelledby="strengths-heading"
        className="flex flex-col gap-3"
      >
        <h2
          id="strengths-heading"
          className="text-base font-semibold text-strong"
        >
          Knowledge strengths
        </h2>
        {session.report.strengths.length > 0 ? (
          <ul className="flex max-w-3xl flex-col gap-2">
            {session.report.strengths.map((strength) => (
              <li
                key={strength}
                className="flex gap-2 text-sm leading-6 text-foreground"
              >
                <span
                  aria-hidden
                  className="mt-2 size-2 shrink-0 rounded-full bg-green-500"
                />
                {strength}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-subtle">
            No clear strengths were demonstrated in this explanation yet.
          </p>
        )}
      </section>

      {/* Two lists, because they are two different things.
          A tester saw five cards reading "Missing Step" under "Knowledge
          weaknesses" and concluded the app had docked them for not reciting
          the whole course. They were right to. Getting something wrong and
          not having reached it yet deserve different headings, different
          colours, and different words. */}
      <WeaknessList
        heading="Where you went wrong"
        description="Worth fixing first: these are things the explanation got wrong."
        emptyText="Nothing you said was wrong. "
        tone="error"
        courseId={courseId}
        items={mistakes}
      />

      <WeaknessList
        heading="Not covered yet"
        description="You didn't get to these. That isn't the same as getting them wrong."
        emptyText="You reached every key point in the course."
        tone="neutral"
        courseId={courseId}
        items={notCovered}
      />
    </div>
  );
}

/**
 * One group of report items.
 *
 * `tone` is the whole point of the split: an error is red because it needs
 * correcting, an omission is not, because nothing about it is wrong.
 */
function WeaknessList({
  heading,
  description,
  emptyText,
  tone,
  courseId,
  items,
}: {
  heading: string;
  description: string;
  emptyText: string;
  tone: "error" | "neutral";
  courseId: string;
  items: GapRow[];
}) {
  const headingId = `${tone}-heading`;

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <div>
        <h2 id={headingId} className="text-base font-semibold text-strong">
          {heading}
        </h2>
        <p className="mt-1 text-sm text-subtle">{description}</p>
      </div>

      {items.length > 0 ? (
        <div className="divide-y divide-border border-y border-border">
          {items.map((item) => (
            <article
              id={`weakness-${item.id}`}
              key={item.id}
              tabIndex={-1}
              className={cn(
                "flex scroll-mt-24 flex-col gap-2 py-4 outline-none",
                tone === "error" && "target:bg-red-500/[0.04]",
              )}
            >
              {/* Only errors get a category chip. Under "Not covered yet",
                  a label reading "Missing Step" restates the heading and
                  reintroduces the tone the split exists to remove. */}
              {tone === "error" && (
                <p className="text-xs font-medium text-red-600 capitalize dark:text-red-400">
                  {item.category.replace(/_/g, " ")}
                </p>
              )}
              <h3 className="text-sm font-semibold text-strong">
                {item.phrase}
              </h3>
              {/* The report says what was missed; Re-Teach is where it gets
                  explained. Printing the explanation here too meant the
                  answer arrived before the student had registered the gap. */}
              <Link
                href={`/dashboard/courses/${courseId}/re-teach#gap-${item.id}`}
                className="w-fit rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-strong transition-colors hover:border-brand/40 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Re-teach this
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <p className="text-sm text-subtle">{emptyText}</p>
      )}
    </section>
  );
}
