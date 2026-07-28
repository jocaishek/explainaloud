import { ImageResponse } from "next/og";

/**
 * The card shown when a link to Ropes is shared.
 *
 * Generated rather than committed as a binary, for the same reason as the apple
 * icon: the mark stays one path in source instead of a PNG that silently drifts
 * from it. Nothing here names a host — the crawler resolves this route against
 * whatever domain served the page.
 *
 * Satori renders a strict subset of CSS: every element needs an explicit
 * `display`, and there is no cascade to inherit from. The verbosity below is
 * that constraint, not preference.
 */
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt =
  "Ropes — explain it back out loud and know exactly when you actually understand it.";

const BRAND = "#4a90e2";

/** The same path as `icon.svg` and `apple-icon.tsx`. */
const MARK =
  "M 15.5 11 L 28.5 20 C 34.5 27 36.5 30 36.5 38 L 36.5 44 C 36.5 48.5 33.5 51 29.5 51 C 25.5 51 22.5 48.5 22.5 44 L 22.5 38 C 22.5 30 24.5 27 30.5 20 C 37.5 16 43.5 14 48.5 15";

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        // A brand glow in the corner, as a gradient rather than a shape.
        // Satori supports neither `filter: blur()` nor `box-shadow`, so a
        // translucent circle renders with a hard edge — a flat disc stamped
        // across the layout, which reads as a bug rather than a glow. A radial
        // gradient is the one form of soft falloff it does render.
        backgroundColor: "#0b0f14",
        backgroundImage:
          "radial-gradient(760px 620px at 88% -12%, rgba(74,144,226,0.30), rgba(74,144,226,0.06) 45%, rgba(74,144,226,0) 70%)",
        padding: "80px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
        <svg
          width="64"
          height="64"
          viewBox="0 0 64 64"
          fill="none"
          role="img"
          aria-label="Ropes"
        >
          <path
            d={MARK}
            stroke={BRAND}
            strokeWidth="4.2"
            strokeLinecap="round"
          />
        </svg>
        <span
          style={{
            fontSize: "40px",
            fontWeight: 600,
            color: "#ffffff",
            letterSpacing: "-0.01em",
          }}
        >
          Ropes
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        <span
          style={{
            fontSize: "68px",
            fontWeight: 600,
            color: "#ffffff",
            lineHeight: 1.1,
            letterSpacing: "-0.03em",
            maxWidth: "900px",
          }}
        >
          Explain it back out loud.
        </span>
        <span
          style={{
            fontSize: "34px",
            color: "#9aa7b4",
            lineHeight: 1.35,
            maxWidth: "860px",
          }}
        >
          Know exactly when you actually understand it.
        </span>
      </div>
    </div>,
    size,
  );
}
