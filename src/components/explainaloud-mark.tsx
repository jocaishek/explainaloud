/**
 * The Explainaloud mark: a reversed 3, which reads as an E, with a loop at the
 * waist where the two bowls meet.
 *
 * The loop is drawn the way a loop happens in handwriting — the stroke runs
 * past the junction, curves back, and crosses its own incoming line — rather
 * than as a circle returning to the point it left. A closed circle at the waist
 * reads as a bead threaded onto the letter; a teardrop that crosses reads as
 * one continuous gesture, which is the point: this is a mark about saying
 * something out loud in one pass.
 *
 * The mirror and the 12° tilt are baked into the coordinates rather than
 * applied as an SVG transform. `apple-icon.tsx` and `opengraph-image.tsx`
 * render this same path through Satori, whose SVG support is a narrow subset —
 * a nested transform there is a silent difference between the favicon and the
 * share card, and the whole reason the path lives in one place is that they
 * cannot drift.
 *
 * One continuous path, stroked in `currentColor` so it inherits whatever colour
 * its context sets: white on the brand tile, brand blue on light surfaces.
 */
export const EXPLAINALOUD_MARK_PATH =
  "M 38.2 13.3 C 21.3 10.8, 10.5 22.3, 21.2 29.2 C 27.1 33, 31.8 31, 37.1 31.9 C 44.6 33.4, 48.8 38.7, 42.1 41.1 C 35.5 43.5, 32.8 35.9, 38.3 32.7 C 30.8 31.2, 21.7 36.2, 21.6 45.5 C 21.7 55.7, 35.7 58.8, 46.9 49.3";

export function ExplainaloudMark({
  className,
  strokeWidth = 4.2,
}: {
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d={EXPLAINALOUD_MARK_PATH} />
    </svg>
  );
}
