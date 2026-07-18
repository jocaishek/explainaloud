"use client";

import { useEffect, useState } from "react";
import { useInView } from "~/hooks/use-in-view";

export function useTypewriter(words: string[], stepMs = 130) {
  const { ref, visible } = useInView<HTMLDivElement>();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!visible || count >= words.length) return;
    const id = setTimeout(() => setCount((c) => c + 1), stepMs);
    return () => clearTimeout(id);
  }, [visible, count, words.length, stepMs]);

  return {
    ref,
    visibleWords: words.slice(0, count),
    done: count >= words.length,
  };
}
