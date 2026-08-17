import Link from "next/link";

/**
 * Your recent pace against your own baseline.
 *
 * The landing page promises this and, until it was built, the only place it
 * appeared once you were inside was buried in a single course's gap report. A
 * feature advertised on the way in should be on the first screen after the
 * door.
 *
 * Same chart, same rules: real quantities drawn to scale with the baseline
 * ruled across them, not under them, because getting ahead of your own
 * baseline is the thing worth seeing and it should read as a crossing. Bars
 * that clear the baseline by more than 15% take the amber that means "said,
 * but not checkably" everywhere else in the product — racing is the delivery
 * equivalent of being vague.
 *
 * Every number here is measured. Nothing is drawn when there is nothing to
 * draw: two sessions is not a trend, and a chart of one bar is a claim the data
 * cannot support. What is drawn instead is a panel saying so — this used to
 * render nothing at all, which left a hole in the dashboard's second row for
 * everybody who had not recorded three times yet, and told them nothing about
 * why the thing they were promised was missing.
 */

/** Above this multiple of the baseline, a delivery counts as racing. */
const RACING = 1.15;

/** Fewer than this and there is no shape to look at yet. */
const MINIMUM_SESSIONS = 3;

export type PaceSession = {
  id: string;
  topic: string;
  wpm: number;
  /** Where the bar goes: this session's own gap report. */
  href: string;
  /** Short date under the bar, formatted on the server. */
  when: string;
};

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <section
      aria-labelledby="pace-panel-heading"
      className="flex h-full flex-col rounded-card border border-border bg-card p-5 shadow-rest sm:p-6"
    >
      {children}
    </section>
  );
}

function Heading({ baselineWpm }: { baselineWpm: number | null }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <h2
        id="pace-panel-heading"
        className="font-mono text-[0.7rem] text-subtle uppercase tracking-[0.12em]"
      >
        Your pace
      </h2>
      {baselineWpm && (
        <p className="font-mono text-[0.7rem] text-subtle uppercase tracking-[0.09em]">
          Baseline{" "}
          <span className="text-strong tabular-nums">{baselineWpm}</span> wpm
        </p>
      )}
    </div>
  );
}

export function PacePanel({
  sessions,
  baselineWpm,
}: {
  /** Oldest first, so the chart reads left to right in time. */
  sessions: PaceSession[];
  baselineWpm: number | null;
}) {
  if (!baselineWpm || sessions.length < MINIMUM_SESSIONS) {
    const remaining = MINIMUM_SESSIONS - sessions.length;
    return (
      <Panel>
        <Heading baselineWpm={baselineWpm} />
        {/* Three marks standing in for the three bars, so the shape of what is
            coming is visible before there is anything to plot. */}
        <div
          aria-hidden
          className="mt-6 flex h-24 items-end gap-2 opacity-60 sm:h-28"
        >
          {[0.55, 0.8, 0.42].map((h, i) => (
            <span
              key={h}
              className="flex-1 rounded-t-[4px] border-border border-x border-t border-dashed"
              style={{
                height: `${h * 100}%`,
                // Only the ones already recorded are filled in.
                background: i < sessions.length ? "var(--surface)" : undefined,
              }}
            />
          ))}
        </div>
        <p className="mt-auto pt-4 text-[0.88rem] text-subtle leading-relaxed">
          {baselineWpm
            ? `${remaining} more ${remaining === 1 ? "recording" : "recordings"} and your pace is charted here against your baseline. Two sessions is not a trend.`
            : "Your speaking pace is measured on your first recording, then charted here against it."}
        </p>
      </Panel>
    );
  }

  const peak = Math.max(...sessions.map((s) => s.wpm), baselineWpm) * 1.15;
  const latest = sessions[sessions.length - 1];
  const racing = latest ? latest.wpm > baselineWpm * RACING : false;

  return (
    <Panel>
      <Heading baselineWpm={baselineWpm} />

      {/* Two rows, not one.
       *
       * The bars and their labels are separate flex rows sharing the same gap
       * and the same `flex-1` children, so the columns line up without the
       * labels being inside the plotted area. They cannot be: the baseline is
       * positioned as a percentage of its container's height, and a container
       * that also held the labels would put the line in the wrong place. */}
      <div className="relative mt-6 flex h-24 items-end gap-2 sm:h-28">
        {sessions.map((session) => {
          const over = session.wpm > baselineWpm * RACING;
          return (
            <Link
              key={session.id}
              href={session.href}
              aria-label={`${session.topic}, ${session.wpm} words per minute — open this session's gap report`}
              className="press group flex flex-1 items-end self-stretch rounded-t-[4px] focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2"
            >
              {/* The bar is inside the link rather than being it, so the
                  whole column height is clickable — a 40 wpm bar is a
                  thirty-pixel target otherwise, and the short bars are the
                  ones worth reading about. */}
              <span
                className="w-full rounded-t-[4px] transition-[filter,transform] duration-200 ease-out group-hover:brightness-110 group-focus-visible:brightness-110"
                style={{
                  height: `${(session.wpm / peak) * 100}%`,
                  /* Ink for an ordinary session, the reserved amber for a
                     racing one — exactly as the landing's chart plots it. The
                     ordinary bar is not the accent: this chart exists to make
                     one distinction legible at a glance, and two colours that
                     both mean something are one too many. */
                  background: over ? "var(--vague)" : "var(--foreground)",
                }}
              />
            </Link>
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

      {/* What each bar is. Without this the chart is a row of coloured blocks
          that happen to be clickable, and nothing says where a click goes. */}
      <div className="mt-2 flex gap-2">
        {sessions.map((session) => (
          <div key={session.id} className="min-w-0 flex-1">
            <p className="font-mono text-[0.7rem] text-strong tabular-nums">
              {session.wpm}
            </p>
            <p className="truncate text-[0.75rem] text-subtle">
              {session.topic}
            </p>
            <p className="truncate font-mono text-[0.65rem] text-subtle uppercase tracking-[0.08em]">
              {session.when}
            </p>
          </div>
        ))}
      </div>

      <p className="mt-auto border-border border-t pt-3 text-[0.88rem] text-subtle leading-relaxed">
        {racing ? (
          <>
            Your last session ran{" "}
            <span className="font-medium text-strong tabular-nums">
              {latest?.wpm}
            </span>{" "}
            wpm, well over your baseline. Racing usually means reciting.{" "}
            <Link
              href={latest?.href ?? "/gaps"}
              className="text-brand-ink underline"
            >
              See what you missed
            </Link>
            .
          </>
        ) : (
          <>
            {/* Said from the measurement's side, not the reader's.
             *
             * This was "Thinking time is not counted against you", which
             * people read as a warning that their thinking time was being
             * watched — the sentence names the penalty first and the reprieve
             * second, so the penalty is what lands. It is also not what the
             * number does: silence inside each ten-second window is
             * subtracted from that window's denominator, so the rate is words
             * over time spent speaking. Pausing does not lower it because
             * pausing is not in it. */}
            Your last session ran{" "}
            <span className="font-medium text-strong tabular-nums">
              {latest?.wpm}
            </span>{" "}
            wpm — how fast you speak, with the pauses left out.
          </>
        )}
      </p>
    </Panel>
  );
}
