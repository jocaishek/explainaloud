import type { Transition, Variants } from "framer-motion";

/**
 * The page's motion vocabulary, in one place.
 *
 * Before this there was a bare `ease` array exported from the middle of the
 * landing component and a dozen inline `transition={{ duration: 0.38, ease }}`
 * objects with slightly different durations, none of which had been chosen
 * against each other. That is how a page ends up feeling almost right: every
 * individual animation is defensible and no two of them agree.
 *
 * ## Who owns what
 *
 * There are two animation systems on this page and the split between them is
 * deliberate, because the failure mode of mixing them is two libraries writing
 * the same `transform` on the same element and the last writer winning at
 * random.
 *
 * - **GSAP owns the scroll layer.** Section reveals, the scrubbed headlines,
 *   the read-through bar, the marks that draw under the copy, the mark that
 *   flies into the nav. Anything keyed to scroll position.
 * - **Framer Motion owns state inside a panel.** The demo console, the results
 *   carousel, the rehearsal panel. Anything keyed to React state.
 *
 * Nothing is driven by both. An element carrying `data-scroll-reveal` is
 * GSAP's and must not also be a `motion` component with animation props.
 */

/** The page's one easing curve for anything that is not a spring. */
export const EASE = [0.23, 1, 0.32, 1] as const;

export const transitions = {
  /** Default for UI that should feel physical rather than timed. */
  spring: { type: "spring", stiffness: 300, damping: 24 },
  /** For an indicator sliding between positions. Tighter, so it arrives. */
  springStiff: { type: "spring", stiffness: 500, damping: 34 },
  /** Content arriving. */
  smooth: { type: "tween", duration: 0.34, ease: EASE },
  /** Content leaving. Always quicker than it arrived: an exit the same length
   *  as an entrance reads as hesitation, because the reader has already
   *  decided and is waiting on the interface. */
  exit: { type: "tween", duration: 0.16, ease: EASE },
  /** Small state flips: a dot lighting up, a label appearing. */
  snappy: { type: "tween", duration: 0.18, ease: EASE },
} satisfies Record<string, Transition>;

/**
 * A list whose children arrive one after another.
 *
 * `staggerChildren` on the parent rather than a computed `delay` per child,
 * because the delay version breaks the moment the list length changes and it
 * cannot be reversed. This can: the same variants play backwards on exit.
 */
export const listContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};

export const listItem: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: transitions.spring },
};

/**
 * Reduced motion, applied at the variant level.
 *
 * The usual approach is a ternary on every `initial` and `animate` prop, which
 * means every new animation is a fresh chance to forget. Swapping the variant
 * object instead makes the safe version the default shape of the thing.
 *
 * Opacity is kept and movement is dropped, rather than everything being
 * removed. `prefers-reduced-motion` is a request not to be moved, not a
 * request for no feedback at all, and a list that appears with no transition
 * whatsoever loses the sequence that the stagger was carrying.
 */
export const stillListItem: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
};
