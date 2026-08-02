import { ImageResponse } from "next/og";

/**
 * The card shown when a link to Explainaloud is shared.
 *
 * Generated rather than committed as a binary, for the same reason as the apple
 * icon: the mark stays a path in source instead of a PNG that silently drifts
 * from it. Nothing here names a host — the crawler resolves this route against
 * whatever domain served the page.
 *
 * It is built in the landing page's world: photocopy-grey stock, a hard rule
 * across the top, and the headline marked the way the product marks one. The
 * previous card was a near-black canvas with a brand-coloured radial glow in
 * the corner, which is the treatment the site was rebuilt to get rid of.
 *
 * Satori renders a strict subset of CSS: every element needs an explicit
 * `display`, and there is no cascade to inherit from. The verbosity below is
 * that constraint, not preference.
 */
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt =
  "Explainaloud: rereading feels like learning, saying it out loud is where you find out.";

const BRAND = "#c2410c";
const INK = "#0c0c0d";
const STOCK = "#f2f2f0";
const OK = "#0f7a3d";
const VAGUE = "#96600a";

/** The same two paths as `icon.svg` and `apple-icon.tsx`. */
const EYE =
  "M 19.1 13.9 L 33.9 20.6 Q 38 22.5 33.9 24.4 L 19.1 31.1 Q 15 33 15 28.5 L 15 16.5 Q 15 12 19.1 13.9 Z";
const SMILE = "M 17.5 39.5 A 18 18 0 0 0 42.5 50.5";

/**
 * A marked run.
 *
 * Satori has no `::before` and no independent clipping, so the wash the live
 * page animates is drawn here as a plain background with a solid underline —
 * the finished state of the same mark.
 */
function Mark({ children, tone }: { children: string; tone: string }) {
  return (
    <span
      style={{
        display: "flex",
        color: tone,
        backgroundColor: `${tone}26`,
        borderBottom: `6px solid ${tone}`,
        padding: "0 6px",
      }}
    >
      {children}
    </span>
  );
}

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        backgroundColor: STOCK,
        color: INK,
        padding: "64px 72px",
        borderTop: `10px solid ${BRAND}`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "2px solid rgba(12,12,13,0.2)",
          paddingBottom: "22px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
          <svg
            width="52"
            height="52"
            viewBox="0 0 64 64"
            fill="none"
            role="img"
            aria-label="Explainaloud"
          >
            <path d={EYE} fill={BRAND} />
            <path
              d={SMILE}
              stroke={BRAND}
              strokeWidth="5"
              strokeLinecap="round"
            />
          </svg>
          <span
            style={{
              fontSize: "34px",
              fontWeight: 600,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            Explainaloud
          </span>
        </div>
        <span
          style={{
            fontSize: "22px",
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            opacity: 0.55,
          }}
        >
          Rec 00:00 of 03:00
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "26px" }}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0 16px",
            fontSize: "86px",
            fontWeight: 600,
            lineHeight: 1.02,
            letterSpacing: "-0.04em",
            textTransform: "uppercase",
            maxWidth: "1000px",
          }}
        >
          <span style={{ display: "flex" }}>Rereading</span>
          <Mark tone={VAGUE}>feels like</Mark>
          <span style={{ display: "flex" }}>learning.</span>
          <Mark tone={OK}>Saying it out loud</Mark>
          <span style={{ display: "flex" }}>is where you</span>
          <Mark tone={OK}>find out.</Mark>
        </div>
        <span
          style={{
            fontSize: "30px",
            lineHeight: 1.35,
            opacity: 0.7,
            maxWidth: "820px",
          }}
        >
          Talk through what you are studying for three minutes and get your own
          words back, marked sentence by sentence.
        </span>
      </div>
    </div>,
    size,
  );
}
