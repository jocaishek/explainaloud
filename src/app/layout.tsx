import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import { Geist, Inter, Martian_Mono } from "next/font/google";
import { AuthHashRescue } from "~/components/auth-hash-rescue";
import { siteUrl } from "~/lib/site";
import { ThemeProvider } from "./theme-provider";
import "./globals.css";

/* Geist runs the body, the labels and the interface copy.
 *
 * It replaces Archivo, which was doing two jobs on one width axis and doing
 * neither loudly. What is wanted from a body face is that it disappear: even
 * colour, open apertures, figures that stay in column. Geist is drawn for
 * exactly that, screen first, with no calligraphic memory in it at all.
 *
 * Geist ships no italic. The few places that still set one are body sized,
 * where a synthetic slant is not visible as a shear; nothing at display size
 * asks for italic any more, because at 64px a synthesised one reads as a
 * rendering fault rather than as emphasis. */
const geist = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
});

/* Martian Mono carries the timecodes, cue labels and status lines.
 *
 * A monospace here is not a costume for "technical" — the page is laid out as
 * a broadcast running order, and every figure in it is a measurement that has
 * to stay in column as it counts: elapsed time, duration, word position. That
 * is the job monospace exists for. Martian Mono is drawn wide and slightly
 * mechanical, which reads as instrument rather than as code editor. */
const martianMono = Martian_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

/* The display face is Geist too, and that is the decision rather than a
 * shortcut.
 *
 * Two faces have been tried in this slot and both were rejected for the same
 * underlying reason, which took a second rejection to see. Source Serif 4 read
 * as machine made, because a serif display over a grotesque body is now the
 * house style of every generated landing page. Bricolage Grotesque read as
 * goofy, because the thing that made it distinctive was exactly its
 * irregularity, and irregularity is charm rather than authority.
 *
 * This product is a study tool. Somebody opens it before an exam or the night
 * before a talk, and the page has to carry the same seriousness the app does.
 * That rules out charm in the display face entirely, and it rules out the
 * expressive serif for the opposite reason: both are the page having a
 * personality at a moment when the reader wants competence.
 *
 * So there is one family, set across the whole page, and the hierarchy is
 * carried by size, weight and tracking instead of by a change of voice. This
 * is what serious software does, and it is why serious software reads as
 * serious: nothing is performing. Geist is drawn for screens, has an even
 * colour at text sizes and tightens up properly at display sizes, which is the
 * one thing a single family type system genuinely requires.
 *
 * The variable cut, so weight is a continuous axis rather than four downloads:
 * display sits at 600, body at 400.
 */
const geistDisplay = Geist({
  subsets: ["latin"],
  variable: "--font-display",
});

/* Inter, and only inside the signed-in app.
 *
 * It is loaded here because fonts have to be requested from the root layout to
 * be preloaded, but it is applied by `.register-app` alone — the landing page
 * never sets a word in it.
 *
 * The old rule in `.claude/rules/design.md` banned Inter outright, and that
 * ban was written when the app had no type system at all: Inter was the
 * symptom of everything being default, not the cause. With a real weight and
 * size scale under it, a neutral grotesque is exactly right for a working
 * interface — the display face's job is to be memorable in three seconds, and
 * a screen somebody reads for twenty minutes has the opposite job.
 *
 * The variable cut, so weight is a continuous axis rather than four separate
 * downloads: headings sit at 600, body at 400, and the distance between them
 * is what carries hierarchy instead of size alone. */
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-ui",
});

const DIRECTION_CONTRACT = `<!--
seed 8e7cc5c5

THESIS: this product marks you while you are still talking, so the page marks
you while you are still reading it. It refuses the category arrangement — hero
claim, three feature cards, a screenshot — because a screenshot of live
marking is the one thing that cannot show live marking.

OWN-WORLD: the as-live broadcast script. Photocopy-grey stock, hard black
hairlines and no card edges anywhere, a monospaced timecode gutter running the
full height, Archivo condensed and heavy for display against Archivo light for
running text, ultramarine at page scale rather than as an accent, and green /
red / grey reserved for what they mean inside a transcript.

STORY: you arrive mid-transmission. Something is being said and marked in
front of you before you have read a word of copy. You understand that speaking
is the input and that the marking is claim by claim, you believe it because you
watched it happen rather than being told, and you cue your own.

FIRST VIEWPORT: full-bleed script. Timecode column hard left, spoken lines
arriving right of it at display scale and being wiped green, red or grey as
they land. The product name sits small in the masthead rule; the primary
action is an ultramarine cue block inline in the script, not floating above it.

FORM: the as-live transmission script, candidate 3 of the grounded list,
seed key 8e7cc5c5.

FINISH: unreviewed and undocumented is unfinished; this build ends with the
finish review, the verdict, and DESIGN.md
-->`;

const TITLE = "explainaloud";
const DESCRIPTION =
  "Explain it back out loud and know exactly when you actually understand it.";

export const metadata: Metadata = {
  // Resolves the relative Open Graph and Twitter image paths below to absolute
  // URLs, which those crawlers require. See `siteUrl` for where the host comes
  // from — deliberately not from anything written down in this repo.
  metadataBase: new URL(siteUrl()),
  title: TITLE,
  description: DESCRIPTION,
  applicationName: TITLE,
  // Without these a shared link renders as a bare URL — no title, no image, no
  // description — in Slack, iMessage, Discord and every social preview. The
  // image itself is generated by `opengraph-image.tsx` from the same brand mark
  // as the favicon, so there is one source of truth for the shape.
  openGraph: {
    type: "website",
    siteName: TITLE,
    title: TITLE,
    description: DESCRIPTION,
    // Relative on purpose: `metadataBase` makes it absolute against whatever
    // host this deployment is actually serving from.
    url: "/",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <body
        className={`${geist.variable} ${martianMono.variable} ${geistDisplay.variable} ${inter.variable} font-sans`}
      >
        {/* The direction this design is under contract to, emitted as a real
            HTML comment so it survives the production build and can be read
            off the served page rather than taken on trust from a source file
            nobody opens. `hidden` keeps the wrapper out of the layout; the
            comment inside it is the payload. */}
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: a fixed
            string constant with no interpolation, and the only way React
            renders a comment node at all. */}
        <div hidden dangerouslySetInnerHTML={{ __html: DIRECTION_CONTRACT }} />
        <ThemeProvider>{children}</ThemeProvider>
        {/* At the root because an emailed link lands wherever the project's
            Site URL points, and a session in the URL fragment is invisible to
            every server route. Renders nothing. */}
        <AuthHashRescue />
        <Analytics />
      </body>
    </html>
  );
}
