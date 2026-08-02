import { Greeting } from "~/components/greeting";
import { type Stat, StatRail } from "./stat-rail";

/**
 * The dark band the dashboard opens with.
 *
 * This is the half of the hybrid that had not been built yet. The decision was
 * a Brouwer masthead over a Mercury app, and what shipped first was the Mercury
 * half twice — a calm white screen with a 50px heading on it, which is a
 * perfectly good dashboard and nothing like the reference.
 *
 * Reading the reference rather than describing it, the grammar is specific:
 *
 * - **The display type is enormous and packed.** 274px with a line-height of
 *   0.74 — lines set *tighter* than their own height, so a two-line headline
 *   reads as one block of texture rather than as two sentences. Tracking is
 *   negative at that size because letterfit that looks right at 16px looks
 *   loose at 200.
 * - **It is filled with a gradient that fades into its own background**, so the
 *   type does not sit on the band, it emerges from it.
 * - **The band is dark and the rest of the page is light.** The reference is
 *   `#f1f1f1` below the fold; the darkness is one region, not the site.
 * - **Everything that is not the headline is tiny and monospaced** — corner
 *   coordinates, a date, a count. The scale contrast between those and the
 *   display is most of the effect.
 *
 * Applied here rather than copied: the huge thing is the greeting, because on
 * a dashboard the reader is the subject. Cosmos.so is the other half of the
 * brief and pulls the opposite way on weight — 74px at weight *350* — which is
 * the reason the stats below stay light and airy instead of matching the
 * masthead's weight. One monument per screen.
 *
 * Archivo does the display job. It is already loaded for the landing page with
 * its width axis, and at `wdth` 125 with weight 700 it is the closest thing in
 * the bundle to a compressed poster face. Inter stays the interface font
 * everywhere below this band — a grotesque drawn for 13px does not become a
 * display face by being set at 100px.
 */
export function Masthead({
  firstName,
  stats,
}: {
  firstName: string;
  stats: Stat[];
}) {
  return (
    /* No band at all.
     *
     * This was a full-bleed near-black region under a light nav, above a light
     * page — one hard inversion in the first screen of a tool somebody opens
     * many times a day, and the same complaint the landing page's section 02
     * earned. A dark field is a way of saying "this region is different", and
     * on a dashboard the top of the page is not different: it is the top of
     * the page.
     *
     * So the greeting and the three figures simply stand on the app canvas,
     * separated from the work below by the rule the stat rail already carries.
     * Nothing is lost but the paint. */
    <section className="mx-auto w-full max-w-[var(--measure)] px-4 pt-8 pb-2 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-5">
        {/* The corner data. Small, monospaced, factual. */}
        <p className="font-mono text-[0.6rem] text-subtle uppercase tracking-[0.16em]">
          Dashboard
          <span className="mx-2 opacity-50">/</span>
          {stats[0]?.value ?? 0} recorded
        </p>

        <Greeting
          name={firstName}
          /* The landing's display voice, at a size a working screen can carry.
             This was 112px of packed uppercase grotesque with a gradient
             running down it — a poster, and the first thing anybody saw every
             time they opened the app. A greeting is not the most important
             thing on this page; the three actions under it are. Source Serif
             at weight 400, sentence case, keeps the line warm and personal
             without turning the header into a monument. */
          className="max-w-[20ch] font-display font-normal text-[clamp(1.5rem,3.2vw,2.2rem)] text-strong leading-[1.15] tracking-[-0.015em]"
        />

        <StatRail stats={stats} />
      </div>
    </section>
  );
}
