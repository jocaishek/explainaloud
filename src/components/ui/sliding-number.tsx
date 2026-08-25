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
    /* `leading-none` here and on every digit, not only on the root.
     *
     * The window is `h-[1em]` and the digits are positioned by percentages of
     * their own height, so both only line up while the line box is exactly
     * 1em. The root asks for `leading-none` — and loses it: `cn` is
     * tailwind-merge, which puts `text-*` sizes in a `font-size` group that
     * conflicts with `leading`, because a Tailwind font-size utility can
     * carry a line-height. So any caller passing a size, which is every
     * caller, silently strips it and the line box falls back to the
     * inherited 1.5.
     *
     * At 3.5rem that is an 84px line box inside a 56px window: the numeral is
     * centred in the taller box, its foot lands below the window, and the
     * bottom of the glyph is cut off — which reads as a broken typeface
     * rather than a clipping bug. Setting it in here cannot be overridden
     * from a call site, because a call site's classes only reach the root. */
    <span className="relative block h-[1em] w-[1ch] overflow-hidden leading-none">
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
              "absolute inset-x-0 top-0 block text-center leading-none",
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
      /* The leading is set here, in a style attribute, for the same reason
         `Digit` sets its own out of reach of a call site: `cn` is
         tailwind-merge, and a caller's `text-[3.5rem]` conflicts a font-size
         utility with `leading-*` and drops it. A class could not survive
         that; an inline declaration is not in the merge at all.

         It has to survive, because this box is the strip's positioning
         context. At the inherited 1.5 the root is an 84px box around a 56px
         numeral, so the absolutely positioned digits — pinned to its top
         edge — are drawn a half-leading *above* the invisible glyph whose
         baseline the words beside it align to. The number floats clear of
         its own label, which is the one misalignment on "0 days in a row"
         that anybody would notice. */
      style={{ lineHeight: 1 }}
      className={cn("relative inline-block tabular-nums", className)}
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
