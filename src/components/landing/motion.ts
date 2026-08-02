import type { Transition, Variants } from "framer-motion";

/**
 * The motion vocabulary for the sunset landing.
 *
 * Declared once, in one file, because the brief asks for "premium, unhurried"
 * and that is not a property of any single animation — it is what you get when
 * thirty of them agree. Thirty components each guessing a duration is exactly
 * what reads as cheap, no matter how long each guess was.
 *
 * Everything here is slow on purpose. The fast end of this system is 400ms,
 * where most interfaces would use 200.
 */

/**
 * The house curve.
 *
 * Almost all of the distance in the first third, then a long settle. That
 * asymmetry is what gives an arriving element mass — it reads as something
 * heavy coming to rest rather than as a box being faded in. A spring reads as
 * a toy, and `easeOut` reads as a template.
 */
export const EASE = [0.32, 0.72, 0, 1] as const;

/** The float loop's curve: symmetrical, so neither end of the drift snaps. */
export const EASE_FLOAT = [0.44, 0, 0.56, 1] as const;

/**
 * Sections arriving on scroll.
 *
 * `whileInView` with `once: true`. A section that re-animates every time it
 * re-enters the viewport turns scrolling back up into a light show, and the
 * second viewing is never the impressive one.
 */
export const rise: Variants = {
  hidden: { opacity: 0, y: 48 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.9, ease: EASE },
  },
};

/**
 * A group whose children arrive in sequence.
 *
 * `delayChildren` holds the whole group back a beat first, so the stagger
 * starts after the section has committed to being on screen rather than
 * racing it.
 */
export const riseGroup: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.09, delayChildren: 0.12 },
  },
};

/** Shared viewport config: fire once, and not until the block is properly in. */
export const inView = { once: true, amount: 0.25, margin: "0px 0px -12% 0px" };

/**
 * The hero cards' idle drift.
 *
 * Two things make this read as floating rather than as animating: the distance
 * is small (10px, not 40), and the two cards are given different durations so
 * they fall out of phase within a few cycles. Matched loops read as one
 * mechanism moving two objects, which is the opposite of the effect.
 *
 * `y` only. Rotation on a drifting card is the tell of a template.
 */
export function floatLoop(seconds: number, distance = 10) {
  return {
    y: [0, -distance, 0],
    transition: {
      duration: seconds,
      ease: EASE_FLOAT,
      repeat: Number.POSITIVE_INFINITY,
      repeatType: "loop",
    } satisfies Transition,
  };
}

/** The entrance for the hero itself, which cannot wait to be scrolled to. */
export const heroRise: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 1, ease: EASE, delay: 0.12 + i * 0.1 },
  }),
};
