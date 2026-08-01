"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

const EASE = [0.23, 1, 0.32, 1] as const;

/**
 * Templates keyed on the local day of week. `{day}` is the weekday name,
 * `{name}` the user's first name.
 */
const TEMPLATES = [
  "Have a good {day}, {name}",
  "Lovely {day}, isn't it {name}?",
  "{day} again, {name}",
  "Make it a good {day}, {name}",
  "Happy {day}, {name}",
  "Welcome back, {name}",
  "Good to see you, {name}",
  "Ready when you are, {name}",
  "Hey {name}, {day} treating you well?",
  "Let's get into it, {name}",
  "{name}, what are we learning this {day}?",
  "Back at it, {name}",
  "Morning or not, {name}, it's {day}",
  "Hope your {day}'s going well, {name}",
] as const;

/**
 * Greets the user by name using *their* weekday.
 *
 * The date has to come from the browser: the server renders in whatever zone
 * it happens to run in, which is routinely a day off from the reader. So this
 * renders nothing until mounted, then fades the greeting in — a swap from a
 * server-guessed day to the real one would be a visible, jarring correction.
 */
export function Greeting({ name }: { name: string }) {
  const shouldReduceMotion = useReducedMotion();
  const [greeting, setGreeting] = useState<string | null>(null);

  useEffect(() => {
    const now = new Date();
    const day = now.toLocaleDateString(undefined, { weekday: "long" });
    // Re-rolled on every visit. Runs in an effect rather than during render,
    // so the server and the first client pass agree and there's no hydration
    // mismatch from the randomness.
    const template =
      TEMPLATES[Math.floor(Math.random() * TEMPLATES.length)] ?? TEMPLATES[0];
    setGreeting(template.replaceAll("{day}", day).replaceAll("{name}", name));
  }, [name]);

  return (
    // Reserve the line's height so the rest of the page doesn't jump when the
    // greeting arrives a frame later.
    <div className="min-h-[2.5rem] sm:min-h-[2.75rem]">
      {greeting && (
        <motion.h1
          /* A fade and a short rise, and nothing else.
           *
           * This used to blur in from six pixels of Gaussian, which is the
           * per-word reveal the rest of the app was rebuilt to get rid of: it
           * makes the first thing you read every session momentarily
           * unreadable, in exchange for a flourish nobody asked for. */
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE }}
          className="text-balance font-medium text-[clamp(1.6rem,3.4vw,2.2rem)] text-strong leading-[1.1] tracking-[-0.03em]"
        >
          {greeting}
        </motion.h1>
      )}
    </div>
  );
}
