import { ImageResponse } from "next/og";

/**
 * The card shown when a link to Explainaloud is shared.
 *
 * It is the hero, as closely as a still can be. Somebody who taps this link
 * should land on the page they were just looking at, and the previous card was
 * a light grey document with a transcript excerpt on it — an honest picture of
 * a page that no longer exists, and nothing like the navy water the link
 * actually opens.
 *
 * The water cannot be here: the field is a WebGL shader and this is rendered by
 * Satori, which has no canvas and no filters. What it does have is layered
 * gradients, and the field resolves to a handful of soft lit shapes on a dark
 * ground, so four radial gradients at the right positions get most of the way.
 * It reads as the same room rather than as a screenshot of it, which for a
 * 1200x630 thumbnail is the right trade.
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
export const alt = "Explainaloud: say what you know, see what you missed.";

/* The landing's own tokens. `LIT` is the headline's second voice, the same
 * #a8cdf5 the page sets on "See what you missed."
 *
 * The verdict colours are the light tints rather than the fills, because they
 * are being read on a dark ground here exactly as they are in the hero — the
 * fills are tuned for light stock and go muddy on navy. */
const DEEP = "#030a18";
const PANEL = "#142744";
const LIT = "#a8cdf5";
const PAPER = "#eef2f8";
const OK = "#bfe4cf";
const VAGUE = "#f0d8ad";
const MISS = "#efc1bb";

/** The same two paths as `icon.svg` and `apple-icon.tsx`. */
const EYE =
  "M 19.1 13.9 L 33.9 20.6 Q 38 22.5 33.9 24.4 L 19.1 31.1 Q 15 33 15 28.5 L 15 16.5 Q 15 12 19.1 13.9 Z";
const SMILE = "M 17.5 39.5 A 18 18 0 0 0 42.5 50.5";

/**
 * A word with a verdict drawn under it.
 *
 * The live page animates the rule wiping across; this is its finished state.
 * `borderBottom` rather than `textDecoration` because Satori gives no control
 * over underline offset or thickness, and at 76px a default underline sits on
 * the descenders.
 */
function Marked({ children, tone }: { children: string; tone: string }) {
  return (
    <span
      style={{
        display: "flex",
        borderBottom: `5px solid ${tone}`,
        paddingBottom: "6px",
      }}
    >
      {children}
    </span>
  );
}

/** A word space, as an element.
 *
 * `gap` on the headline rows renders between some pairs and not others in
 * Satori — "know. See" got its space and "what you missed." did not, from
 * identical markup. A spacer is a box with a width, and a box with a width is
 * the one thing a layout engine cannot decline to draw. */
function Gap() {
  return <span style={{ display: "flex", width: "24px" }} />;
}

function Chip({ children, tone }: { children: string; tone: string }) {
  return (
    <span
      style={{
        display: "flex",
        color: tone,
        border: `1px solid ${tone}59`,
        padding: "9px 18px",
        fontSize: "20px",
        letterSpacing: "0.14em",
        textTransform: "uppercase",
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
        backgroundColor: DEEP,
        color: PAPER,
        padding: "60px 72px",
        /* The water, approximated. Four soft lights on a dark ground, weighted
           to the right so the left third stays dark enough to set the headline
           on — which is the hero's composition, and the reason the type is
           legible there without a scrim laid over the top. */
        backgroundImage: [
          `radial-gradient(900px 560px at 84% 30%, #2b5c8fb3 0%, #2b5c8f00 60%)`,
          `radial-gradient(620px 460px at 96% 74%, #4a86c299 0%, #4a86c200 62%)`,
          `radial-gradient(460px 340px at 70% 8%, #9cc8f24d 0%, #9cc8f200 64%)`,
          `radial-gradient(380px 300px at 88% 48%, #cfe6ff3d 0%, #cfe6ff00 66%)`,
          `radial-gradient(1000px 700px at 6% 40%, ${DEEP}f2 0%, ${DEEP}00 58%)`,
          `linear-gradient(102deg, ${DEEP} 0%, #0a1f42 56%, ${PANEL} 100%)`,
        ].join(", "),
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <svg
          width="42"
          height="42"
          viewBox="0 0 64 64"
          fill="none"
          role="img"
          aria-label="Explainaloud"
        >
          <path d={EYE} fill={PAPER} />
          <path
            d={SMILE}
            stroke={PAPER}
            strokeWidth="5"
            strokeLinecap="round"
          />
        </svg>
        <span
          style={{
            fontSize: "27px",
            fontWeight: 600,
            letterSpacing: "-0.02em",
          }}
        >
          Explainaloud
        </span>
      </div>

      {/* The page's actual headline, set the way the page sets it: the first
          sentence in paper white, the second in the lit blue, and a verdict
          drawn under one word of each. Somebody who has never seen the product
          learns what the three colours mean from this card alone. */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          fontSize: "92px",
          fontWeight: 600,
          lineHeight: 1.02,
          letterSpacing: "-0.04em",
        }}
      >
        <div style={{ display: "flex" }}>
          <span style={{ display: "flex" }}>Say what you</span>
        </div>
        <div style={{ display: "flex" }}>
          <Marked tone={OK}>know.</Marked>
          <Gap />
          <span style={{ display: "flex", color: LIT }}>See</span>
        </div>
        <div style={{ display: "flex", color: LIT }}>
          <span style={{ display: "flex" }}>what you</span>
          <Gap />
          <Marked tone={MISS}>missed.</Marked>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", gap: "12px" }}>
          <Chip tone={OK}>Reached</Chip>
          <Chip tone={VAGUE}>Too thin</Chip>
          <Chip tone={MISS}>Missed</Chip>
        </div>
        <span
          style={{
            display: "flex",
            fontSize: "22px",
            color: `${PAPER}8c`,
          }}
        >
          Explain it out loud. Get marked claim by claim.
        </span>
      </div>
    </div>,
    size,
  );
}
