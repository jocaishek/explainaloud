"use client";

import { useReducedMotion } from "framer-motion";
import type Lenis from "lenis";
import { useEffect } from "react";
import { useMediaQuery } from "~/hooks/use-media-query";

/**
 * Buttery inertia scrolling for the marketing page only. Mounted inside a
 * single page's tree so it unmounts (and stops touching window scroll) the
 * moment the user navigates elsewhere, e.g. into the dashboard.
 *
 * The library itself is fetched only once we know it will be used — it is a
 * type-only import up here. Scrolling works without it, so making the first
 * paint wait on it would be paying for polish with the thing polish is for.
 */
export function SmoothScroll() {
  const shouldReduceMotion = useReducedMotion();
  // Wheel smoothing is a wheel feature. Lenis leaves touch scrolling native
  // by default, so on a phone all it contributed was a rAF callback on every
  // single frame for the life of the page, plus its own bytes to download.
  const hasWheel = useMediaQuery("(pointer: fine)");

  useEffect(() => {
    if (shouldReduceMotion || !hasWheel) return;

    let instance: Lenis | null = null;
    let frame = 0;
    let cancelled = false;

    void import("lenis").then(({ default: Lenis }) => {
      if (cancelled) return;

      instance = new Lenis({
        duration: 1.1,
        easing: (t) => 1 - (1 - t) ** 3,
        smoothWheel: true,
        wheelMultiplier: 0.9,
        // Lenis owns scroll position once mounted, so href="#signup"-style
        // anchor links need to go through it too, or their native jump gets
        // fought and reverted on the next animation frame.
        anchors: true,
      });

      function raf(time: number) {
        instance?.raf(time);
        frame = requestAnimationFrame(raf);
      }
      frame = requestAnimationFrame(raf);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      instance?.destroy();
    };
  }, [shouldReduceMotion, hasWheel]);

  return null;
}
