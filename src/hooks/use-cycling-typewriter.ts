"use client";

import { useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

/**
 * Types a phrase out character by character, holds it, deletes it, then moves
 * to the next one — looping forever. Used for the rotating examples in the
 * hero and the record mockup.
 *
 * Under reduced motion it settles on the first phrase and stops, rather than
 * looping text in the user's peripheral vision indefinitely.
 */
export function useCyclingTypewriter(
  phrases: string[],
  {
    typeMs = 55,
    deleteMs = 28,
    holdMs = 1800,
  }: { typeMs?: number; deleteMs?: number; holdMs?: number } = {},
) {
  const shouldReduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [length, setLength] = useState(0);
  const [deleting, setDeleting] = useState(false);

  const phrase = phrases[index] ?? "";

  useEffect(() => {
    if (shouldReduceMotion) return;

    // Fully typed: hold, then start deleting.
    if (!deleting && length === phrase.length) {
      const id = setTimeout(() => setDeleting(true), holdMs);
      return () => clearTimeout(id);
    }

    // Fully deleted: advance to the next phrase.
    if (deleting && length === 0) {
      setDeleting(false);
      setIndex((i) => (i + 1) % phrases.length);
      return;
    }

    const id = setTimeout(
      () => setLength((n) => n + (deleting ? -1 : 1)),
      deleting ? deleteMs : typeMs,
    );
    return () => clearTimeout(id);
  }, [
    shouldReduceMotion,
    deleting,
    length,
    phrase.length,
    phrases.length,
    typeMs,
    deleteMs,
    holdMs,
  ]);

  return {
    text: shouldReduceMotion ? phrase : phrase.slice(0, length),
    /** True while the caret should blink rather than sit mid-word. */
    idle: !shouldReduceMotion && !deleting && length === phrase.length,
    done: shouldReduceMotion,
  };
}
