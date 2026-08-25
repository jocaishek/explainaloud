import { ImageResponse } from "next/og";

/**
 * Apple touch icon.
 *
 * Generated rather than committed as a binary, and generated rather than served
 * as SVG: Next only registers `apple-icon` as a route for raster formats, so an
 * `apple-icon.svg` is silently ignored and the URL 404s. ImageResponse renders
 * the same mark to PNG at build time, keeping one source of truth for the shape.
 */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/* The two paths, copied rather than imported.
 *
 * `explainaloud-mark.tsx` is a client component, and importing it here would
 * pull React's client runtime into a build-time image route. The shapes are
 * literals in both places and must be kept in step; the doc comment on the
 * component says the same thing from the other side. */
const EYE =
  "M 19.1 13.9 L 33.9 20.6 Q 38 22.5 33.9 24.4 L 19.1 31.1 Q 15 33 15 28.5 L 15 16.5 Q 15 12 19.1 13.9 Z";
const SMILE = "M 17.5 39.5 A 18 18 0 0 0 42.5 50.5";

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        /* The warm stock the whole product stands on, so the corners around
           the disc are the page colour rather than a white or black box.
           Opaque on purpose: an Apple touch icon has no alpha channel, and a
           transparent PNG is composited onto black by iOS. */
        background: "#f2f2f0",
      }}
    >
      {/* A real circle, matching `icon.svg`.
       *
       * This was a full-bleed square on the reasoning that iOS masks the tile
       * anyway — true, but it made this the one surface in the set where the
       * mark sat in a square, and it is the tile that ends up on a home
       * screen. Drawing the disc means the icon is circular everywhere it is
       * seen, and iOS's own squircle mask only ever crops stock it would have
       * cropped regardless. */}
      <div
        style={{
          width: 164,
          height: 164,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "50%",
          background: "#142744",
        }}
      >
        {/* Rasterised to PNG, so the label is inert here — but the lint rule is
          right in general, and `role`/`aria-label` satisfy it without a
          <title> child, which Satori does not render. */}
        <svg
          width="138"
          height="138"
          viewBox="0 0 64 64"
          fill="none"
          role="img"
          aria-label="Explainaloud"
        >
          <path d={EYE} fill="#aed4f7" />
          <path
            d={SMILE}
            stroke="#aed4f7"
            strokeWidth="5"
            strokeLinecap="round"
          />
        </svg>
      </div>
    </div>,
    size,
  );
}
