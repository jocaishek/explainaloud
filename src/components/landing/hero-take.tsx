"use client";

import { ArrowRight, Check, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useInView } from "~/hooks/use-in-view";
import { cn } from "~/lib/utils";

/**
 * The hero's product panel: a gap report, which is the thing this makes.
 *
 * Six versions now, and the ones that failed are worth keeping because they
 * failed in two distinct ways.
 *
 * **They needed reading before they could be understood.** An app window, a
 * sentence typing itself, a running caption line, a marked transcript beside a
 * list of gaps. The transcript was the best of them and still asked somebody
 * three seconds into their first visit to parse a sentence about osmosis and
 * work out why one clause was green and another amber before knowing what the
 * product does. Three ticks and a cross is understood before a word of it is
 * read.
 *
 * **And then it read as a card rather than as software.** A checklist in a
 * white rounded rectangle is a feature list; every landing page has one. What
 * makes a tool look like a tool is structure — a thing with a header, a body
 * and a footer is a screen somebody uses, and that is the claim being made.
 * So this is the gap report as the app would render it: what it is and what it
 * is of, the points, and the one line that says what to do next.
 *
 * Photosynthesis, and the missed point is the one most people get wrong — the
 * oxygen comes from the water, not the carbon dioxide. So the reader is not
 * only watching a stranger's gap being found. There is a fair chance it is
 * theirs, which is the argument landing on them rather than at them.
 */
type Point = { text: string; said: boolean };

const POINTS: Point[] = [
  { text: "Plants use light to make food", said: true },
  { text: "They take in carbon dioxide", said: true },
  { text: "They give off oxygen", said: true },
  { text: "The oxygen comes from water, not CO₂", said: false },
];

/** A beat between rows, and a longer one before the cross — the pause is what
 *  makes it land. */
const ROW_MS = 240;
const MISS_PAUSE = 460;

export function HeroTake() {
  const { ref, visible } = useInView<HTMLDivElement>();
  const [lit, setLit] = useState(false);

  /* One flag; the stagger is a CSS `animation-delay` per row rather than a
     timer per row, so it keeps running off the main thread while the WebGL
     field behind it draws.

     A keyframe rather than a transition, and that is load-bearing: every
     row's *resting* state is its finished one. If this observer never fires —
     background tab, occluded window, a script that failed — the panel is a
     still picture of the completed report rather than four blank lines. The
     arrival only ever adds motion. The streak flame learned this once
     already. */
  useEffect(() => {
    if (!visible) return;
    const timer = window.setTimeout(() => setLit(true), 80);
    return () => window.clearTimeout(timer);
  }, [visible]);

  const missIndex = POINTS.findIndex((point) => !point.said);

  return (
    <div
      ref={ref}
      /* Square, because the whole page is. `--r-card` is 0 outside the app,
         and every button, field and rule on this screen is a hard edge — a
         20px radius made the one white object read as a card dropped onto the
         layout instead of a panel belonging to it. */
      className="lp-take w-full bg-card text-strong"
    >
      <div className="flex items-baseline justify-between gap-4 border-border border-b px-6 py-4 md:px-7">
        <p className="font-semibold text-[0.95rem] tracking-[-0.01em]">
          Gap report
        </p>
        {/* Mono for the timecode, which is what the voice is reserved for. */}
        <p className="text-[0.82rem] text-muted-foreground">
          Photosynthesis{" "}
          <span className="font-mono text-[0.75rem] tracking-[0.06em]">
            3:04
          </span>
        </p>
      </div>

      <ul className="flex flex-col px-6 py-5 md:px-7 md:py-6">
        {POINTS.map((point, index) => (
          <li
            key={point.text}
            className={cn(
              "lp-point",
              lit && "is-lit",
              !point.said && "is-miss",
            )}
            style={{
              animationDelay: `${index * ROW_MS + (index >= missIndex ? MISS_PAUSE : 0)}ms`,
            }}
          >
            <span aria-hidden="true" className="lp-point-icon">
              {point.said ? (
                <Check className="size-full" strokeWidth={3} />
              ) : (
                <X className="size-full" strokeWidth={3} />
              )}
            </span>
            <span>{point.text}</span>
            {/* The status in words on every row, always. A tick, a cross and a
                colour are all invisible to a screen reader, and without this
                the four rows read as four identical statements. */}
            <span className="sr-only">
              {point.said ? ", said" : ", never said"}
            </span>
          </li>
        ))}
      </ul>

      {/* The loop, which is the product. A report that only tells you what you
          got wrong is a mark; this one exists so you go again. */}
      <p className="flex items-center gap-2 border-border border-t px-6 py-4 text-[0.9rem] text-muted-foreground md:px-7">
        <ArrowRight aria-hidden className="size-4 shrink-0" />
        Say it again, and watch that line turn green.
      </p>
    </div>
  );
}
