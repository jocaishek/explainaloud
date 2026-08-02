"use client";

import { useEffect, useRef, useState } from "react";
import { useMediaQuery } from "~/hooks/use-media-query";
import { cn } from "~/lib/utils";

/**
 * Three numbers, at the size the page takes them seriously.
 *
 * The dashboard opened with a greeting and then went straight to a grid of
 * tiles, which meant the first thing anyone saw about their own work was a
 * list of things still to do. These are the three facts worth leading with —
 * how much you have explained, how fast you talk, how much material you are
 * carrying — and they are set large enough to be read from the doorway.
 *
 * Ruled, not carded. Three panels here would be three boxes competing with the
 * three action cards directly above them; hairlines between columns say "these
 * belong together" without drawing another edge on the page.
 *
 * The figures count up when the rail arrives. That is not decoration: a number
 * that lands by counting reads as measured, and it makes the eye follow the
 * digits rather than skip a row of static stats it has already dismissed as
 * furniture. It runs once, it is under a second, and it does not run at all
 * under `prefers-reduced-motion`.
 */

/** How long the count takes. Long enough to see, short enough not to wait. */
const COUNT_MS = 900;

export type Stat = {
  label: string;
  value: number;
  /** Rendered after the number, at label size. */
  unit?: string;
  /** Shown instead of the number when there is nothing measured yet. */
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

export function StatRail({
  stats,
  tone = "light",
}: {
  stats: Stat[];
  /**
   * `dark` is the masthead band. It is not a theme — the rail is not
   * re-coloured, it is the same rail with its ink and its rules inverted, so
   * the two tones cannot drift into being two components.
   */
  tone?: "light" | "dark";
}) {
  const dark = tone === "dark";
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);

  /* Counts start when the rail is actually on screen, not on mount. On a short
     window it is below the fold, and a count that finished while nobody was
     looking is worse than no count — the numbers just appear, and the effect
     reads as a bug the one time somebody scrolls fast enough to catch it. */
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
      className={cn(
        "grid grid-cols-1 sm:grid-cols-3 sm:divide-x sm:divide-y-0",
        dark
          ? "divide-y divide-white/12 border-white/12 border-t"
          : "divide-y divide-border border-border border-y",
      )}
    >
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="flex flex-col gap-1 py-6 sm:px-6 sm:first:pl-0 sm:last:pr-0"
        >
          <span
            className={cn(
              "font-mono text-[0.65rem] uppercase tracking-[0.12em]",
              dark ? "text-white/45" : "text-subtle",
            )}
          >
            {stat.label}
          </span>
          <span className="flex items-baseline gap-1.5">
            {stat.value > 0 || !stat.empty ? (
              <>
                <span
                  className={cn(
                    /* Light, not heavy. The masthead above is the monument;
                       a second block of bold type under it would be two. */
                    "font-medium text-[clamp(2.2rem,5vw,3rem)] leading-none tracking-[-0.045em] tabular-nums",
                    dark ? "text-white" : "text-strong",
                  )}
                >
                  <CountUp value={stat.value} run={seen} />
                </span>
                {stat.unit && (
                  <span
                    className={cn(
                      "font-medium text-[0.8rem]",
                      dark ? "text-white/55" : "text-subtle",
                    )}
                  >
                    {stat.unit}
                  </span>
                )}
              </>
            ) : (
              /* Not a zero. A big grey 0 reads as a score, and somebody who
                 has not recorded yet has not scored badly — they have not
                 started. */
              <span
                className={cn(
                  "text-[0.9rem] leading-[2.4]",
                  dark ? "text-white/55" : "text-subtle",
                )}
              >
                {stat.empty}
              </span>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}
