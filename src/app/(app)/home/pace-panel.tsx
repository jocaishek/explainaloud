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
  /** Where the bar goes: this session's own gap report. */
  href: string;
  /** Short date under the bar, formatted on the server. */
  when: string;
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
      /* The same frosted panel the landing's chart floats on: this is product
         output, and product output sits on glass everywhere in the product. */
      className="glass-panel panel-live rounded-card p-5 sm:p-6"
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

      {/* Two rows, not one.
       *
       * The bars and their labels are separate flex rows sharing the same gap
       * and the same `flex-1` children, so the columns line up without the
       * labels being inside the plotted area. They cannot be: the baseline is
       * positioned as a percentage of its container's height, and a container
       * that also held the labels would put the line in the wrong place. */}
      <div className="relative mt-6 flex h-32 items-end gap-2">
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
                     racing one — exactly as the landing's chart plots it.

                     The ordinary bar used to be `--color-brand`, which was
                     fine while the accent was red-orange and is not now the
                     accent is gold: brand amber against `--vague` ochre is
                     one hue at two values, and this chart exists to make that
                     one distinction legible at a glance. Ink is what the
                     landing already used, so the two charts now match. */
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

      <p className="mt-4 border-border border-t pt-3 text-[0.88rem] text-subtle leading-relaxed">
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
    </section>
  );
}
