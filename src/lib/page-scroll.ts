import type Lenis from "lenis";

/**
 * The marketing page's Lenis instance, shared with the few components that
 * need to move the page themselves.
 *
 * Lenis owns the scroll position while it is mounted: it writes its own
 * animated value every frame, so a plain `window.scrollBy` gets reverted on
 * the next tick. Anything that wants to scroll the page has to ask Lenis.
 */
let instance: Lenis | null = null;

export function setPageScroll(lenis: Lenis | null) {
  instance = lenis;
}

/**
 * Scroll the page by `delta` pixels, through Lenis when it is running so the
 * movement keeps the page's easing instead of fighting it.
 */
export function scrollPageBy(delta: number) {
  if (instance) {
    instance.scrollTo(instance.targetScroll + delta, {
      duration: 0.5,
      easing: (t) => 1 - (1 - t) ** 3,
    });
    return;
  }
  window.scrollBy({ top: delta, behavior: "auto" });
}
