"use client";

import { useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

function scoreColor(score: number) {
  const hue = Math.round((Math.max(0, Math.min(100, score)) / 100) * 120);
  return `hsl(${hue} 72% 46%)`;
}

export function KnowledgeScore({
  score,
  verdict,
}: {
  score: number;
  verdict: string;
}) {
  const reduceMotion = useReducedMotion();
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

  const color = scoreColor(displayed);

  return (
    <section aria-labelledby="score-heading" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="score-heading" className="text-base font-semibold text-strong">
          Knowledge score
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
        aria-label={`Knowledge score: ${score} out of 100`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={score}
        className="h-2 overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${displayed}%`,
            backgroundColor: color,
          }}
        />
      </div>
      <p className="max-w-2xl text-sm text-foreground">{verdict}</p>
    </section>
  );
}
