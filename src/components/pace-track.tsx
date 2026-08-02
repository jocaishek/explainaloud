"use client";

import { useEffect, useState } from "react";
import { useMediaQuery } from "~/hooks/use-media-query";
import { cn } from "~/lib/utils";

/**
 * Pace across one take — section 04 of the landing page, drawn from a real
 * recording.
 *
 * `DeliverySummary` above it reports a median, and a median cannot show the
 * two things worth seeing in a delivery: that someone raced the opening and
 * then stalled, or that they held one rate the whole way through.
 *
 * This is a deliberate port rather than a chart that happens to resemble one.
 * The landing page promises this exact picture before anybody signs up — bars
 * to scale, the baseline ruled *across* them rather than under them so getting
 * ahead of it reads as a crossing, its value pinned at the right-hand end of
 * the rule, a hover that dims every other bar and puts the number above the
 * one you are on, and a timecode axis underneath. Somebody who arrives here
 * from the landing page should recognise the thing they were shown, down to
 * the amber. A demo that promises one surface and delivers another is a small
 * lie told at the worst possible moment.
 *
 * Two honest differences from the marketing version, both because this one is
 * measured rather than authored:
 *
 * - The axis says what these windows actually are. Section 04 says
 *   "eight-second windows" because its eight bars are a literal array; here
 *   about seventy overlapping ten-second windows are averaged down to sixteen
 *   bars, so claiming a window length would be false precision.
 * - The baseline can be absent. Before a warm-up or a couple of measured
 *   sessions there is nothing to rule across the bars, and the shape of the
 *   delivery is still worth seeing on its own.
 *
 * Descriptive, like the summary above it. No verdict is attached to the shape:
 * a slow stretch only becomes a claim about understanding in `SlowSpotCallout`,
 * where a second, independent signal has to agree with it first.
 */

/** Above this multiple of the baseline, a stretch counts as racing. */
const RACING = 1.15;

/**
 * How much of the take each bar stands for.
 *
 * Ten seconds, matching `RATE_WINDOW_SECONDS` — one bar is one window, and
 * consecutive bars do not overlap.
 *
 * The rates underneath are sampled every 2.5 seconds on purpose: an
 * overlapping stride means a dip cannot fall between windows and go unseen.
 * That is right for *finding* the slow stretch and wrong for drawing one,
 * because four out of every five neighbouring readings share most of their
 * audio. Plotted directly it produced about seventy bars for a three-minute
 * take, each 75% the same speech as the one beside it — a texture rather than
 * a chart, and one that reads as though the pace were being measured every two
 * and a half seconds. It is not; it is measured over ten.
 */
const BAR_SECONDS = 10;

/** Below this there is no shape to look at, only a couple of readings. */
const MINIMUM_WINDOWS = 4;

/** The house ease, the same one the landing page uses. */
const EASE = "cubic-bezier(0.23, 1, 0.32, 1)";

export type PacePoint = { atSeconds: number; wpm: number };

function clock(seconds: number) {
  const total = Math.round(seconds);
  const minutes = Math.floor(total / 60);
  return `${minutes}:${String(total % 60).padStart(2, "0")}`;
}

/**
 * One bar per non-overlapping ten seconds of the take.
 *
 * Each slot takes the reading whose window *starts* in it, so a bar is a real
 * measured window rather than an average of several overlapping ones. Averaging
 * was the previous approach and it flattened exactly the peaks the chart exists
 * to show — a fast ten seconds blended with the four readings straddling it
 * comes back looking ordinary.
 *
 * Slots with no reading are skipped rather than drawn at zero. A gap in the
 * chart means "nothing measurable was said here", which is true and is not the
 * same claim as "they spoke at zero words a minute".
 */
function bucket(points: PacePoint[]): PacePoint[] {
  const out: PacePoint[] = [];
  let slot = -1;
  for (const point of points) {
    const index = Math.floor(point.atSeconds / BAR_SECONDS);
    if (index === slot) continue;
    slot = index;
    out.push({ atSeconds: index * BAR_SECONDS, wpm: point.wpm });
  }
  return out;
}

/** The landing page's mono slug, in the app's tokens. */
function Slug({
  children,
  className,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span
      style={style}
      className={cn(
        "font-mono text-[0.65rem] text-subtle uppercase tracking-[0.09em]",
        className,
      )}
    >
      {children}
    </span>
  );
}

/**
 * Stands in for the chart, quietly.
 *
 * Deliberately not a card and not a warning colour: nothing has gone wrong,
 * and a bordered panel saying "no chart" occupies as much of the page as the
 * chart would have. One paragraph, the same voice as the rest of the report.
 */
function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className="max-w-prose text-[0.82rem] text-subtle leading-6">
      {children}
    </p>
  );
}

