"use client";

import { useEffect, useState } from "react";
import { useMediaQuery } from "~/hooks/use-media-query";
import { cn } from "~/lib/utils";

function scoreColor(score: number) {
  const hue = Math.round((Math.max(0, Math.min(100, score)) / 100) * 120);
  return `hsl(${hue} 72% 46%)`;
}

export function KnowledgeScore({
  score,
  verdict,
  /**
   * What the number is measuring, in the words of this course's purpose.
   *
   * "Knowledge score" is the right noun for an explanation and the wrong one
   * for a rehearsal: somebody running through a talk they wrote is not being
   * told whether they know it, they are being told how much of their own
   * material they got through. Defaulted, so every existing caller is
   * unchanged.
   */
  heading = "Knowledge score",
}: {
  score: number;
  verdict: string;
  heading?: string;
}) {
  // The media query directly, rather than framer-motion's hook. This component
  // is on the first screen of the gap report and pulled the whole animation
  // library in for one boolean — 43kB gzipped to answer a question the browser
  // will answer for free.
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    if (reduceMotion || score === 0) {
      setDisplayed(score);
      return;
    }

    let frame = 0;
    const startedAt = performance.now();
    const duration = 1100;
    function tick(now: number) {
      const progress = Math.min(1, (now - startedAt) / duration);
      // Ease-out quart: fast progress immediately, then a deliberate settle.
      const eased = 1 - (1 - progress) ** 4;
      setDisplayed(Math.round(score * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    }

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [reduceMotion, score]);

  // One frame at zero, then the real value, so the transition has something
  // to travel from. Setting the final width on the first paint would arrive
  // already full.
  const [grown, setGrown] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const color = scoreColor(displayed);

  return (
    <section
      aria-labelledby="score-heading"
      /* The landing page's panel. This block was the loudest thing on the
         report and the only one with no surface under it — a score, a bar and
         a sentence floating on the page canvas. */
      className="flex flex-col gap-3 rounded-card border border-border bg-card p-5 shadow-rest sm:p-6"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="score-heading" className="text-base font-semibold text-strong">
          {heading}
        </h2>
        <p
          className="font-mono text-2xl font-semibold tabular-nums"
          style={{ color }}
        >
          <span aria-hidden>{displayed}</span>
          <span className="sr-only">{score}</span>
          <span className="text-sm font-normal text-subtle"> / 100</span>
        </p>
      </div>
      <div
        role="progressbar"
        aria-label={`${heading}: ${score} out of 100`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={score}
        className="h-2 overflow-hidden rounded-full bg-muted"
      >
        {/* The bar is one CSS transition on `transform`, not a width set from
            React every frame.
            Two reasons. Width was being written as a whole percent a hundred
            times over a second, so the bar advanced in visible 1% steps and
            each step was a React render and a layout pass. And `transform` is
            composited: the browser can run it off the main thread, which is
            the difference between smooth and nearly smooth on a phone that is
            also parsing the rest of the page. */}
        <div
          className={cn(
            "h-full origin-left rounded-full",
            !reduceMotion &&
              "transition-transform duration-[1100ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
          )}
          style={{
            transform: `scaleX(${(grown ? score : 0) / 100})`,
            backgroundColor: color,
          }}
        />
      </div>
      <p className="max-w-2xl text-foreground text-sm leading-relaxed">
        {verdict}
      </p>
    </section>
  );
}
