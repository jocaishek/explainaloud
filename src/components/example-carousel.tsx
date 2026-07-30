"use client";

import {
  type MotionValue,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { useMediaQuery } from "~/hooks/use-media-query";
import { cn } from "~/lib/utils";

export type Example = {
  subject: string;
  topic: string;
  /** Confidence the explanation scored, 0-100. */
  confidence: number;
  gap: string;
};

/** Card pitch in px — must match the rendered width + gap below. */
const CARD_W = 300;
const GAP = 28;
const PITCH = CARD_W + GAP;

/**
 * Horizontal ring of example sessions.
 *
 * The row is a real scroll container — `overflow-x` on an element, nothing
 * more. That one decision is what makes every input work without a line of
 * code each: trackpad swipes, shift+wheel, click-and-drag on touch, arrow keys
 * once it has focus, and the platform's own momentum and rubber-banding. It
 * also means the browser owns the scroll position, so there is exactly one
 * source of truth for where the ring is.
 *
 * It replaced a taller thing: the section used to pin itself to the viewport
 * and remap vertical scroll onto sideways travel. That reads well once and
 * then costs you — it hijacks the page's scroll, it cannot be moved sideways
 * by the gesture people actually reach for, and it makes a section that is
 * really one screen of content two thousand pixels tall.
 *
 * Cards still sit on an arc: each rotates and drops away from the centre in
 * 3D, driven by the container's own `scrollLeft`, so the row reads as the
 * surface of a globe turning past you rather than as a flat strip sliding by.
 */
export function ExampleCarousel({
  examples,
  header,
}: {
  examples: Example[];
  /** Rendered above the row, so it stays put while the ring turns. */
  header?: React.ReactNode;
}) {
  const shouldReduceMotion = useReducedMotion();
  const wide = useMediaQuery("(min-width: 768px)");
  const railRef = useRef<HTMLDivElement>(null);

  /** Scroll position in card widths: 0 is the first card centred. */
  const position = useMotionValue(0);
  // Mirrored into state only for the dots, which are cheap and few. The cards
  // read the motion value directly so a scroll never re-renders them.
  const [nearest, setNearest] = useState(0);

  const onScroll = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;
    const p = rail.scrollLeft / PITCH;
    position.set(p);
    setNearest(Math.round(p));
  }, [position]);

  // A resize changes which card is centred without ever firing `scroll`.
  useEffect(() => {
    window.addEventListener("resize", onScroll);
    return () => window.removeEventListener("resize", onScroll);
  }, [onScroll]);

  // The arc is a desktop flourish. On a phone the cards are near enough
  // full-width that rotating them away just makes text harder to read, and it
  // is the one part of this that costs real compositing work per frame.
  const arc = wide && !shouldReduceMotion;

  return (
    <div className="flex w-full flex-col items-center gap-10 py-16">
      {header}

      <section
        ref={railRef}
        onScroll={onScroll}
        // Focusable so the arrow keys work. A scroll container is only
        // keyboard-operable if something can focus it, and this one holds
        // content rather than controls, so it takes the focus itself — the
        // named exception to "don't put tabIndex on a div", and why it is
        // labelled as a region rather than left as an anonymous box.
        // biome-ignore lint/a11y/noNoninteractiveTabindex: scrollable region, keyboard-reachable on purpose
        tabIndex={0}
        aria-label="Example sessions"
        className={cn(
          "no-scrollbar flex w-full snap-x snap-mandatory items-center overflow-x-auto",
          "focus-visible:outline-none",
          // Room for the arc to lean out of the box without being clipped.
          arc ? "py-16" : "py-6",
        )}
        style={{
          gap: `${GAP}px`,
          // Half a viewport minus half a card, so the first and last cards can
          // reach the centre instead of stopping against the edge.
          paddingInline: `calc(50% - ${CARD_W / 2}px)`,
          perspective: arc ? "1200px" : undefined,
          perspectiveOrigin: "50% 50%",
          transformStyle: arc ? "preserve-3d" : undefined,
        }}
      >
        {examples.map((example, i) => (
          <RingCard
            key={example.topic}
            example={example}
            index={i}
            position={position}
            arc={arc}
          />
        ))}
      </section>

      <ProgressDots
        nearest={nearest}
        ids={examples.map((e) => e.topic)}
        onSelect={(index) => {
          railRef.current?.scrollTo({
            left: index * PITCH,
            behavior: shouldReduceMotion ? "auto" : "smooth",
          });
        }}
      />
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
  position,
  arc,
}: {
  example: Example;
  index: number;
  position: MotionValue<number>;
  arc: boolean;
}) {
  const offset = useTransform(position, (p) => index - p);

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
      style={
        arc
          ? {
              width: CARD_W,
              rotateY,
              z,
              y,
              scale,
              opacity,
              filter: blur,
              zIndex,
              transformStyle: "preserve-3d",
            }
          : { width: CARD_W }
      }
      className="glass relative flex min-h-[20rem] shrink-0 snap-center flex-col rounded-2xl p-6 text-left"
    >
      {arc && <FocusGlow offset={offset} />}
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

/**
 * Position readout, and the way to move without a gesture. They were decorative
 * dots; now that the row is a scroll container they may as well be the
 * buttons that scroll it, which is also the only pointer-driven way through
 * for someone on a mouse with no horizontal wheel.
 */
function ProgressDots({
  nearest,
  ids,
  onSelect,
}: {
  nearest: number;
  ids: string[];
  onSelect: (index: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      {ids.map((id, i) => (
        <button
          key={id}
          type="button"
          onClick={() => onSelect(i)}
          aria-label={`Go to example ${i + 1} of ${ids.length}`}
          aria-current={i === nearest}
          className="group flex h-6 items-center px-0.5"
        >
          <span
            className={cn(
              "h-1.5 rounded-full transition-all duration-300",
              i === nearest
                ? "w-6 bg-brand"
                : "w-1.5 bg-white/20 group-hover:bg-white/40",
            )}
          />
        </button>
      ))}
    </div>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
