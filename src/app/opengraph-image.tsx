import { ImageResponse } from "next/og";

/**
 * The card shown when a link to Explainaloud is shared.
 *
 * It is the hero, as closely as a still can be: the same paper, the same ink
 * and the "Tonight I'm explaining" headline, with one marked sentence under it
 * so the three verdict colours are explained by the card itself.
 *
 * Generated rather than committed as a binary, for the same reason as the apple
 * icon: the mark stays a path in source instead of a PNG that silently drifts
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
  "explainaloud: upload your notes, explain the topic out loud, and see exactly what you missed";

/* The page's own colours: ink on paper, and the three verdicts at their
 * light-stock values. Literals, because an image route has no stylesheet. */
const PAGE = "#f8f9fa";
const INK = "#141517";
const MUTED = "#6a6d72";
const LINE = "#d9dadc";
const OK = "#1f7a50";
const VAGUE = "#8a5a12";
const MISS = "#b23b30";

/** The same two paths as `icon.svg` and `apple-icon.tsx`. */
const EYE =
  "M 19.1 13.9 L 33.9 20.6 Q 38 22.5 33.9 24.4 L 19.1 31.1 Q 15 33 15 28.5 L 15 16.5 Q 15 12 19.1 13.9 Z";
const SMILE = "M 17.5 39.5 A 18 18 0 0 0 42.5 50.5";

/**
 * A phrase with its verdict drawn under it, the finished state of what the
 * landing animates. `borderBottom` rather than `textDecoration` because Satori
 * gives no control over underline offset or thickness.
 */
function Marked({ children, tone }: { children: string; tone: string }) {
  return (
    <span
      style={{
        display: "flex",
        color: tone,
        borderBottom: `3px solid ${tone}`,
        paddingBottom: "2px",
      }}
    >
      {children}
    </span>
  );
}

/** A word space, as an element: Satori drops `gap` between some text runs. */
function Gap() {
  return <span style={{ display: "flex", width: "11px" }} />;
}

function Key({ children, tone }: { children: string; tone: string }) {
  return (
    <span
      style={{ display: "flex", alignItems: "center", gap: "10px", color: INK }}
    >
      <span
        style={{
          display: "flex",
          width: "14px",
          height: "14px",
          borderRadius: "7px",
          backgroundColor: tone,
        }}
      />
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
        backgroundColor: PAGE,
        color: INK,
        padding: "60px 72px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
        <svg
          width="40"
          height="40"
          viewBox="0 0 64 64"
          role="img"
          aria-label="Explainaloud"
        >
          <circle cx="32" cy="32" r="32" fill={INK} />
          <g transform="translate(32 32) scale(0.82) translate(-30 -34.05)">
            <path d={EYE} fill={PAGE} />
            <path
              d={SMILE}
              fill="none"
              stroke={PAGE}
              strokeWidth="5"
              strokeLinecap="round"
            />
          </g>
        </svg>
        <span
          style={{
            fontSize: "26px",
            fontWeight: 500,
            letterSpacing: "-0.02em",
          }}
        >
          explainaloud
        </span>
      </div>

      {/* The landing's headline, on the topic its demo opens with. */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          fontSize: "84px",
          fontWeight: 400,
          lineHeight: 1.04,
          letterSpacing: "-0.035em",
        }}
      >
        <span style={{ display: "flex" }}>Tonight I&apos;m explaining</span>
        <span
          style={{
            display: "flex",
            borderBottom: `2px solid ${LINE}`,
            alignSelf: "flex-start",
          }}
        >
          Newton&apos;s third law
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            fontSize: "30px",
            letterSpacing: "-0.015em",
          }}
        >
          <span style={{ display: "flex" }}>Forces</span>
          <Gap />
          <Marked tone={OK}>come in pairs</Marked>
          <span style={{ display: "flex" }}>, so the wall</span>
          <Gap />
          <Marked tone={VAGUE}>kind of pushes back</Marked>
        </div>
        <div
          style={{
            display: "flex",
            gap: "32px",
            fontSize: "20px",
            color: MUTED,
          }}
        >
          <Key tone={OK}>Explained</Key>
          <Key tone={VAGUE}>Too vague</Key>
          <Key tone={MISS}>Not said yet</Key>
        </div>
      </div>
    </div>,
    size,
  );
}
