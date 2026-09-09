"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { type ReactNode, useEffect } from "react";
import "lenis/dist/lenis.css";

export function LenisProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    /* Smoothing is a pointer-and-wheel refinement, not a requirement.
     * On touch devices native scrolling is what people expect — running a
     * rAF-driven scroll loop there is the single biggest source of scroll
     * lag — and under reduced motion the easing is unwanted outright.
     * ScrollTrigger works directly off native scroll in both cases, so we
     * simply never instantiate Lenis. */
    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      window.matchMedia("(pointer: coarse)").matches
    ) {
      return;
    }

    /* Lenis and GSAP share one clock. Without this wiring, ScrollTrigger
     * reads scroll on its own ticker while Lenis eases on another, and
     * every scrubbed animation stutters against the smoothing. */
    gsap.registerPlugin(ScrollTrigger);

    const lenis = new Lenis({
      // In-page #anchors ride the same easing as the wheel.
      anchors: { offset: -76 },
    });

    lenis.on("scroll", ScrollTrigger.update);

    const raf = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(raf);

    return () => {
      gsap.ticker.remove(raf);
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}
