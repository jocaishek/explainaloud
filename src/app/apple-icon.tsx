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
  "M 15.5 11 L 28.5 20 C 34.5 27 36.5 30 36.5 38 L 36.5 44 C 36.5 48.5 33.5 51 29.5 51 C 25.5 51 22.5 48.5 22.5 44 L 22.5 38 C 22.5 30 24.5 27 30.5 20 C 37.5 16 43.5 14 48.5 15";

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
      <svg width="150" height="150" viewBox="0 0 64 64" fill="none">
        <path
          d={MARK}
          stroke="#ffffff"
          strokeWidth="3.6"
          strokeLinecap="round"
        />
      </svg>
    </div>,
    size,
  );
}
