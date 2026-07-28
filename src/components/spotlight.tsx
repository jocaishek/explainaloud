"use client";

import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "framer-motion";
import { type PointerEvent, useRef } from "react";
import { cn } from "~/lib/utils";

/**
 * Adds a soft brand-tinted highlight that follows the cursor across a glass
 * surface — the thing that sells frosted material as a real, lit panel.
 *
 * The gradient lives on its own absolutely-positioned overlay and is driven by
 * motion values written straight to that node's style, so moving the pointer
 * never invalidates the card's children.
 */
export function Spotlight({
  children,
  className,
  radius = 300,
}: {
  children: React.ReactNode;
  className?: string;
  radius?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const x = useMotionValue(-9999);
  const y = useMotionValue(-9999);
  const opacity = useSpring(0, { stiffness: 200, damping: 30 });
  const background = useMotionTemplate`radial-gradient(${radius}px circle at ${x}px ${y}px, rgba(74, 144, 226, 0.20), transparent 70%)`;

  function handlePointerMove(e: PointerEvent<HTMLDivElement>) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    x.set(e.clientX - rect.left);
    y.set(e.clientY - rect.top);
  }

  if (shouldReduceMotion) {
    return <div className={cn("relative", className)}>{children}</div>;
  }

  return (
    <div
      ref={ref}
      onPointerMove={handlePointerMove}
      onPointerEnter={() => opacity.set(1)}
      onPointerLeave={() => opacity.set(0)}
      className={cn("relative", className)}
    >
      <motion.div
        aria-hidden
        style={{ background, opacity }}
        className="pointer-events-none absolute inset-0 z-0 rounded-[inherit]"
      />
      <div className="relative z-10 flex h-full flex-col">{children}</div>
    </div>
  );
}
