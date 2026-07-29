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
  "M 40.5 11.2 C 22.7 8.2, 11 22.5, 22.4 29.6 C 26.9 31.9, 33 31.8, 37.9 31 C 44.8 29.7, 47.9 30.2, 45.1 25.6 C 42.4 22, 34.9 25.4, 31.4 34.1 C 27.7 41.9, 20.2 40.2, 21.5 47.1 C 22.8 54.9, 35.4 56.8, 47.9 47.5";

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
