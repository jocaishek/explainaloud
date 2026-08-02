"use client";

import { useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { cn } from "~/lib/utils";

/**
 * Templates keyed on the local day of week. `{day}` is the weekday name,
 * `{name}` the user's first name.
 */
/* Short, and about the work rather than the weather.
 *
 * The longer templates — "Lovely {day}, isn't it {name}?", "Morning or not,
 * {name}, it's {day}" — ran to three lines at the masthead's old display size
 * and read as a greetings card. They are also the wrong subject: this is the
 * first line of a study tool, so the ones that point at what you came to do
 * earn their place and the ones that make small talk about Tuesday do not. */
const TEMPLATES = [
  "Welcome back, {name}",
  "Good to see you, {name}",
  "Ready when you are, {name}",
  "Back at it, {name}",
  "Let's get into it, {name}",
  "What are we learning today, {name}?",
  "Pick up where you left off, {name}",
  "Happy {day}, {name}",
] as const;

/**
 * Greets the user by name using *their* weekday.
 *
 * The date has to come from the browser: the server renders in whatever zone
 * it happens to run in, which is routinely a day off from the reader. So this
 * renders nothing until mounted, then fades the greeting in — a swap from a
 * server-guessed day to the real one would be a visible, jarring correction.
 */
export function Greeting({
  name,
  className,
}: {
  name: string;
  /**
   * Replaces the type treatment, not just an addition to it.
   *
   * The dashboard masthead sets this line at display scale in Archivo with a
   * gradient fill, and every screen that is not the masthead wants the default
   * below. Passing the whole treatment in is the honest shape — the
   * alternative is a `variant` union here that has to be edited every time a
   * second screen wants a third size.
   */
  className?: string;
}) {
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
    /* One element, always rendered.
     *
     * The greeting is only known after mount — the weekday has to come from
     * the reader's own clock, not from whatever zone the server runs in — so
     * something has to hold the line's height in the meantime or the whole
     * page jumps a frame later. A fixed `min-height` on a wrapper cannot do
     * that now that the size is passed in from the call site: the masthead
     * sets this at 7rem and every other screen at 2rem.
     *
     * A non-breaking space in the real element reserves exactly the right
     * height at whatever size it has been given, and `mask-enter` is withheld
     * until there are words, so the reveal plays on the greeting rather than
     * silently on the placeholder. */
    <h1
      className={cn(
        "mask-line text-balance",
        className ??
          "font-semibold text-[clamp(1.9rem,4.6vw,3.1rem)] text-strong leading-[1.05] tracking-[-0.035em]",
        greeting && !shouldReduceMotion && "mask-enter",
      )}
    >
      <span>{greeting ?? "\u00A0"}</span>
    </h1>
  );
}
