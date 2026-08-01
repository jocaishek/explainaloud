import Link from "next/link";

/**
 * Your recent pace against your own baseline.
 *
 * The landing page promises this in section 04 and then, until now, the only
 * place it appeared once you were inside was buried in a single course's gap
 * report. A feature advertised on the way in should be on the first screen
 * after the door.
 *
 * Same chart, same rules: real quantities drawn to scale with the baseline
 * ruled across them, not under them, because getting ahead of your own
 * baseline is the thing worth seeing and it should read as a crossing. Bars
 * that clear the baseline by more than 15% take the amber that means "said,
 * but not checkably" everywhere else in the product — racing is the delivery
 * equivalent of being vague.
 *
 * Every number here is measured. Nothing is drawn when there is nothing to
 * draw: two sessions is not a trend, and a chart of one bar is a claim the
 * data cannot support.
 */

/** Above this multiple of the baseline, a delivery counts as racing. */
const RACING = 1.15;

/** Fewer than this and there is no shape to look at yet. */
const MINIMUM_SESSIONS = 3;

export type PaceSession = {
  id: string;
  topic: string;
  wpm: number;
};

export function PacePanel({
  sessions,
  baselineWpm,
}: {
  /** Oldest first, so the chart reads left to right in time. */
  sessions: PaceSession[];
  baselineWpm: number | null;
}) {
  if (!baselineWpm || sessions.length < MINIMUM_SESSIONS) return null;

  const peak = Math.max(...sessions.map((s) => s.wpm), baselineWpm) * 1.15;
  const latest = sessions[sessions.length - 1];
  const racing = latest ? latest.wpm > baselineWpm * RACING : false;

  return (
    <section
      aria-labelledby="pace-panel-heading"
      className="rounded-xl border border-border p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2
          id="pace-panel-heading"
          className="font-mono text-[0.7rem] text-subtle uppercase tracking-[0.09em]"
        >
          Your pace
        </h2>
        <p className="font-mono text-[0.7rem] text-subtle uppercase tracking-[0.09em]">
          Baseline{" "}
          <span className="text-strong tabular-nums">{baselineWpm}</span> wpm
        </p>
      </div>

      <div className="relative mt-6 flex h-32 items-end gap-[3px]">
        {sessions.map((session) => {
          const over = session.wpm > baselineWpm * RACING;
          return (
            <div
              key={session.id}
              title={`${session.topic}: ${session.wpm} wpm`}
              className="flex-1 rounded-t-[4px]"
              style={{
                height: `${(session.wpm / peak) * 100}%`,
                // The reserved amber, and it means here what it means inside a
                // transcript: said, but not in a form worth trusting.
                background: over ? "var(--vague)" : "var(--color-brand)",
              }}
            />
          );
        })}

        {/* The baseline, ruled across the bars rather than under them. Getting
            ahead of your own baseline is the thing worth seeing, so it has to
            read as a crossing. */}
        <div
          className="pointer-events-none absolute inset-x-0 border-foreground/45 border-t border-dashed"
          style={{ bottom: `${(baselineWpm / peak) * 100}%` }}
        />
      </div>

      <p className="mt-4 border-border border-t pt-3 text-[0.88rem] text-subtle leading-relaxed">
        {racing ? (
          <>
            Your last session ran{" "}
            <span className="font-medium text-strong tabular-nums">
              {latest?.wpm}
            </span>{" "}
            wpm, well over your baseline. Racing usually means reciting.{" "}
            <Link href="/gapreport" className="text-brand-ink underline">
              See what you missed
            </Link>
            .
          </>
        ) : (
          <>
            Your last session ran{" "}
            <span className="font-medium text-strong tabular-nums">
              {latest?.wpm}
            </span>{" "}
            wpm. Thinking time is not counted against you.
          </>
        )}
      </p>
    </section>
  );
}