export function PaceTrack({
  pace,
  baselineWpm,
}: {
  /**
   * Missing on anything recorded before the window rates were stored, and
   * short on a take that ended before there was a shape to draw. Both are
   * handled here rather than by the caller, so there is one place that knows
   * why a chart is absent and can say so.
   */
  pace: PacePoint[] | null | undefined;
  /** The speaker's own reference. Null before there is one to compare against. */
  baselineWpm: number | null;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");
  /* Bars grow from the floor on arrival, as they do on the landing page. Set
     on the frame after mount so there is an unmarked frame to grow from —
     started synchronously it is finished before the browser has painted. */
  const [grown, setGrown] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(id);
  }, []);

  /* Say why, rather than render nothing.
   *
   * An absent chart is indistinguishable from a broken one: "How you spoke"
   * draws directly above, so the measurement is evidently working, and the
   * picture the landing page promised is just missing. Two different reasons,
   * and the difference matters — one is fixed by recording again, the other
   * by talking for longer. */
  if (!pace) {
    return (
      <Note>
        Pace through the take was not recorded for this session. It is measured
        from word-level timings, which are not kept after a recording is graded,
        so it cannot be filled in afterwards — the chart will be here on your
        next one.
      </Note>
    );
  }

  if (pace.length < MINIMUM_WINDOWS) {
    return (
      <Note>
        This take was too short to chart a pace through. Rate is measured over
        ten-second windows, so a shape needs about twenty seconds of speech. The
        figures above still hold.
      </Note>
    );
  }

  const bars = bucket(pace);
  const last = pace[pace.length - 1];
  const peak = Math.max(...bars.map((p) => p.wpm), baselineWpm ?? 0) * 1.15;
  if (peak <= 0) return null;

  const shown = grown || reduced;

  return (
    <section
      aria-labelledby="pace-track-heading"
      className="flex flex-col gap-5 rounded-card border border-border bg-card p-5 shadow-rest"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2
          id="pace-track-heading"
          className="font-medium text-subtle text-xs uppercase tracking-[0.14em]"
        >
          Pace through the take
        </h2>
        <Slug>{bars.length} windows</Slug>
      </div>

      {/* A label column on the left, where the landing page runs its timecode
          gutter. Fixed rather than `var(--gutter)`, which only exists inside
          the marketing page's own type world. */}
      <div className="grid grid-cols-[2.25rem_1fr] gap-x-3 sm:grid-cols-[3rem_1fr]">
        <Slug className="pt-1">wpm</Slug>
        <div className="min-w-0">
          <div className="relative flex h-[clamp(8rem,22vw,12rem)] items-end gap-[3px]">
            {bars.map((point, i) => {
              const over = baselineWpm
                ? point.wpm > baselineWpm * RACING
                : false;
              return (
                <button
                  type="button"
                  key={point.atSeconds}
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(null)}
                  aria-label={`${clock(point.atSeconds)}: ${point.wpm} words per minute${
                    over ? ", racing" : ""
                  }`}
                  className="relative block flex-1 self-end rounded-t-[4px] focus:outline-none"
                  style={{
                    height: shown ? `${(point.wpm / peak) * 100}%` : "0%",
                    // The reserved amber, meaning what it means everywhere
                    // else: said, but not in a form worth trusting.
                    /* Ink for an ordinary window, the reserved amber for a
                       racing one — the same pairing the landing's chart uses.

                       Two bugs met here. `var(--color-brand)` is a `@theme`
                       variable, and reading one in an inline style resolves
                       it at `:root` rather than against `.register-app` — so
                       this drew the landing's `#f97316` while every utility
                       on the same screen drew the app's amber. And once the
                       app accent moved to gold, brand-against-`--vague` was
                       one hue at two values: an orange bar and a brown one,
                       in a chart whose entire job is that distinction. */
                    background: over ? "var(--vague)" : "var(--foreground)",
                    // Dimming the rest is what makes one bar readable in a row
                    // of sixteen; without it the hover only moves a tooltip.
                    opacity: hover === null || hover === i ? 1 : 0.3,
                    transition: reduced
                      ? "opacity 180ms ease-out"
                      : `height 720ms ${EASE} ${i * 40}ms, opacity 180ms ease-out`,
                  }}
                >
                  <span
                    className={cn(
                      "-translate-x-1/2 absolute bottom-full left-1/2 mb-2 font-mono text-[0.6rem] text-strong tabular-nums transition-opacity duration-150",
                      hover === i ? "opacity-100" : "opacity-0",
                    )}
                  >
                    {point.wpm}
                  </span>
                </button>
              );
            })}

            {baselineWpm && (
              <div
                className="pointer-events-none absolute inset-x-0 border-foreground/50 border-t border-dashed"
                style={{
                  bottom: `${(baselineWpm / peak) * 100}%`,
                  opacity: shown ? 1 : 0,
                  transition: reduced
                    ? undefined
                    : `opacity 500ms ${EASE} 720ms`,
                }}
              >
                {/* Pinned to the rule itself, on an opaque chip, so neither
                    the dashed line nor a bar behind it runs through the
                    words.

                    `bg-surface` is wrong here and was the first attempt:
                    it is a tint meant to be laid over something, so the chip
                    stayed transparent and the bars read straight through the
                    label. `color-mix` was the second, and failed differently —
                    it averages the two colours *including* their alpha,
                    landing on 52% opaque rather than solid.

                    Now that the panel itself is the card colour, the chip can
                    simply be that — but as the `bg-card` *utility*, not as
                    `var(--color-card)` in an inline style. Those are not the
                    same thing: a `@theme` variable read inline resolves at
                    `:root`, so in dark mode the chip came back `#171717`
                    while the panel behind it stayed white, and the label was
                    dark text on a black slab in the middle of the chart. The
                    utility resolves against `.register-app` exactly as the
                    panel's own `bg-card` does, so the two cannot disagree. */}
                <Slug className="absolute right-0 bottom-1.5 bg-card px-2 text-strong">
                  Your baseline {baselineWpm}
                </Slug>
              </div>
            )}
          </div>

          <div className="mt-3 flex items-baseline justify-between gap-3 border-border border-t pt-2">
            <Slug className="tabular-nums">0:00</Slug>
            <Slug className="truncate">
              Ten-second windows, pauses left out
            </Slug>
            <Slug className="tabular-nums">{clock(last?.atSeconds ?? 0)}</Slug>
          </div>
        </div>
      </div>
    </section>
  );
}
