"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * Route transition for everything under /dashboard. A `template` (not a
 * layout) remounts on every navigation, which is what lets the enter
 * animation replay each time instead of firing once per session.
 *
 * Enter-only, and short: this fires on every click in the app, so anything
 * longer than ~250ms starts reading as lag rather than as polish.
 */
export default function DashboardTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={
        shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.995 }
      }
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
      className="h-full"
    >
      {children}
    </motion.div>
  );
}
