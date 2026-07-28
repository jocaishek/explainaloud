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

const MARK =
  "M 38.2 13.3 C 21.3 10.8, 10.5 22.3, 21.2 29.2 C 27.1 33, 31.8 31, 37.1 31.9 C 44.6 33.4, 48.8 38.7, 42.1 41.1 C 35.5 43.5, 32.8 35.9, 38.3 32.7 C 30.8 31.2, 21.7 36.2, 21.6 45.5 C 21.7 55.7, 35.7 58.8, 46.9 49.3";

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#4a90e2",
      }}
    >
      {/* Full-bleed square: iOS applies its own corner mask. */}
      {/* Rasterised to PNG, so the label is inert here — but the lint rule is
          right in general, and `role`/`aria-label` satisfy it without a
          <title> child, which Satori does not render. */}
      <svg
        width="150"
        height="150"
        viewBox="0 0 64 64"
        fill="none"
        role="img"
        aria-label="Explainaloud"
      >
        <path
          d={MARK}
          stroke="#ffffff"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>,
    size,
  );
}
