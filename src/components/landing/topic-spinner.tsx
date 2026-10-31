"use client";

import { type CSSProperties, useEffect, useRef, useState } from "react";
import { cn } from "~/lib/utils";
import styles from "./landing.module.css";
import { createScheduler } from "./spoken";
import { useReducedMotion } from "./use-reduced-motion";

/* The headline opens on the product's own name, then turns over to the
   things people explain with it. */
const TOPICS = [
  "explainaloud",
  "Newton's third law",
  "the New Deal",
  "cell division",
  "supply and demand",
  "photosynthesis",
  "the French Revolution",
  "derivatives",
  "how vaccines work",
  "the water cycle",
  "Romeo and Juliet",
];

type Item = { id: number; text: string; phase: "in" | "cur" | "out" };

export function TopicSpinner() {
  const reduced = useReducedMotion();
  const [items, setItems] = useState<Item[]>([
    { id: 0, text: TOPICS[0], phase: "cur" },
  ]);
  const [width, setWidth] = useState<string>();
  const rulerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let cancelled = false;
    const schedule = createScheduler();
    const frames: number[] = [];
    let interval: number | undefined;

    const widthOf = (text: string) => {
      const ruler = rulerRef.current;
      if (!ruler) return undefined;
      ruler.textContent = text;
      return `${Math.ceil(ruler.getBoundingClientRect().width) + 24}px`;
    };

    let index = 0;
    const spin = () => {
      index += 1;
      const id = index;
      const text = TOPICS[id % TOPICS.length];
      setWidth(widthOf(text));
      setItems((prev) => [
        ...prev
          .filter((item) => item.phase !== "out")
          .map((item) => ({ ...item, phase: "out" as const })),
        { id, text, phase: "in" },
      ]);
      // Two frames, so the entering word is painted below before it rises.
      frames.push(
        requestAnimationFrame(() => {
          frames.push(
            requestAnimationFrame(() =>
              setItems((prev) =>
                prev.map((item) =>
                  item.id === id ? { ...item, phase: "cur" } : item,
                ),
              ),
            ),
          );
        }),
      );
      schedule.at(700, () =>
        setItems((prev) => prev.filter((item) => item.id >= id)),
      );
    };

    document.fonts.ready.then(() => {
      if (cancelled) return;
      setWidth(widthOf(TOPICS[0]));
      if (reduced) return;
      // The name holds a little longer than the rest, so it reads first.
      schedule.at(3200, () => {
        spin();
        interval = window.setInterval(spin, 2600);
      });
    });

    return () => {
      cancelled = true;
      schedule.clear();
      for (const frame of frames) cancelAnimationFrame(frame);
      window.clearInterval(interval);
    };
  }, [reduced]);

  return (
    <>
      <span
        aria-hidden="true"
        className={styles.spin}
        style={width ? ({ "--w": width } as CSSProperties) : undefined}
      >
        {items.map((item) => (
          <span
            key={item.id}
            className={cn(
              item.phase === "in" && styles.spinIn,
              item.phase === "out" && styles.spinOut,
            )}
          >
            {item.text}
          </span>
        ))}
      </span>
      <span ref={rulerRef} aria-hidden="true" className={styles.ruler}>
        {TOPICS[0]}
      </span>
    </>
  );
}
