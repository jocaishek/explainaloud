"use client";

import { useEffect, useState } from "react";
import { useInView } from "~/hooks/use-in-view";
import { cn } from "~/lib/utils";

/**
 * The hero's product panel: one take, marked, and the point it never reached.
 *
 * Four versions of this have now been thrown away and the reasons are worth
 * keeping, because each one failed differently and the fourth failure is the
 * one that explains this file.
 *
 * 1. **An app window.** A mic button with a pulsing ring, a twelve-bar
 *    waveform, a running clock, three checklist rows. That is a picture of *a
 *    recorder*, which is the least interesting true thing about this product,
 *    and it carried every tell: chrome around content, a fake timestamp, an
 *    icon in a circle, decoration moving forever while explaining nothing.
 *
 * 2. **A sentence typing itself**, with the unsaid words greyed out ahead of
 *    it and the line riding a sine curve. Ghosted text means two weights and
 *    two colours on one line with a ragged edge down the middle; the curve
 *    means no two words share a baseline; and a paragraph that fills, holds
 *    and empties is not continuous, it is a thing that keeps starting over in
 *    the corner of your eye.
 *
 * 3. **A running caption line.** Words arriving at speaking pace, the line
 *    sliding left to keep up, verdicts landing a beat behind. It solved the
 *    ragged edge and the reset, and it was still wrong, in two ways that only
 *    a reader notices. A line that moves cannot be read — the pace had already
 *    been dropped from 315 words a minute to 176 to make it survivable, which
 *    is a fix for a problem the format creates. And, fatally: **it could never
 *    show a miss.** The headline above it promises *See what you missed*, and
 *    a stream of what somebody said is structurally incapable of showing the
 *    thing they did not. The panel spent its whole loop demonstrating the
 *    least interesting half of the product.
 *
 * So this one holds still and shows the gap. A take, marked the way the app
 * marks it, and beside it the point that never turns up — which is the
 * sentence the headline is making, rendered rather than described.
 *
 * It is the app's own light surface, floating on the hero's night field, and
 * that is not only for contrast. `design.md`: a marked transcript may not sit
 * on a saturated ground, because green, red and tan have to keep meaning
 * *correct*, *missed* and *vague*. Every section that marks anything takes a
 * light ground. This one marks, so it takes one.
 *
 * The only motion is an arrival: the marks draw themselves once, in the order
 * a grader would reach them, and then it is a still picture. Nothing loops.
 */

/** The take, split so a verdict covers the span it belongs to. */
const TAKE: Array<{ text: string; mark?: "ok" | "vague" }> = [
  { text: "Okay so, water crosses the membrane " },
  { text: "from the dilute side to the concentrated side", mark: "ok" },
  { text: ", and it keeps going until " },
  { text: "the two sides sort of balance out", mark: "vague" },
  { text: "." },
];

/**
 * When each mark lands, in milliseconds after the panel arrives.
 *
 * Spaced by roughly a beat rather than staggered tightly: these are two
 * separate judgements about two separate clauses, and firing them together
 * reads as a page loading rather than as work being done.
 */
const LEGEND = [
  { token: "ok", label: "Specific enough to check" },
  { token: "vague", label: "Said, but hedged" },
] as const;

const MARK_DELAY = [180, 900];

/**
 * What the take never reached.
 *
 * Two, not one, because the old copy promised "a list of the things you did
 * not say" and one item is not a list — and because both of these are real
 * gaps in the sentence above rather than filler: it never names what actually
 * drives the direction, and it never says the membrane has to be selective,
 * without which none of the rest is osmosis.
 */
const MISSED = [
  "Water potential, not concentration, is what sets the direction.",
  "The membrane has to be partially permeable for any of it to count.",
];

const MISS_DELAY = 1620;
const MISS_STAGGER = 260;

export function HeroTake() {
  const { ref, visible } = useInView<HTMLDivElement>();
  const [lit, setLit] = useState(false);

  /* One flag, and the stagger is a CSS `animation-delay` per element rather
     than a timer per element — CSS keeps running off the main thread while
     the WebGL field behind this is drawing.

     A keyframe rather than a transition, and that choice is load-bearing:
     the *resting* state of a mark is marked. If this observer never fires —
     a background tab, an occluded window, JavaScript that failed — the panel
     is simply a still picture of the finished thing. The arrival only ever
     adds motion; it can never be the reason something is missing, which is
     the mistake the streak flame made once already. */
  useEffect(() => {
    if (!visible) return;
    const timer = window.setTimeout(() => setLit(true), 60);
    return () => window.clearTimeout(timer);
  }, [visible]);

  let markIndex = -1;

  return (
    <div ref={ref} className="lp-take rounded-[20px] bg-card text-strong">
      <div className="flex items-baseline justify-between gap-4 border-border border-b px-6 py-4 md:px-8">
        <p className="font-semibold text-[0.95rem] tracking-[-0.01em]">
          Osmosis
        </p>
        {/* Mono, because a duration is a timecode and that is what the voice
            is reserved for. */}
        <p className="font-mono text-[0.7rem] text-muted-foreground tracking-[0.08em]">
          3:04
        </p>
      </div>

      <div className="grid md:grid-cols-[1.4fr_1fr]">
        <blockquote className="px-6 py-6 md:px-8 md:py-7">
          <p className="font-display text-[clamp(1.1rem,1.9vw,1.5rem)] leading-[1.45] tracking-[-0.02em]">
            {TAKE.map((part) => {
              if (!part.mark) return part.text;
              markIndex += 1;
              return (
                <span
                  key={part.text}
                  className="lp-mark"
                  data-mark={part.mark}
                  data-lit={lit}
                  style={{ animationDelay: `${MARK_DELAY[markIndex]}ms` }}
                >
                  {part.text}
                </span>
              );
            })}
          </p>
          {/* What the two colours mean, named once and in the body face.
              This used to be a row of tracked mono capitals, which `design.md`
              reserves for metadata and timecodes — a word that names a thing a
              reader is reading is not a timecode. */}
          <ul className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-[0.85rem] text-muted-foreground">
            {LEGEND.map((entry) => (
              <li key={entry.label} className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="size-1.5 rounded-pill"
                  style={{ background: `var(--${entry.token})` }}
                />
                {entry.label}
              </li>
            ))}
          </ul>
        </blockquote>

        {/* The point of the whole panel, and the reason it replaced a ticker:
            this is the half a stream of what somebody said can never contain. */}
        <div className="lp-take-gap border-border border-t px-6 py-6 md:border-t-0 md:border-l md:px-8 md:py-7">
          <p className="font-semibold text-[0.95rem] tracking-[-0.01em]">
            You never said
          </p>
          <ul className="mt-4 flex flex-col gap-3">
            {MISSED.map((point, index) => (
              <li
                key={point}
                className={cn(
                  "lp-miss text-[0.98rem] leading-relaxed",
                  lit && "is-lit",
                )}
                style={{
                  animationDelay: `${MISS_DELAY + index * MISS_STAGGER}ms`,
                }}
              >
                {point}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
