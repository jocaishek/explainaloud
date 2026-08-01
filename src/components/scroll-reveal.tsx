"use client";

import { useEffect } from "react";

/**
 * Scroll reveal for the landing page: content lifts in as it comes up the
 * screen, and settles back down when it leaves the bottom again.
 *
 * One observer for the whole page rather than a `<Reveal>` wrapper around
 * every block. The alternative meant a new element in the middle of a dozen
 * grids that are load-bearing — the timecode gutter is a column of a parent
 * grid, so anything inserted between a section and its rows breaks the ruler
 * that runs down the left of the page. This way a block opts in by carrying
 * `data-rise`, and its markup does not change at all.
 *
 * Two things the observer has to get right:
 *
 * **It reverses, but only downwards.** Something scrolled off the *top* stays
 * revealed. Hiding it as well would mean the page erasing itself behind you,
 * and it is visible again the moment you scroll back up — so the fade would
 * play in reverse right when you are looking at it.
 *
 * **State lives in the DOM, not in React.** The attribute is toggled directly
 * so a page of thirty blocks does not re-render on every scroll, and the
 * transition itself is CSS. Nothing here runs per frame.
 *
 * A block starts with `data-rise=""`, which is styled as revealed, so the page
 * renders complete with JavaScript off and nothing is hidden from a crawler.
 * The first callback fires immediately after `observe`, before anything has
 * been painted below the fold, so nothing flashes on the way in.
 */
export function ScrollReveal() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const targets = document.querySelectorAll<HTMLElement>("[data-rise]");
    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const el = entry.target as HTMLElement;
          /* Above the viewport counts as revealed even without ever having
           * been seen intersecting. A fast scroll — an anchor jump, the End
           * key, a scrollbar drag — moves further in one frame than the
           * observer samples, so blocks in between are never reported as
           * intersecting at all. Keying off `top > 0` alone left those stuck
           * hidden behind you. */
          el.dataset.rise =
            entry.isIntersecting || entry.boundingClientRect.top <= 0
              ? "in"
              : "out";
        }
      },
      /* Held back from the very bottom edge, so a block starts its rise a
         little after it appears rather than crossing the fold mid-fade. */
      { rootMargin: "0px 0px -12% 0px" },
    );

    for (const el of targets) observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return null;
}
