"use client";

import { motion } from "framer-motion";
import { useRef } from "react";
import { cn } from "~/lib/utils";
import { floatLoop, heroRise, inView, rise, riseGroup } from "./motion";

/**
 * The sunset landing: tarmac black, Athens gold, frosted glass.
 *
 * Foundational pieces rather than a finished page — the hero, the glass panel,
 * the scroll reveal and the sticky feature scroller, which are the four things
 * the rest of the page is assembled from.
 *
 * Two decisions worth reading before editing:
 *
 * **The glass is not everywhere.** The brief asks for heavy glassmorphism, and
 * heavy is the trap: a page where every surface is frosted has no depth,
 * because depth is a *relationship* between a floating thing and the thing
 * behind it. Glass is used on the panels that float over the sunset field and
 * nowhere else, so the ones that float actually read as floating.
 *
 * **The verdict colours are still the verdict colours.** Green, red and sand
 * mean correct, missed and vague on a marked word, and the sunset accents
 * never touch a transcript. That separation is the product, and it survives
 * the repaint — see the `.register-sunset` block in `globals.css` for why the
 * values had to move on this canvas.
 */

/** A frosted panel. `float` opts into the idle drift. */
export function GlassPanel({
  children,
  className,
  float,
  accent,
}: {
  children: React.ReactNode;
  className?: string;
  /** Seconds per drift cycle. Give siblings different values — see below. */
  float?: number;
  /** A verdict colour, drawn as the panel's left edge. */
  accent?: string;
}) {
  return (
    <motion.div
      animate={float ? floatLoop(float) : undefined}
      style={accent ? { borderLeft: `2px solid ${accent}` } : undefined}
      className={cn("glass-panel rounded-2xl p-5 text-left", className)}
    >
      {children}
    </motion.div>
  );
}

