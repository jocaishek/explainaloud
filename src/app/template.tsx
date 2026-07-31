"use client";

import { motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";

/**
 * App-wide cross-fade between top-level routes — landing → onboarding →
 * dashboard no longer cut hard from one page to the next.
 *
 * Opacity only, deliberately. `transform` and `filter` both establish a
 * containing block for `position: fixed` descendants, which would break the
 * landing page's pinned scroll-progress bar. Per-section motion lives in the
 * nested templates, where nothing is fixed.
 */
export default function RootTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  const shouldReduceMotion = useReducedMotion();
  const pathname = usePathname();

  // The authenticated app optimizes for repeated task navigation. Marketing
  // routes keep the entrance fade, but dashboard clicks render immediately.
  if (shouldReduceMotion || pathname.startsWith("/home")) {
    return <>{children}</>;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
    >
      {children}
    </motion.div>
  );
}
