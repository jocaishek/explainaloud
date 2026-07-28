/**
 * The Ropes mark: two strands that cross, swap sides and close into a long
 * bight of rope. The arms are deliberately asymmetric — the left reaches out
 * and up, the right curves over at a shallower slope — so the crossing reads
 * as the shoulder of a lowercase `r`.
 *
 * One continuous path, so the crossing looks like a single rope rather than
 * two shapes stacked. Stroked in `currentColor` to inherit whatever colour
 * its context sets: white on the brand tile, brand blue on light surfaces.
 */
export function RopesMark({
  className,
  strokeWidth = 3.4,
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
      aria-hidden="true"
      className={className}
    >
      <path d="M 15.5 11 L 28.5 20 C 34.5 27 36.5 30 36.5 38 L 36.5 44 C 36.5 48.5 33.5 51 29.5 51 C 25.5 51 22.5 48.5 22.5 44 L 22.5 38 C 22.5 30 24.5 27 30.5 20 C 37.5 16 43.5 14 48.5 15" />
    </svg>
  );
}
