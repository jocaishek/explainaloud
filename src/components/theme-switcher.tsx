"use client";

import { motion } from "framer-motion";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useId, useState } from "react";
import { cn } from "~/lib/utils";

const OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

/**
 * Segmented light / dark / system control. The selected pill is a shared
 * layout animation, so switching slides the highlight across rather than
 * blinking it into a new position.
 */
export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const layoutId = useId();
  const [mounted, setMounted] = useState(false);

  // next-themes can't know the resolved theme until it has read localStorage
  // and the media query, so rendering a selection during SSR would guarantee
  // a hydration mismatch. Render the shell, fill in the selection after.
  useEffect(() => setMounted(true), []);

  // Real radio inputs rather than buttons with role="radio": arrow-key
  // navigation, form semantics and screen-reader grouping all come for free.
  return (
    <fieldset className="inline-flex gap-1 rounded-full border border-border bg-surface p-1">
      <legend className="sr-only">Colour theme</legend>
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const selected = mounted && theme === value;
        return (
          <label
            key={value}
            className={cn(
              "relative flex cursor-pointer items-center gap-2 rounded-control px-3.5 py-1.5 text-sm font-medium transition-colors duration-200",
              "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1 focus-within:ring-offset-background",
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
                transition={{ type: "spring", duration: 0.4, bounce: 0.15 }}
                className="absolute inset-0 rounded-full bg-background shadow-sm"
              />
            )}
            <Icon className="relative size-4" />
            <span className="relative">{label}</span>
          </label>
        );
      })}
    </fieldset>
  );
}
