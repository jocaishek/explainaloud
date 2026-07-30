"use client";

import { useReducedMotion } from "framer-motion";
import Lenis from "lenis";
import { useEffect } from "react";
import { setPageScroll } from "~/lib/page-scroll";

/**
 * Buttery inertia scrolling for the marketing page only. Mounted inside a
 * single page's tree so it unmounts (and stops touching window scroll) the
 * moment the user navigates elsewhere, e.g. into the dashboard.
 */
export function SmoothScroll() {
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (shouldReduceMotion) return;

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => 1 - (1 - t) ** 3,
      smoothWheel: true,
      wheelMultiplier: 0.9,
      // Lenis owns scroll position once mounted, so href="#signup"-style
      // anchor links need to go through it too, or their native jump gets
      // fought and reverted on the next animation frame.
      anchors: true,
    });

    // Published so the pinned carousel can turn the page itself when someone
    // scrolls it sideways.
    setPageScroll(lenis);

    function raf(time: number) {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    }
    let frame = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(frame);
      setPageScroll(null);
      lenis.destroy();
    };
  }, [shouldReduceMotion]);

  return null;
}
