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
export const alt = "Explainaloud: find the gaps you didn't know you had.";

const BRAND = "#c2410c";
const SUN = "#f59e0b";
const INK = "#0c0c0d";
const STOCK = "#f2f2f0";
const OK = "#0f7a3d";
const MISS = "#c4271c";

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
        /* The current accent. The rule was the deep stop, which is the hover
           and pressed colour, not the one the product leads with. */
        borderTop: `10px solid ${SUN}`,
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

      <div style={{ display: "flex", flexDirection: "column", gap: "30px" }}>
        {/* The headline the landing actually runs, in sentence case.
         *
         * This card was still carrying "Rereading feels like learning. Saying
         * it out loud is where you find out" — a line the landing tried and
         * rejected, for reasons written out at `HEADLINE` in `page.tsx`: two
         * sentences where one would do, and amber on "feels like", which is
         * not a claim anybody would grade. A share card is the first thing
         * most people ever see of this product, and it was showing copy the
         * page itself had moved on from. */}
        <span
          style={{
            display: "flex",
            fontSize: "82px",
            fontWeight: 600,
            lineHeight: 1.05,
            letterSpacing: "-0.03em",
            maxWidth: "980px",
          }}
        >
          Find the gaps you didn&apos;t know you had.
        </span>

        {/* The verdicts, used as verdicts.
         *
         * The old card painted green on "Saying it out loud" and tan on
         * "feels like" — decoration in the costume of a verdict, which
         * `design.md` bans outright: those three colours mean *correct*,
         * *missing a step* and *vague*, and nothing else may wear them. The
         * green somebody is shown before signing up has to be the green they
         * are graded in afterwards.
         *
         * So the card marks a real clause instead, the same authored physics
         * take the hero runs: one claim the grader would pass, one it would
         * record as never reached. Same colours, doing their actual job. */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "14px",
            fontSize: "30px",
            lineHeight: 1.35,
            maxWidth: "980px",
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0 12px" }}>
            <span style={{ display: "flex", opacity: 0.7 }}>
              Forces come in pairs,
            </span>
            <Mark tone={OK}>equal and opposite</Mark>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0 16px" }}>
            <span
              style={{
                display: "flex",
                fontSize: "20px",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: MISS,
              }}
            >
              Not said
            </span>
            <span style={{ display: "flex", color: MISS }}>
              the two forces act on different objects
            </span>
          </div>
        </div>
      </div>
    </div>,
    size,
  );
}
