import { ImageResponse } from "next/og";

/**
 * The card shown when a link to Explainaloud is shared.
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
  "Explainaloud: explain it back out loud and know exactly when you actually understand it.";

const BRAND = "#4a90e2";

/** The same path as `icon.svg` and `apple-icon.tsx`. */
const MARK =
  "M 40.5 11.2 C 22.7 8.2, 11 22.5, 22.4 29.6 C 26.9 31.9, 33 31.8, 37.9 31 C 44.8 29.7, 47.9 30.2, 45.1 25.6 C 42.4 22, 34.9 25.4, 31.4 34.1 C 27.7 41.9, 20.2 40.2, 21.5 47.1 C 22.8 54.9, 35.4 56.8, 47.9 47.5";

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
          aria-label="Explainaloud"
        >
          <path
            d={MARK}
            stroke={BRAND}
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
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
          Explainaloud
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
