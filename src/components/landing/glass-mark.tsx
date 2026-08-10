import {
  EXPLAINALOUD_MARK_EYE,
  EXPLAINALOUD_MARK_SMILE,
} from "~/components/explainaloud-mark";
import { cn } from "~/lib/utils";

/**
 * The mark as a solid of glass.
 *
 * The problem with spinning a logo is that a logo is flat. Rotate an SVG about
 * Y and at 90 degrees it is a hairline, then it turns inside out — which reads
 * as a bug, not as an object. So this is not one rotated SVG: it is the same
 * silhouette drawn `DEPTH` times, each copy pushed back a little in Z inside a
 * `preserve-3d` container. That stack is a real extrusion, so when the mark
 * turns side-on there is a body there to see, and the darkening down the stack
 * is what makes it read as a solid rather than as a stack of stickers.
 *
 * The front face is the only one that gets the glass treatment: a cool
 * refraction gradient, a bright rim where the edge catches light, and one
 * specular streak clipped to the shape. The back copies stay flat and dark.
 * That asymmetry is the whole illusion — real glass is bright where it faces
 * you and dead where it does not.
 *
 * All of it is CSS transforms and SVG. No WebGL, no mesh, no 150KB of
 * three.js for one ornament. What it cannot do is refract what is behind it —
 * a real glass shader bends the background through the body, and this only
 * suggests that with gradients. At the size this runs, over an abstract
 * backdrop, the difference is not visible; over sharp text it would be.
 */

/** Copies in the extrusion. Enough to look solid, few enough to stay cheap. */
const DEPTH = 16;

/**
 * How far apart the copies sit, in `em`.
 *
 * `em`, not `%`. `translateZ` does not accept percentages — the spec has no
 * reference length to resolve them against on the Z axis, so a percentage is
 * simply an invalid value and the whole transform is dropped. The first
 * version of this used one, which meant sixteen copies all sitting at Z=0:
 * not an extrusion, a stack of stickers. It measured as
 * `zFrontToBack: [0, 0]`.
 *
 * `em` works because the caller sets `font-size` to the mark's own width, so
 * the depth scales with the mark — including while GSAP is shrinking it into
 * the nav bar.
 */
const STEP = 0.011;

export function GlassMark({ className }: { className?: string }) {
  return (
    <div
      className={cn("relative", className)}
      style={{ transformStyle: "preserve-3d" }}
    >
      {/* The body. Back copies are darkest, so the stack reads as depth
          falling away rather than as a smear. */}
      {Array.from({ length: DEPTH }, (_, index) => {
        const t = index / (DEPTH - 1);
        return (
          <div
            key={`depth-${index === 0 ? "front" : index}`}
            className="absolute inset-0"
            style={{
              transform: `translateZ(${(-(index + 1) * STEP).toFixed(4)}em)`,
            }}
          >
            <svg
              viewBox="0 0 64 64"
              fill="none"
              aria-hidden="true"
              className="h-full w-full"
            >
              <path
                d={EXPLAINALOUD_MARK_EYE}
                fill={`hsl(214 68% ${30 - t * 20}%)`}
              />
              <path
                d={EXPLAINALOUD_MARK_SMILE}
                stroke={`hsl(214 68% ${30 - t * 20}%)`}
                strokeWidth={5}
                strokeLinecap="round"
              />
            </svg>
          </div>
        );
      })}

      {/* The lit face. */}
      <svg
        viewBox="0 0 64 64"
        fill="none"
        aria-hidden="true"
        className="relative h-full w-full"
      >
        <defs>
          <linearGradient id="gm-body" x1=".15" y1="0" x2=".85" y2="1">
            <stop offset="0" stopColor="#eaf4ff" />
            <stop offset=".22" stopColor="#9cc8f2" />
            <stop offset=".48" stopColor="#3f86d6" />
            <stop offset=".74" stopColor="#1550a6" />
            <stop offset="1" stopColor="#0b2f76" />
          </linearGradient>
          {/* The edge catches light all the way round; that rim is most of
              what says "glass" rather than "blue plastic". */}
          <linearGradient id="gm-rim" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffffff" stopOpacity=".95" />
            <stop offset=".4" stopColor="#cfe6ff" stopOpacity=".55" />
            <stop offset=".7" stopColor="#7fb4e8" stopOpacity=".35" />
            <stop offset="1" stopColor="#ffffff" stopOpacity=".8" />
          </linearGradient>
          <linearGradient id="gm-spec" x1="0" y1="0" x2=".6" y2="1">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
            <stop offset=".42" stopColor="#ffffff" stopOpacity=".85" />
            <stop offset=".56" stopColor="#ffffff" stopOpacity=".9" />
            <stop offset=".72" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>

          {/* Clip the highlight to the mark, or it is a stripe across the
              page rather than a reflection on a surface. */}
          <clipPath id="gm-clip">
            <path d={EXPLAINALOUD_MARK_EYE} />
            <path d={EXPLAINALOUD_MARK_SMILE} />
          </clipPath>
          <filter
            id="gm-soft"
            filterUnits="userSpaceOnUse"
            x="-40"
            y="-40"
            width="144"
            height="144"
          >
            <feGaussianBlur stdDeviation="1.6" />
          </filter>
        </defs>

        <path d={EXPLAINALOUD_MARK_EYE} fill="url(#gm-body)" />
        <path
          d={EXPLAINALOUD_MARK_SMILE}
          stroke="url(#gm-body)"
          strokeWidth={5}
          strokeLinecap="round"
        />

        <g clipPath="url(#gm-clip)">
          <rect
            x="-10"
            y="-10"
            width="84"
            height="84"
            fill="url(#gm-spec)"
            filter="url(#gm-soft)"
          />
        </g>

        <path
          d={EXPLAINALOUD_MARK_EYE}
          fill="none"
          stroke="url(#gm-rim)"
          strokeWidth="0.9"
        />
        <path
          d={EXPLAINALOUD_MARK_SMILE}
          stroke="url(#gm-rim)"
          strokeWidth="6.2"
          strokeLinecap="round"
          fill="none"
          opacity=".5"
        />
      </svg>
    </div>
  );
}
