"use client";

import { useEffect, useRef, useState } from "react";
import { useMediaQuery } from "~/hooks/use-media-query";
import { cn } from "~/lib/utils";

/**
 * Three numbers, at the size the page takes them seriously.
 *
 * These are the three facts worth leading with — how much you have explained,
 * how fast you talk, how much material you are carrying — and each one carries
 * a line saying what it counts. A dashboard figure without that line is a
 * number somebody has to work out, and working out your own dashboard is the
 * definition of one that is not clear.
 *
 * One panel of three columns, not three panels. Three separate cards put three
 * borders and three shadows across the top of the screen for what is a single
 * idea — where you stand — and the eye counts the boxes before it reads the
 * numbers. Divided columns inside one surface say the same three things with a
 * third of the drawing, which is most of what "cleaner" means here.
 *
 * The figures count up when they arrive. That is not decoration: a number that
 * lands by counting reads as measured, and it makes the eye follow the digits
 * rather than skip a row of static stats it has already dismissed as furniture.
 * It runs once, it is under a second, and it does not run at all under
 * `prefers-reduced-motion`.
 */

/** How long the count takes. Long enough to see, short enough not to wait. */
const COUNT_MS = 900;

export type Stat = {
  label: string;
  value: number;
  /** Rendered after the number, at label size. */
  unit?: string;
  /** What the figure counts. Always shown when there is a figure. */
  caption: string;
  /** Replaces the caption when there is nothing measured yet. */
  empty?: string;
};

/* The same curve as `--ease-enter`, in JavaScript, because a count driven by a
   linear ramp arrives at a constant speed and reads as a spinning odometer.
   Most of the distance in the first third, then a long settle. */
function eased(t: number) {
  return 1 - (1 - t) ** 3;
}

function CountUp({ value, run }: { value: number; run: boolean }) {
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");
  const [shown, setShown] = useState(0);
  const done = useRef(false);

  useEffect(() => {
    if (!run || done.current) return;
    done.current = true;
    if (reduced) {
      setShown(value);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / COUNT_MS);
      setShown(Math.round(eased(t) * value));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [run, value, reduced]);

  return <>{shown}</>;
}

export function StatCards({ stats }: { stats: Stat[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);

  /* Counts start when the cards are actually on screen, not on mount. On a
     short window they are below the fold, and a count that finished while
     nobody was looking is worse than no count — the numbers just appear, and
     the effect reads as a bug the one time somebody scrolls fast enough to
     catch it. */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      data-rise=""
      className="grid grid-cols-1 divide-y divide-border overflow-hidden rounded-card border border-border bg-card shadow-rest sm:grid-cols-3 sm:divide-x sm:divide-y-0"
    >
      {stats.map((stat) => {
        const measured = stat.value > 0 || !stat.empty;
        return (
          <div key={stat.label} className="p-5">
            <p className="font-mono text-[0.6rem] text-subtle uppercase tracking-[0.14em]">
              {stat.label}
            </p>
            {/* One row, one height, whether or not there is a figure in it —
                three cards whose baselines disagree is half of what makes a
                row look unconsidered. */}
            <p className="mt-2.5 flex h-9 items-baseline gap-1.5">
              <span
                className={cn(
                  "font-medium text-[2.1rem] leading-none tracking-[-0.045em] tabular-nums",
                  measured ? "text-strong" : "text-border",
                )}
              >
                {/* Not a zero. A big grey 0 reads as a score, and somebody who
                    has not recorded yet has not scored badly — they have not
                    started. */}
                {measured ? <CountUp value={stat.value} run={seen} /> : "—"}
              </span>
              {measured && stat.unit && (
                <span className="font-medium text-[0.8rem] text-subtle">
                  {stat.unit}
                </span>
              )}
            </p>
            <p className="mt-2 text-[0.82rem] text-subtle leading-relaxed">
              {measured ? stat.caption : stat.empty}
            </p>
          </div>
        );
      })}
    </div>
  );
}