/** A block that rises in once, when it is properly on screen. */
export function Reveal({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={rise}
      initial="hidden"
      whileInView="show"
      viewport={inView}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function SunsetHero() {
  return (
    <section className="sunset-field relative overflow-hidden px-5 pt-24 pb-28 md:px-10 md:pt-32 md:pb-36">
      <div className="mx-auto max-w-[78rem]">
        <motion.p
          custom={0}
          variants={heroRise}
          initial="hidden"
          animate="show"
          className="text-center font-mono text-[0.62rem] text-[color:var(--ink-faint)] uppercase tracking-[0.22em]"
        >
          Explain it. Find out what you only half know.
        </motion.p>

        {/* The headline is the composition. Everything else on this screen is
            arranged around it rather than beside it. */}
        <motion.h1
          custom={1}
          variants={heroRise}
          initial="hidden"
          animate="show"
          className="mx-auto mt-8 max-w-[16ch] text-center font-semibold text-[clamp(2.9rem,8.4vw,7rem)] leading-[0.92] tracking-[-0.045em]"
        >
          Find the gaps you didn't know you had.
        </motion.h1>

        <motion.p
          custom={2}
          variants={heroRise}
          initial="hidden"
          animate="show"
          className="mx-auto mt-8 max-w-[46ch] text-center text-[1.02rem] text-[color:var(--ink-soft)] leading-[1.6]"
        >
          Upload your notes, talk through them for three minutes, and read back
          which claims you got right, which were vague, and what you skipped.
        </motion.p>

        <motion.div
          custom={3}
          variants={heroRise}
          initial="hidden"
          animate="show"
          className="mt-11 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <a
            href="/signup"
            className="inline-flex items-center justify-center rounded-full bg-[linear-gradient(180deg,var(--sun-high),var(--sun))] px-8 py-4 font-mono text-[0.72rem] text-[#1a1206] uppercase tracking-[0.1em] transition-transform duration-300 active:scale-[0.97]"
          >
            Start a session
          </a>
          <a
            href="#marking"
            className="inline-flex items-center justify-center rounded-full border border-[color:var(--rule-strong)] px-8 py-4 font-mono text-[0.72rem] uppercase tracking-[0.1em] transition-colors duration-300 hover:bg-white/5"
          >
            See how the marking works
          </a>
        </motion.div>

        {/* Two fragments of real output, floating either side of the sentence.
            Different cycle lengths on purpose: matched loops read as one
            mechanism moving two objects, which kills the effect within about
            four seconds of watching.

            They orbit only at `xl`. At `lg` the headline still fills most of
            the measure, and a card floated into that space lands on top of the
            words — which it did, over "didn't". Below that they fold back into
            the flow as an ordinary pair. */}
        <div className="pointer-events-none mt-16 grid gap-4 sm:grid-cols-2 xl:mt-0 xl:block">
          <GlassPanel
            float={7}
            accent="var(--ok)"
            className="xl:-translate-y-[15rem] xl:absolute xl:left-[2%] xl:w-[16rem] 2xl:left-[6%]"
          >
            <p className="text-[0.92rem] leading-[1.6]">
              <span className="text-[color:var(--ok)] italic">
                two identical daughter cells
              </span>
              , and it starts with the DNA{" "}
              <span className="text-[color:var(--ok)] italic">
                being copied
              </span>
              .
            </p>
            <p className="mt-3 font-mono text-[0.6rem] text-[color:var(--ink-faint)] uppercase tracking-[0.14em]">
              Marked as you said it
            </p>
          </GlassPanel>

          <GlassPanel
            float={9.5}
            accent="var(--miss)"
            className="xl:-translate-y-[8.5rem] xl:absolute xl:right-[2%] xl:w-[15rem] 2xl:right-[6%]"
          >
            <p className="text-[0.92rem] text-[color:var(--miss)] italic leading-[1.6]">
              the spindle fibres attach at the centromere
            </p>
            <p className="mt-3 font-mono text-[0.6rem] text-[color:var(--ink-faint)] uppercase tracking-[0.14em]">
              Never said
            </p>
          </GlassPanel>
        </div>
      </div>
    </section>
  );
}

export type StickyStep = {
  n: string;
  title: string;
  body: string;
  panel: React.ReactNode;
};

/**
 * The dashboard scroller: copy pinned left, mockups moving past it on the
 * right.
 *
 * `position: sticky` rather than a scroll-jacking library. The page keeps its
 * own scrollbar, the back button works, and somebody on a trackpad with
 * momentum does not fight it — which is what makes hijacked scrolling read as
 * cheap however smooth it is.
 *
 * The pinned column is `h-fit` and sticky at a third of the viewport, so the
 * text sits where the eye already is rather than pinned to the very top.
 */
export function StickyFeatures({
  steps,
  heading,
}: {
  steps: StickyStep[];
  heading: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  return (
    <section
      id="marking"
      ref={ref}
      className="sunset-field px-5 py-28 md:px-10 md:py-36"
    >
      <div className="mx-auto grid max-w-[78rem] gap-14 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)] lg:gap-20">
        <div className="lg:sticky lg:top-[28vh] lg:h-fit">
          <Reveal>
            <h2 className="max-w-[14ch] font-semibold text-[clamp(2rem,4.4vw,3.4rem)] leading-[1.02] tracking-[-0.035em]">
              {heading}
            </h2>
          </Reveal>
        </div>

        <motion.div
          variants={riseGroup}
          initial="hidden"
          whileInView="show"
          viewport={inView}
          className="flex flex-col gap-6"
        >
          {steps.map((step) => (
            <motion.div key={step.n} variants={rise}>
              <GlassPanel className="p-6 md:p-7">
                <span className="font-mono text-[0.6rem] text-[color:var(--sun-high)] uppercase tracking-[0.18em]">
                  {step.n}
                </span>
                <h3 className="mt-3 font-semibold text-[1.35rem] tracking-[-0.02em]">
                  {step.title}
                </h3>
                <p className="mt-2 max-w-[46ch] text-[0.95rem] text-[color:var(--ink-soft)] leading-[1.65]">
                  {step.body}
                </p>
                {step.panel && <div className="mt-5">{step.panel}</div>}
              </GlassPanel>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
