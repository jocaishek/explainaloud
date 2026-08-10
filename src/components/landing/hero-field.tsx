/**
 * The hero's backdrop, drawn rather than photographed.
 *
 * Built from the "blue truths" reference: a deep navy field on the left, and a
 * swirl of nested glossy bands on the right that converge to a single pinch
 * point. The nesting is the whole subject — one ribbon is a shape, seven
 * ribbons turning inside each other is a surface.
 *
 * How it is constructed: one closed ribbon path is defined once, then drawn
 * seven times, each copy scaled and rotated about the pinch point. That is
 * what keeps the rings concentric and the convergence exact — placing seven
 * curves by hand never converges, it just looks nearly right in seven places.
 *
 * Three things that were bugs first, kept as notes so they are not reintroduced:
 *
 * There is no `feTurbulence`. An earlier version displaced a many-stop gradient
 * with noise, and pushing hard colour stops sideways is precisely how banding
 * is manufactured — every stop becomes an edge the moment it moves. The
 * reference has no noise in it; the smoothness is the aesthetic.
 *
 * Every blur declares `filterUnits="userSpaceOnUse"`. A filter region defaults
 * to a 10% margin around its shape's bounding box, so a wide, short stroke gets
 * its blur sliced off square — which read as hard rectangular seams appearing
 * at apparently random places across the image.
 *
 * The left third is deliberately empty and dark. It is where the headline goes,
 * and a white display face over a bright caustic is a coin toss.
 */

/** The pinch every ribbon converges on. */
const FOCUS = { x: 1210, y: 286 };

/**
 * Scale, rotation and which gradient each ring takes.
 *
 * Rotation increases with scale so the rings shear against each other instead
 * of sitting concentric — that shear is what reads as a twist rather than as
 * a target.
 */
const RINGS = [
  { s: 1.0, r: 0, fill: "url(#hf-g1)", o: 0.95, blur: "url(#hf-b8)" },
  { s: 0.84, r: -7, fill: "url(#hf-g2)", o: 0.95, blur: "url(#hf-b8)" },
  { s: 0.69, r: -15, fill: "url(#hf-g3)", o: 0.95, blur: "url(#hf-b6)" },
  { s: 0.55, r: -24, fill: "url(#hf-g4)", o: 1, blur: "url(#hf-b6)" },
  { s: 0.42, r: -34, fill: "url(#hf-g5)", o: 1, blur: "url(#hf-b4)" },
  { s: 0.3, r: -45, fill: "url(#hf-g6)", o: 1, blur: "url(#hf-b4)" },
  { s: 0.19, r: -57, fill: "url(#hf-g7)", o: 1, blur: "url(#hf-b4)" },
];

const RIBBON =
  "M1210,286 C 940,86 470,150 352,404 C 250,626 596,806 902,676 C 1074,602 1186,438 1210,286 Z";

