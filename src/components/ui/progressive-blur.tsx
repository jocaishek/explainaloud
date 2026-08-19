"use client";

import { cn } from "~/lib/utils";

const ANGLES = { top: 0, right: 90, bottom: 180, left: 270 } as const;

/**
 * A graded blur along one edge of a scrolling region: sharp where the content
 * is readable, progressively softer towards the edge it runs off.
 *
 * From Motion Primitives' `ProgressiveBlur`. A single `backdrop-filter` with a
 * mask gives a blur that is either on or off with a visible seam where the
 * mask crosses 50%; stacking several, each masked to an overlapping band and
 * each one step blurrier, ramps it instead. Eight layers is the point where
 * adding more stops being visible.
 *
 * `design.md` bans `backdrop-filter` as decoration and allows it for "a bar
 * floating over scrolling content", which is the whole of this: it exists to
 * say *there is more this way*, and only on the edge where that is true. It
 * has no business on anything that does not scroll.
 *
 * The original is a `motion.div` per layer, for props it never passes. These
 * are plain divs — nothing here animates.
 */
export function ProgressiveBlur({
  direction = "right",
  layers = 8,
  intensity = 0.4,
  className,
}: {
  direction?: keyof typeof ANGLES;
  layers?: number;
  intensity?: number;
  className?: string;
}) {
  const count = Math.max(layers, 2);
  const segment = 1 / (count + 1);
  const steps = Array.from({ length: count }, (_, index) => index);

  return (
    <div aria-hidden="true" className={cn("relative", className)}>
      {steps.map((index) => {
        const stops = [index, index + 1, index + 2, index + 3]
          .map((step, position) => {
            const opaque = position === 1 || position === 2;
            return `rgba(255,255,255,${opaque ? 1 : 0}) ${step * segment * 100}%`;
          })
          .join(", ");
        const mask = `linear-gradient(${ANGLES[direction]}deg, ${stops})`;

        return (
          <div
            key={index}
            className="pointer-events-none absolute inset-0"
            style={{
              maskImage: mask,
              WebkitMaskImage: mask,
              backdropFilter: `blur(${index * intensity}px)`,
              WebkitBackdropFilter: `blur(${index * intensity}px)`,
            }}
          />
        );
      })}
    </div>
  );
}
