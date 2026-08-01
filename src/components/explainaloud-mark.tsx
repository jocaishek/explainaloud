/**
 * The Explainaloud mark: a cue triangle over an open bowl.
 *
 * Two marks in one, and it only works because both readings are true at once.
 * A play triangle sitting high and left inside a wide smile is a face with one
 * eye — and the same two shapes, a solid counter above and a bowl below, are
 * the anatomy of a lowercase *e*. Nothing is added to make either reading
 * work; the second one is what the first one already looks like.
 *
 * It replaces a reversed 3 that had to be explained before it could be seen.
 *
 * The triangle points right because that is what starts a recording, and the
 * page this mark tops is laid out as a broadcast script. It is drawn as a
 * filled path with its corners cut back and closed with quadratic curves
 * through each vertex, rather than stroked with a round linejoin: Satori
 * renders `apple-icon.tsx` and `opengraph-image.tsx` from these same
 * constants, and its SVG support is a narrow subset where a stroke-derived
 * shape is a silent difference between the favicon and the share card. Real
 * geometry cannot drift.
 *
 * The smile is a third of a circle, falling away to the lower right. Two
 * earlier attempts drew the full bowl and both failed the same way: an arc
 * wide enough to sit under the whole triangle encircles it, and a ring with
 * something inside it is not a face. Half the mouth is enough — the eye above
 * it supplies the rest, and leaving the right side of the grid open is what
 * lets the same two shapes read as a letter.
 *
 * Everything fits inside a circle of radius 32 on a 64 grid, with clearance.
 * That is not a nicety: this icon is masked to a circle everywhere it appears,
 * so a mark that only fits a square is a mark that gets clipped.
 *
 * Both parts take `currentColor`, so the mark is ultramarine on the page's
 * grey stock and white on an ultramarine tile without either being written
 * down twice.
 */

/** The cue triangle, filled. Corners cut 4.5 units back and rounded through. */
export const EXPLAINALOUD_MARK_EYE =
  "M 19.1 13.9 L 33.9 20.6 Q 38 22.5 33.9 24.4 L 19.1 31.1 Q 15 33 15 28.5 L 15 16.5 Q 15 12 19.1 13.9 Z";

/**
 * The smile, stroked: a third of a circle of radius 18, falling away to the
 * lower right rather than cupping the triangle.
 *
 * Half a smile, not a bowl. A full arc under the triangle closed into a face
 * and stopped being a letter; this one leaves the right side of the grid open,
 * which is what makes the pair read as an *e* with its terminal cut away as
 * readily as it reads as an eye above a mouth.
 *
 * It begins at (17.5, 39.5), so its rounded cap tops out around y=37 while the
 * triangle's lowest corner sits at y=33. Four clear units. They must not meet:
 * the moment the stroke touches the fill the two shapes read as one blob.
 */
export const EXPLAINALOUD_MARK_SMILE = "M 17.5 39.5 A 18 18 0 0 0 42.5 50.5";

export function ExplainaloudMark({
  className,
  strokeWidth = 5,
}: {
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path d={EXPLAINALOUD_MARK_EYE} fill="currentColor" />
      <path
        d={EXPLAINALOUD_MARK_SMILE}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </svg>
  );
}
