"use client";

import {
  type MotionValue,
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import { useRef } from "react";
import { cn } from "~/lib/utils";

export type Example = {
  subject: string;
  topic: string;
  /** Confidence the explanation scored, 0-100. */
  confidence: number;
  gap: string;
};

const EASE = [0.23, 1, 0.32, 1] as const;

/** Card pitch in px — must match the rendered width + gap below. */
const CARD_W = 300;
const GAP = 28;
const PITCH = CARD_W + GAP;

/**
 * Scroll-driven horizontal ring of example sessions.
 *
 * The section is deliberately tall; an inner panel sticks to the viewport
 * while it scrolls past, and vertical scroll progress is remapped onto
 * horizontal travel. So a normal downward scroll walks sideways through the
 * examples and then releases into the rest of the page — no wheel hijacking,
 * no scroll listeners, just a tall element and a sticky child, which means
 * Lenis's inertia carries straight through it.
 *
 * Cards sit on an arc: each one rotates and drops away from the centre in 3D,
 * so the row reads as the surface of a globe turning past you rather than as
 * a flat strip sliding by.
 */
export function ExampleCarousel({
  examples,
  header,
}: {
  examples: Example[];
  /** Rendered inside the pinned panel, so it stays put while the ring turns. */
  header?: React.ReactNode;
}) {
  const shouldReduceMotion = useReducedMotion();
  const sectionRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    // Start when the section's top reaches the viewport top (it is pinned
    // from that moment) and end when its bottom does.
    offset: ["start start", "end end"],
  });

  // Spring-smoothed so the sideways travel keeps Lenis's easing feel instead
  // of tracking the raw scrollbar 1:1.
  const progress = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 28,
    restDelta: 0.0005,
  });

  // The flex row is centred by its container, which puts the *middle* card
  // under the viewport centre at x=0. Offset by half the travel so the run
  // starts on the first card and ends on the last.
  const halfTravel = ((examples.length - 1) * PITCH) / 2;
  const x = useTransform(progress, [0, 1], [halfTravel, -halfTravel]);

  // Reduced motion: fall back to a plain, user-driven horizontal scroller.
  if (shouldReduceMotion) {
    return (
      <div className="py-16">
        {header}
        <div className="no-scrollbar mt-10 flex snap-x snap-mandatory gap-7 overflow-x-auto px-6 py-6">
          {examples.map((example) => (
            <article
              key={example.topic}
              className="glass w-[300px] shrink-0 snap-center rounded-2xl p-6"
            >
              <ExampleBody example={example} />
            </article>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={sectionRef}
      // Pin length per card. Higher = slower sideways travel per unit of wheel.
      // At a viewport each, seven cards were a 6000px slog; 55vh still left the
      // pin 5200px tall — over half the length of the entire page, so the
      // section read as the site stalling rather than as a feature. 34vh puts
      // it near 3200px: a little over one flick per card, enough to register
      // each without asking for six screens of scrolling to get past them.
      style={{ height: `${examples.length * 34}vh` }}
      className="relative w-full"
    >
      {/* The panel has to be a full viewport for `sticky top-0` to pin cleanly,
          but its content was only ~560px of that, leaving ~400px of dead space
          above and below for the entire time the section is on screen — which
          is what made 02 read as a hole between 01 and 03. `justify-between`
          with bounded padding spreads the header, the ring and the dots across
          the panel instead of huddling them in the middle. */}
      <div className="sticky top-0 flex h-screen flex-col items-center justify-between overflow-hidden py-20 sm:py-24">
        {header}
        <div
          className="relative flex w-full items-center justify-center"
          // Deep perspective on the container, so every card shares one
          // vanishing point and the row curves as a single surface.
          style={{ perspective: "1200px", perspectiveOrigin: "50% 50%" }}
        >
          <motion.div
            className="flex items-center"
            style={{ x, gap: `${GAP}px`, transformStyle: "preserve-3d" }}
          >
            {examples.map((example, i) => (
              <RingCard
                key={example.topic}
                example={example}
                index={i}
                progress={progress}
                total={examples.length}
              />
            ))}
          </motion.div>
        </div>

        <ProgressDots progress={progress} ids={examples.map((e) => e.topic)} />
      </div>
    </div>
  );
}

/**
 * One card on the arc. `offset` is how many card-widths this card sits from
 * the centre right now; every visual property is a function of it, so the
 * whole ring is described by one number per card.
 */
function RingCard({
  example,
  index,
  progress,
  total,
}: {
  example: Example;
  index: number;
  progress: MotionValue<number>;
  total: number;
}) {
  const offset = useTransform(progress, (p) => index - p * (total - 1));

  // Turn away from the viewer, and push back in z, the further out you are.
  const rotateY = useTransform(offset, (o) => clamp(o * -22, -55, 55));
  const z = useTransform(offset, (o) => -Math.min(Math.abs(o), 3) * 130);
  const y = useTransform(offset, (o) => Math.min(Math.abs(o), 3) * 18);
  // The focused card is meaningfully larger than its neighbours.
  const scale = useTransform(
    offset,
    (o) => 1 - Math.min(Math.abs(o), 3) * 0.13,
  );
  const opacity = useTransform(offset, (o) =>
    Math.abs(o) > 3.2 ? 0 : 1 - Math.min(Math.abs(o), 3) * 0.26,
  );
  const blur = useTransform(
    offset,
    (o) => `blur(${Math.min(Math.abs(o), 3) * 1.4}px)`,
  );
  // Nearest card must paint above the ones behind it.
  const zIndex = useTransform(
    offset,
    (o) => 100 - Math.round(Math.abs(o) * 10),
  );

  return (
    <motion.article
      style={{
        width: CARD_W,
        rotateY,
        z,
        y,
        scale,
        opacity,
        filter: blur,
        zIndex,
        transformStyle: "preserve-3d",
      }}
      className="glass relative flex min-h-[22rem] shrink-0 flex-col rounded-2xl p-6 text-left"
    >
      <FocusGlow offset={offset} />
      <div className="relative">
        <ExampleBody example={example} />
      </div>
    </motion.article>
  );
}

/** Accent bloom that fades up only on the card nearest the centre. */
function FocusGlow({ offset }: { offset: MotionValue<number> }) {
  const glow = useTransform(offset, (o) => Math.max(0, 1 - Math.abs(o) * 1.6));

  return (
    <motion.span
      aria-hidden
      style={{ opacity: glow }}
      className="glow-ring pointer-events-none absolute inset-0 rounded-2xl"
    />
  );
}

function ExampleBody({ example }: { example: Example }) {
  return (
    <>
      <p className="font-mono text-[10px] tracking-[0.18em] text-[#71717A] uppercase">
        {example.subject}
      </p>
      <h3 className="mt-3 min-h-14 text-lg leading-snug font-semibold text-white">
        {example.topic}
      </h3>

      <div className="mt-5 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.08]">
          <div
            className="h-full rounded-full bg-brand"
            style={{ width: `${example.confidence}%` }}
          />
        </div>
        <span className="font-mono text-sm font-medium text-brand tabular-nums">
          {example.confidence}%
        </span>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-[#A1A1AA]">
        <span className="font-mono text-[10px] tracking-[0.14em] text-[#71717A] uppercase">
          Gap found
        </span>
        <br />
        {example.gap}
      </p>
    </>
  );
}

/** Position readout along the ring — the "path" the section walks through. */
function ProgressDots({
  progress,
  ids,
}: {
  progress: MotionValue<number>;
  ids: string[];
}) {
  return (
    <div className="mt-12 flex items-center gap-2">
      {ids.map((id, i) => (
        <Dot key={id} index={i} progress={progress} total={ids.length} />
      ))}
    </div>
  );
}

function Dot({
  index,
  progress,
  total,
}: {
  index: number;
  progress: MotionValue<number>;
  total: number;
}) {
  const offset = useTransform(progress, (p) =>
    Math.abs(index - p * (total - 1)),
  );
  const width = useTransform(offset, (o) => (o < 0.5 ? 26 : 6));
  const background = useTransform(offset, (o) =>
    o < 0.5 ? "var(--color-brand)" : "rgba(255,255,255,0.2)",
  );

  return (
    <motion.span
      aria-hidden
      style={{ width, background }}
      transition={{ duration: 0.3, ease: EASE }}
      className={cn("h-1.5 rounded-full")}
    />
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
