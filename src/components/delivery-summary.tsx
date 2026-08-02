import { cn } from "~/lib/utils";

/**
 * Pace, shown next to the score at the top of the gap report.
 *
 * Deliberately descriptive. It reports the two numbers and their difference and
 * stops there: no verdict about whether the person understood anything, because
 * a pace figure on its own cannot support one. Careful speakers are slow.
 * Speakers of English as a second language are slow. Someone reading from notes
 * is fast and knows nothing. The interpretation only becomes defensible when it
 * lines up with something the grader found independently, which is what
 * `SlowSpotCallout` handles.
 *
 * With no baseline yet, the session figure still shows. "You spoke at 140 words
 * a minute" is a true and mildly interesting fact on its own, and showing it
 * unaccompanied is also the most honest nudge toward recording the warm-up.
 */
export function DeliverySummary({
  wpm,
  usualWpm,
  recordingsSoFar,
}: {
  wpm: number;
  /**
   * The speaker's own reference: the warm-up if they did it, otherwise an
   * average over their past sessions. Null until there is enough to average.
   */
  usualWpm: number | null;
  /** Sessions with usable metrics, including this one. Drives the N/A copy. */
  recordingsSoFar: number;
}) {
  // Whole percentage points. A "3% slower" reads as precision the underlying
  // measurement does not have.
  const deltaPercent =
    usualWpm && usualWpm > 0
      ? Math.round(((wpm - usualWpm) / usualWpm) * 100)
      : null;

  // Inside this band the two numbers are the same number as far as anyone
  // should care, and saying "4% faster" invites reading meaning into noise.
  const notablyDifferent =
    deltaPercent !== null && Math.abs(deltaPercent) >= 15;

  // How many more sessions before an average is worth showing. One recording
  // is not an average of anything, and calling it "your usual" would let the
  // very first session define the person forever.
  const remaining = Math.max(0, 2 - recordingsSoFar);

  return (
    <section
      aria-labelledby="delivery-heading"
      className="flex flex-col gap-3 rounded-card border border-border bg-card p-5 shadow-rest"
    >
      <h2
        id="delivery-heading"
        className="text-xs font-medium tracking-[0.14em] text-subtle uppercase"
      >
        How you spoke
      </h2>

      <div className="flex flex-wrap items-baseline gap-x-8 gap-y-3">
        <Figure label="This explanation" value={wpm} />
        {usualWpm ? (
          <Figure label="Your usual" value={usualWpm} muted />
        ) : (
          <div>
            <p className="text-xs text-subtle">Your usual</p>
            <p className="mt-0.5 font-mono text-2xl font-semibold text-subtle tabular-nums">
              N/A
            </p>
          </div>
        )}
      </div>

      {!usualWpm && (
        <p className="max-w-md text-xs leading-5 text-subtle">
          {remaining > 0
            ? `One more recording and we can show your average here. Or do the 30-second warm-up in Settings to get it straight away.`
            : `We'll show your average here once a couple of sessions have enough clear speech to measure.`}
        </p>
      )}

      {notablyDifferent && deltaPercent !== null && (
        <p className="text-sm leading-6 text-subtle">
          That is{" "}
          <span
            className={cn(
              "font-medium",
              deltaPercent < 0 ? "text-amber-500" : "text-strong",
            )}
          >
            {Math.abs(deltaPercent)}% {deltaPercent < 0 ? "slower" : "faster"}
          </span>{" "}
          than usual.{" "}
          {deltaPercent < 0
            ? "Slowing down often means recall is taking effort, though some topics simply need more thinking."
            : "Speaking faster than usual is common when material is familiar."}
        </p>
      )}
    </section>
  );
}

function Figure({
  label,
  value,
  muted,
}: {
  label: string;
  value: number;
  muted?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-subtle">{label}</p>
      <p
        className={cn(
          "mt-0.5 font-mono text-2xl font-semibold tabular-nums",
          muted ? "text-subtle" : "text-strong",
        )}
      >
        {value}
        <span className="ml-1.5 font-sans text-xs font-normal text-subtle">
          words/min
        </span>
      </p>
    </div>
  );
}

/**
 * The one place a pace figure is allowed to become a claim about understanding.
 *
 * Shown only when the slowest stretch of speech overlaps a weakness the grader
 * found on its own. Two independent signals agreeing is evidence; either alone
 * is a horoscope, and the cost of being wrong here is telling someone who knows
 * the material that they do not.
 */
export function SlowSpotCallout({
  text,
  wpm,
  baselineWpm,
}: {
  text: string;
  wpm: number;
  baselineWpm: number;
}) {
  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-4">
      <p className="text-sm font-semibold text-strong">
        You slowed down right here
      </p>
      <p className="mt-2 text-sm leading-6 text-subtle">
        This stretch ran at {wpm} words a minute against your usual{" "}
        {baselineWpm}, and it is also where the explanation was marked weak.
        Worth re-teaching first.
      </p>
      <p className="mt-3 border-l-2 border-amber-500/40 pl-3 text-sm leading-6 text-foreground italic">
        &ldquo;{text}&rdquo;
      </p>
    </div>
  );
}
