/**
 * The Explainaloud mark: a reversed 3, which reads as an E, with a loop at the
 * waist where the two bowls meet.
 *
 * The loop is not a shape placed at the waist — it is where the single stroke
 * crosses itself on the way from the top bowl into the bottom one. That
 * distinction is the whole design. Two earlier attempts drew a loop that left
 * the junction and returned to it, which is a circle however it is curved, and
 * a circle at the waist reads as a bead threaded onto the letter rather than
 * something the letter does. Here the stroke overshoots to the right, curls up
 * and back down across its own incoming line, and carries on into the lower
 * bowl. Nothing is added; the crossing is a consequence of the path.
 *
 * The enclosed almond leans along the direction of travel rather than sitting
 * upright, so the eye follows one line through the crossing instead of tracking
 * round a detour — which is what makes it read as handwriting, and the point of
 * a mark for a product about saying something out loud in one pass.
 *
 * The 10° tilt is baked into the coordinates rather than applied as an SVG
 * transform. `apple-icon.tsx` and `opengraph-image.tsx` render this same path
 * through Satori, whose SVG support is a narrow subset — a nested transform
 * there is a silent difference between the favicon and the share card, and the
 * whole reason the path lives in one place is that they cannot drift.
 *
 * One continuous path, stroked in `currentColor` so it inherits whatever colour
 * its context sets: white on the brand tile, brand blue on light surfaces.
 */
export const EXPLAINALOUD_MARK_PATH =
  "M 40.5 11.2 C 22.7 8.2, 11 22.5, 22.4 29.6 C 26.9 31.9, 33 31.8, 37.9 31 C 44.8 29.7, 47.9 30.2, 45.1 25.6 C 42.4 22, 34.9 25.4, 31.4 34.1 C 27.7 41.9, 20.2 40.2, 21.5 47.1 C 22.8 54.9, 35.4 56.8, 47.9 47.5";

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
