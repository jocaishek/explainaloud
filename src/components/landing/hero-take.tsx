"use client";

import { Check, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useInView } from "~/hooks/use-in-view";
import { cn } from "~/lib/utils";

/**
 * The hero's panel: a checklist filling in, and the one line that never does.
 *
 * Five versions of this have now been thrown away. The first four were an app
 * window, a sentence typing itself, a running caption line, and a marked
 * transcript beside a list of gaps — and the last two failed for the same
 * reason, which took until the fifth to see.
 *
 * **They all needed reading before they could be understood.** A marked
 * transcript is the product's real output and it is genuinely good, and it
 * asks somebody three seconds into their first visit to parse a sentence
 * about osmosis, work out why one clause is green and another amber, and only
 * then infer what the product does. The honest reaction to that is "why is
 * there a biology paragraph on this page". It was also, quietly, a smaller
 * and worse copy of the live demo one scroll below, which does the same job
 * interactively and lets you switch the subject.
 *
 * A checklist needs none of that. Three ticks and a cross is understood
 * before a single word of it is read: *these are the things you were meant to
 * say, and that one never turned up*. The words are then a bonus rather than
 * a prerequisite.
 *
 * The subject is photosynthesis on purpose, and the missed point is the one
 * most people get wrong — the oxygen comes from the water, not the carbon
 * dioxide. So the reader does not merely watch somebody else's gap being
 * found; there is a decent chance it is theirs, and the product makes its
 * argument on them rather than at them.
 */
type Point = { text: string; said: boolean };

const POINTS: Point[] = [
  { text: "Plants use light to make their own food", said: true },
  { text: "They take in carbon dioxide and water", said: true },
  { text: "They give off oxygen", said: true },
  { text: "The oxygen comes from the water, not the CO₂", said: false },
];

/** A beat between rows: fast enough to feel like one gesture, slow enough to
 *  count. The cross gets a longer pause in front of it, because the pause is
 *  what makes it land. */
const ROW_MS = 260;
const MISS_PAUSE = 420;

export function HeroTake() {
  const { ref, visible } = useInView<HTMLDivElement>();
  const [lit, setLit] = useState(false);

  /* One flag; the stagger is a CSS `animation-delay` per row rather than a
     timer per row, so it keeps running off the main thread while the WebGL
     field behind it is drawing.

     A keyframe rather than a transition, and that choice is load-bearing: the
     *resting* state of every row is its final one. If this observer never
     fires — a background tab, an occluded window, a script that failed — the
     panel is simply a still picture of the finished list. The arrival only
     ever adds motion; it can never be the reason something is missing, which
     is the mistake the streak flame made once already. */
  useEffect(() => {
    if (!visible) return;
    const timer = window.setTimeout(() => setLit(true), 80);
    return () => window.clearTimeout(timer);
  }, [visible]);

  return (
    <div
      ref={ref}
      className="lp-take rounded-[20px] bg-card px-6 py-6 text-strong md:px-9 md:py-7"
    >
      <p className="text-[1rem] text-muted-foreground">
        <span className="font-semibold text-strong">Three minutes</span> on
        photosynthesis, out loud, no notes.
      </p>

      <ul className="mt-6 flex flex-col gap-4">
        {POINTS.map((point, index) => (
          <li
            key={point.text}
            className={cn(
              "lp-point",
              lit && "is-lit",
              !point.said && "is-miss",
            )}
            style={{
              animationDelay: `${index * ROW_MS + (point.said ? 0 : MISS_PAUSE)}ms`,
            }}
          >
            <span aria-hidden="true" className="lp-point-icon">
              {point.said ? (
                <Check className="size-full" strokeWidth={3} />
              ) : (
                <X className="size-full" strokeWidth={3} />
              )}
            </span>
            <span className="lp-point-text">{point.text}</span>
            {/* The status in words, on every row, always.
                Green-versus-red and a tick-versus-cross are both invisible to
                a screen reader — the icons are decorative and the colour is
                colour — so without this the four rows read as four identical
                statements and the entire point of the panel is lost. The
                visible tag is the same sentence for everybody else, and it is
                `aria-hidden` so the miss is not announced twice. */}
            <span className="sr-only">
              {point.said ? "— said" : "— never said"}
            </span>
            {!point.said && (
              <span aria-hidden="true" className="lp-point-tag">
                You never said this
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