export function HeroField() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 1400 900"
      preserveAspectRatio="xMidYMid slice"
    >
      <title>Abstract blue field</title>
      <defs>
        {/* The field. Near-black at the edges so the ribbons have somewhere to
            end, cobalt behind the swirl so they have something to sit in. */}
        <radialGradient id="hf-field" cx=".76" cy=".3" r=".9">
          <stop offset="0" stopColor="#123f8e" />
          <stop offset=".34" stopColor="#0a2760" />
          <stop offset=".68" stopColor="#05163c" />
          <stop offset="1" stopColor="#020a1e" />
        </radialGradient>

        {/* Each ribbon is lit across its width: shadow, body, a hard specular
            line, then falling away. The white stop is narrow on purpose —
            a wide one reads as fog, a narrow one reads as gloss. */}
        <linearGradient id="hf-g1" x1=".1" y1="0" x2=".9" y2="1">
          <stop offset="0" stopColor="#071c4a" />
          <stop offset=".38" stopColor="#0f4592" />
          <stop offset=".62" stopColor="#2b8ae4" />
          <stop offset=".72" stopColor="#cfe4fa" />
          <stop offset=".78" stopColor="#6d9ed4" />
          <stop offset="1" stopColor="#0a2358" />
        </linearGradient>
        <linearGradient id="hf-g2" x1=".2" y1="0" x2=".85" y2="1">
          <stop offset="0" stopColor="#0a2760" />
          <stop offset=".34" stopColor="#1a63c0" />
          <stop offset=".56" stopColor="#7fb4e8" />
          <stop offset=".64" stopColor="#ffffff" />
          <stop offset=".73" stopColor="#4e8ed2" />
          <stop offset="1" stopColor="#08214f" />
        </linearGradient>
        <linearGradient id="hf-g3" x1=".05" y1=".1" x2=".9" y2=".95">
          <stop offset="0" stopColor="#061a44" />
          <stop offset=".3" stopColor="#0e4a9e" />
          <stop offset=".55" stopColor="#3f8fdd" />
          <stop offset=".66" stopColor="#eaf3fd" />
          <stop offset=".76" stopColor="#2a6fc0" />
          <stop offset="1" stopColor="#071e4c" />
        </linearGradient>
        <linearGradient id="hf-g4" x1=".25" y1="0" x2=".8" y2="1">
          <stop offset="0" stopColor="#0d3378" />
          <stop offset=".28" stopColor="#2478d2" />
          <stop offset=".5" stopColor="#b7d7f5" />
          <stop offset=".58" stopColor="#ffffff" />
          <stop offset=".7" stopColor="#5c96d6" />
          <stop offset="1" stopColor="#0a2760" />
        </linearGradient>
        <linearGradient id="hf-g5" x1=".3" y1="0" x2=".75" y2="1">
          <stop offset="0" stopColor="#09265b" />
          <stop offset=".3" stopColor="#3283d8" />
          <stop offset=".48" stopColor="#dceafb" />
          <stop offset=".56" stopColor="#ffffff" />
          <stop offset=".72" stopColor="#4a8bd0" />
          <stop offset="1" stopColor="#0b2c69" />
        </linearGradient>
        <linearGradient id="hf-g6" x1=".35" y1="0" x2=".7" y2="1">
          <stop offset="0" stopColor="#0f3f8c" />
          <stop offset=".32" stopColor="#5fa2e0" />
          <stop offset=".5" stopColor="#ffffff" />
          <stop offset=".68" stopColor="#3f85cd" />
          <stop offset="1" stopColor="#0a2760" />
        </linearGradient>
        <linearGradient id="hf-g7" x1=".4" y1="0" x2=".65" y2="1">
          <stop offset="0" stopColor="#1a5cae" />
          <stop offset=".4" stopColor="#c6dff8" />
          <stop offset=".55" stopColor="#ffffff" />
          <stop offset=".8" stopColor="#2f76c4" />
          <stop offset="1" stopColor="#0d3278" />
        </linearGradient>

        {/* The rim light that runs along the outer turn of the swirl. */}
        <linearGradient id="hf-rim" x1="0" y1="0" x2="1" y2=".4">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
          <stop offset=".3" stopColor="#ffffff" stopOpacity=".85" />
          <stop offset=".62" stopColor="#bcdcf8" stopOpacity=".7" />
          <stop offset="1" stopColor="#4e93d8" stopOpacity="0" />
        </linearGradient>

        {/* The reference sheet has a single thin vertical light down the left
            of an otherwise empty field. It is the only straight line in the
            picture, and it stops the dark side reading as unfinished. */}
        <linearGradient id="hf-seam" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7fb4e8" stopOpacity="0" />
          <stop offset=".3" stopColor="#cfe4fa" stopOpacity=".55" />
          <stop offset=".62" stopColor="#9dc3ee" stopOpacity=".4" />
          <stop offset="1" stopColor="#4e93d8" stopOpacity="0" />
        </linearGradient>

        <filter
          id="hf-b4"
          filterUnits="userSpaceOnUse"
          x="-600"
          y="-600"
          width="2600"
          height="2100"
        >
          <feGaussianBlur stdDeviation="4" />
        </filter>
        <filter
          id="hf-b6"
          filterUnits="userSpaceOnUse"
          x="-600"
          y="-600"
          width="2600"
          height="2100"
        >
          <feGaussianBlur stdDeviation="7" />
        </filter>
        <filter
          id="hf-b8"
          filterUnits="userSpaceOnUse"
          x="-600"
          y="-600"
          width="2600"
          height="2100"
        >
          <feGaussianBlur stdDeviation="11" />
        </filter>
        <filter
          id="hf-b40"
          filterUnits="userSpaceOnUse"
          x="-600"
          y="-600"
          width="2600"
          height="2100"
        >
          <feGaussianBlur stdDeviation="40" />
        </filter>
        <filter
          id="hf-b90"
          filterUnits="userSpaceOnUse"
          x="-600"
          y="-600"
          width="2600"
          height="2100"
        >
          <feGaussianBlur stdDeviation="90" />
        </filter>

        {/* Dither, not texture. A long blue ramp across a wide viewport lands
            only a few pixels per 8-bit step, which is where contour rings come
            from. Two per cent of monochrome noise breaks them up and is never
            visible as grain. */}
        <filter id="hf-dither">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.8"
            numOctaves="1"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>

        {/* Keeps the headline side dark whatever the swirl does. */}
        <linearGradient id="hf-bed" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#01060f" stopOpacity=".88" />
          <stop offset=".3" stopColor="#01060f" stopOpacity=".5" />
          <stop offset=".58" stopColor="#01060f" stopOpacity="0" />
        </linearGradient>
      </defs>

      <rect width="1400" height="900" fill="url(#hf-field)" />

      {/* the glow the swirl sits in, so it is lit from behind rather than
          pasted on top of a flat field */}
      <ellipse
        cx="880"
        cy="430"
        rx="520"
        ry="380"
        fill="#1a5cae"
        opacity=".38"
        filter="url(#hf-b90)"
      />

      {/* The swirl is pushed right and down out of the centred text column.
          Measured before the shift: the brightest pixel under the subheading
          was #abd0f2, which is 1.6:1 against white — the line was sitting on a
          specular ridge. The headline was always fine (4.4:1, and it is display
          size), but a subhead is body text and needs 4.5:1. Composition solves
          that better than piling on more scrim, which would just grey out the
          artwork to protect two lines of type. */}
      <g transform="translate(150 34)">
        {RINGS.map((ring) => (
          <g
            key={ring.s}
            transform={`translate(${FOCUS.x} ${FOCUS.y}) rotate(${ring.r}) scale(${ring.s}) translate(${-FOCUS.x} ${-FOCUS.y})`}
          >
            <path
              d={RIBBON}
              fill={ring.fill}
              opacity={ring.o}
              filter={ring.blur}
            />
          </g>
        ))}

        {/* the specular line along the outermost turn */}
        <path
          d={RIBBON}
          fill="none"
          stroke="url(#hf-rim)"
          strokeWidth="3"
          filter="url(#hf-b4)"
          opacity=".8"
        />
        <path
          d={RIBBON}
          fill="none"
          stroke="url(#hf-rim)"
          strokeWidth="26"
          filter="url(#hf-b40)"
          opacity=".45"
        />
      </g>

      <rect x="252" y="0" width="2" height="900" fill="url(#hf-seam)" />

      <rect width="1400" height="900" fill="url(#hf-bed)" />
      <rect
        width="1400"
        height="900"
        filter="url(#hf-dither)"
        opacity=".025"
        style={{ mixBlendMode: "overlay" }}
      />
    </svg>
  );
}
