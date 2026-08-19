"use client";

import { motion, useReducedMotion, useScroll, useSpring } from "framer-motion";

/**
 * Hairline progress bar pinned to the top of the viewport. Spring-smoothed so
 * it trails the scroll instead of snapping. (This once said "the already
 * inertial Lenis scroll". Lenis was removed before it was ever wired up; the
 * scroll here is the browser's own.)
 */
export function ScrollProgress() {
  const shouldReduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    mass: 0.4,
  });

  if (shouldReduceMotion) return null;

  return (
    <motion.div
      aria-hidden
      style={{ scaleX }}
      className="fixed inset-x-0 top-0 z-50 h-px origin-left bg-brand"
    />
  );
}
