"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useTheme } from "next-themes";
import { useEffect, useId, useState } from "react";
import { cn } from "~/lib/utils";

const OPTIONS = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
] as const;

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Segmented light / dark / system control. The selected segment is a shared
 * layout animation, so switching slides the highlight across rather than
 * blinking it into a new position — and simply moves it under reduced motion.
 */
export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const layoutId = useId();
  const reduced = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  // next-themes can't know the resolved theme until it has read localStorage
  // and the media query, so rendering a selection during SSR would guarantee
  // a hydration mismatch. Render the shell, fill in the selection after.
  useEffect(() => setMounted(true), []);

  // Real radio inputs rather than buttons with role="radio": arrow-key
  // navigation, form semantics and screen-reader grouping all come for free.
  return (
    <fieldset className="inline-flex gap-0.5 rounded-control bg-muted p-0.5">
      <legend className="sr-only">Colour theme</legend>
      {OPTIONS.map(({ value, label }) => {
        const selected = mounted && theme === value;
        return (
          <label
            key={value}
            className={cn(
              "relative flex h-8 cursor-pointer items-center rounded-[calc(var(--r-control)-2px)] px-3.5 font-medium text-sm transition-colors duration-150 ease-[cubic-bezier(0.22,1,0.36,1)]",
              "focus-within:ring-[3px] focus-within:ring-[color:var(--accent-ring)]",
              selected ? "text-strong" : "text-subtle hover:text-strong",
            )}
          >
            <input
              type="radio"
              name={`${layoutId}-theme`}
              value={value}
              checked={selected}
              onChange={() => setTheme(value)}
              className="sr-only"
            />
            {selected && (
              <motion.span
                layoutId={layoutId}
                transition={
                  reduced ? { duration: 0 } : { duration: 0.24, ease: EASE }
                }
                className="absolute inset-0 rounded-[calc(var(--r-control)-2px)] bg-card shadow-rest ring-1 ring-border"
              />
            )}
            <span className="relative">{label}</span>
          </label>
        );
      })}
    </fieldset>
  );
}
