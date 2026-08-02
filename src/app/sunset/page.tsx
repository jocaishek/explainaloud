import { StickyFeatures, SunsetHero } from "~/components/landing/sunset";

/**
 * The sunset landing, assembled from the foundational pieces.
 *
 * A route of its own rather than a replacement for `/` yet: the shipped
 * landing is ~1500 lines of working, marked-up product demonstration, and
 * swapping it wholesale in the same change as introducing a new visual world
 * would mean no way to compare the two and no way back. This is the world,
 * built and viewable; porting the remaining sections into it is the next step.
 */
const STEPS = [
  {
    n: "01",
    title: "Upload the material",
    body: "Slides, a chapter, your notes. PDF, Word, Markdown, HTML, CSV or LaTeX, up to 5 MB.",
    panel: null,
  },
  {
    n: "02",
    title: "A course gets built from it",
    body: "Agents draft it and audit each other. Every claim is tied to a quote from your files.",
    panel: null,
  },
  {
    n: "03",
    title: "You talk for three minutes",
    body: "Explain it the way you would to someone who has never met it. Marked as you speak.",
    panel: null,
  },
  {
    n: "04",
    title: "You read back what you missed",
    body: "Claim by claim, with what to do about each one.",
    panel: null,
  },
];

export default function SunsetLanding() {
  return (
    <main className="register-sunset min-h-screen">
      <SunsetHero />
      <StickyFeatures
        heading="Marked while you are still talking."
        steps={STEPS}
      />
    </main>
  );
}
