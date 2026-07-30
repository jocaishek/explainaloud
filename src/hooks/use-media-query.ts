"use client";

import { useEffect, useState } from "react";

/**
 * Whether a CSS media query currently matches.
 *
 * Starts `false` on the server and on the first client render, then settles
 * after mount. That is deliberate: the alternative is guessing during
 * server rendering and correcting during hydration, which is a whole extra
 * render of whatever depends on it — on the phones this exists to spare.
 *
 * So use it to *withhold* expensive work (mount this only on desktop), never
 * to choose between two visible layouts, or small screens will see the wrong
 * one for a frame.
 */
export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const list = window.matchMedia(query);
    setMatches(list.matches);

    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches);
    list.addEventListener("change", onChange);
    return () => list.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}
