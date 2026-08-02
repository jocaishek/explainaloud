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
    <section className="relative overflow-hidden bg-[#101012] text-white">
      {/* The band's own light source: a soft vertical lift from the top edge,
          which is what the gradient-filled type fades into. Linear and
          top-anchored — not one of the blurred radial fields this product has
          twice had removed. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.16),rgba(255,255,255,0)_58%)]"
      />

      <div className="relative mx-auto flex w-full max-w-[var(--measure)] flex-col gap-8 px-4 pt-10 pb-9 sm:px-6 lg:px-8 lg:pt-14">
        {/* The corner data. Small, monospaced, and factual — it is the thing
            the display type is allowed to be enormous *against*. */}
        <p className="font-mono text-[0.6rem] text-white/45 uppercase tracking-[0.16em]">
          Dashboard
          <span className="mx-2 text-white/25">/</span>
          {stats[0]?.value ?? 0} recorded
        </p>

        <Greeting
          name={firstName}
          /* Packed: leading below 1 and tracking pulled in, so two lines read
             as one block. The gradient fill runs light-to-transparent down the
             glyphs, which is why the second line dissolves into the band
             instead of ending on a hard edge. */
          className="fill-fade font-sans font-bold text-[clamp(2.6rem,9vw,7rem)] uppercase leading-[0.82] tracking-[-0.045em] [font-stretch:125%]"
        />

        <StatRail stats={stats} tone="dark" />
      </div>
    </section>
  );
}
