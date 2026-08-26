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
 * **The plot keeps its own measure; the sentence takes the rest.** This
 * used to sit in a 21rem column and now runs the full width of the page,
 * and a five-bar chart stretched across 1000px is five slabs rather than
 * a chart. So the bars stay about 26rem wide and the line that explains
 * them moves alongside instead of under — which fills the card with the
 * thing it is for rather than with a capped chart and a field of nothing
 * to its right.
 *
 * Every number here is measured. Nothing is drawn when there is nothing to
 * draw: two sessions is not a trend, and a chart of one bar is a claim the data
 * cannot support. What is drawn instead is a panel saying so — this used to
 * render nothing at all, which left a hole in the dashboard's second row for
 * everybody who had not recorded three times yet, and told them nothing about
 * why the thing they were promised was missing.
 *
 * **The empty state has to know why it is empty.** It used to receive only the
 * plottable sessions, so it inferred everything from that one number — and got
 * it wrong in both directions. With nothing recorded it said "3 more
 * recordings", where "more" is more than a nothing nobody had done. And it
 * finished every version of the sentence with "Two sessions is not a trend",
 * which is a reason that only applies if you have two, so somebody with none
 * was told about sessions they had never made.
 *
 * Worse, a session can be recorded and still not be plottable: a delivery with
 * under seven seconds of actual speech is `reliable: false`, and one whose
 * course has no slug has nowhere for its bar to link to. Both are dropped
 * before this component sees them. Given only the survivors, a person with six
 * recordings and no usable rate was told to go and record three, forever. So
 * the total is passed in as well, and the panel says which of the three
 * situations it is actually in.
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
        className="font-semibold text-[0.95rem] text-strong tracking-[-0.01em]"
      >
        Your pace
      </h2>
      {baselineWpm && (
        <p className="text-[0.82rem] text-subtle">
          Baseline{" "}
          <span className="font-mono text-strong tabular-nums">
            {baselineWpm}
          </span>{" "}
          wpm
        </p>
      )}
    </div>
  );
}

export function PacePanel({
  sessions,
  baselineWpm,
  recorded,
}: {
  /** Oldest first, so the chart reads left to right in time. */
  sessions: PaceSession[];
  baselineWpm: number | null;
  /** Every session on the account, including the ones that cannot be plotted. */
  recorded: number;
}) {
  if (!baselineWpm || sessions.length < MINIMUM_SESSIONS) {
    const remaining = MINIMUM_SESSIONS - sessions.length;
    // Recorded, but nothing usable came back from them.
    const unusable = recorded - sessions.length;
    return (
      <Panel>
        <Heading baselineWpm={baselineWpm} />
        {/* Three marks standing in for the three bars, so the shape of what is
            coming is visible before there is anything to plot. */}
        <div className="mt-6 flex flex-col gap-5 lg:flex-row lg:items-center lg:gap-9">
          <div
            aria-hidden
            className="flex h-24 w-full items-end gap-2 opacity-60 sm:h-28 lg:max-w-[26rem]"
          >
            {[0.55, 0.8, 0.42].map((h, i) => (
              <span
                key={h}
                className="flex-1 rounded-t-[4px] border-border border-x border-t border-dashed"
                style={{
                  height: `${h * 100}%`,
                  // Only the ones already recorded are filled in.
                  background:
                    i < sessions.length ? "var(--surface)" : undefined,
                }}
              />
            ))}
          </div>
          <p className="text-[0.88rem] text-subtle leading-relaxed lg:flex-1">
            {!baselineWpm ? (
              "Your speaking pace is measured on your first recording, then charted here against it."
            ) : sessions.length === 0 && unusable > 0 ? (
              /* Says what is true — no rate came back — rather than why, because
               there is more than one reason a session is not plottable and this
               component cannot tell them apart. Naming the seven-second floor
               gives the likeliest one without asserting it. */
              <>
                No pace measured from your{" "}
                {unusable === 1 ? "recording" : `${unusable} recordings`} yet. A
                take needs about seven seconds of speech, with the pauses taken
                out.
              </>
            ) : recorded === 0 ? (
              "Three recordings and your pace is charted here against your baseline."
            ) : (
              `${remaining} more ${remaining === 1 ? "recording" : "recordings"} and your pace is charted here against your baseline.`
            )}
          </p>
        </div>
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
      <div className="mt-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:gap-9">
        <div className="w-full lg:max-w-[26rem]">
          <div className="relative flex h-24 items-end gap-2 sm:h-28">
            {sessions.map((session) => {
              const over = session.wpm > baselineWpm * RACING;
              return (
                <Link
                  key={session.id}
                  href={session.href}
                  aria-label={`${session.topic}, ${session.wpm} words per minute — open this session's gap report`}
                  className="press group flex flex-1 items-end justify-center self-stretch rounded-t-[4px] focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2"
                >
                  {/* The bar is inside the link rather than being it, so the
                  whole column height is clickable — a 40 wpm bar is a
                  thirty-pixel target otherwise, and the short bars are the
                  ones worth reading about. */}
                  {/* Three fifths of the column, not all of it. Five full-width
                  slabs shoulder to shoulder read as a wall of ink with slots
                  cut into it; the same five at bar width read as a chart. The
                  whole column stays the click target either way. */}
                  <span
                    className="w-[58%] min-w-5 rounded-t-[4px] transition-[filter,transform] duration-200 ease-out group-hover:brightness-110 group-focus-visible:brightness-110"
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
              <div key={session.id} className="min-w-0 flex-1 text-center">
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
        </div>

        <p className="border-border border-t pt-3 text-[0.88rem] text-subtle leading-relaxed lg:flex-1 lg:border-t-0 lg:pt-0">
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
      </div>
    </Panel>
  );
}
