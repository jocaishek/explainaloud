"use client";

import { cn } from "~/lib/utils";

/**
 * An odometer: each digit rolls to its new value instead of being replaced.
 *
 * Ported from Motion Primitives' `SlidingNumber`, with two deliberate changes.
 *
 * **It is not a spring.** The original animates each digit with
 * `useSpring({ stiffness: 280, damping: 18 })`, and `design.md` bans spring
 * and overshoot easing outright. A digit that overshoots and settles reads as
 * a slot machine, which is the wrong feeling for a number somebody earned by
 * turning up. The house `--ease-enter` curve covers most of the distance
 * early and then settles, so the digit arrives rather than bounces.
 *
 * **It is CSS, not JavaScript.** The original renders ten `motion.span`s per
 * digit, measures each with `react-use-measure`, and drives the transform from
 * a `MotionValue` on every frame. That is a dependency this project does not
 * have and a main-thread animation for something that is one `transform` per
 * digit. A transition on a custom property does the same job off the main
 * thread, keeps working while the tab is busy, and needs no measurement — the
 * strip is laid out in `em`, so it is correct at any font size.
 *
 * ## The shortest-path trick, which is the whole component
 *
 * Ten digits sit stacked in a 1em window, one visible. Given the digit
 * currently shown, each of the ten is placed at `(10 + n - value) % 10`
 * windows below it, and anything landing more than five windows away is
 * re-placed ten windows the other side. So 9 → 0 rolls forward through one
 * window rather than backwards through eight, which is what an odometer does
 * and what makes the motion legible at a glance.
 */
const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

function Digit({ digit }: { digit: number }) {
  return (
    <span className="relative block h-[1em] w-[1ch] overflow-hidden">
      {DIGITS.map((n) => {
        const raw = (10 + n - digit) % 10;
        const offset = raw > 5 ? raw - 10 : raw;
        return (
          <span
            key={n}
            className={cn(
              // Placed on the line, not centred in the box. Centring a glyph
              // inside a 1em window puts it a few pixels above where the same
              // glyph would sit in normal flow, so the strip drifts off the
              // baseline of the words beside it — which on "5 days in a row"
              // is the one alignment anybody would notice.
              "absolute inset-x-0 top-0 block text-center",
              // The wrap-around placements are the ones that would otherwise
              // be seen travelling the long way across the window. They are
              // out of sight either way, so they are moved without a
              // transition and only the near neighbours animate.
              Math.abs(offset) <= 1
                ? "transition-transform duration-[420ms] ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none"
                : "",
            )}
            style={{ transform: `translateY(${offset * 100}%)` }}
          >
            {n}
          </span>
        );
      })}
    </span>
  );
}

/**
 * `value` is announced as plain text to a screen reader; the rolling strip is
 * decoration over it. Reading ten digits per column aloud is not a number.
 */
export function SlidingNumber({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const text = Math.trunc(Math.abs(value)).toString();
  /* Carried as { digit, place } rather than mapped over with an index,
     because the place value is the column's identity: at 9 → 10 the number
     grows a column, and keying from the left would hand the units column's
     state to the tens. */
  const columns = text.split("").map((character, index) => ({
    digit: Number(character),
    place: text.length - index,
  }));

  return (
    <span
      className={cn(
        "relative inline-block leading-none tabular-nums",
        className,
      )}
    >
      {/* In normal flow, so the strip inherits a real baseline and a real
          width. Everything animated is absolutely positioned over it — an
          `overflow: hidden` box takes its baseline from its bottom margin
          edge, which would sit this number a descender below the words next
          to it. */}
      <span aria-hidden="true" className="invisible">
        {text}
      </span>
      <span aria-hidden="true" className="absolute inset-0 flex">
        {columns.map((column) => (
          <Digit key={column.place} digit={column.digit} />
        ))}
      </span>
      <span className="sr-only">{value}</span>
    </span>
  );
}
