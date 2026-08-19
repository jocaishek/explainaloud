"use client";

import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ProgressiveBlur } from "~/components/ui/progressive-blur";
import { cn } from "~/lib/utils";

const STEPS = [
  { slug: "", label: "Course" },
  { slug: "/record", label: "Record" },
  { slug: "/gaps", label: "Gap Report" },
  { slug: "/re-teach", label: "Re-Teach" },
];

/**
 * How far from an end counts as being at it. Sub-pixel layout means
 * `scrollLeft + clientWidth` rarely equals `scrollWidth` exactly, so a strict
 * comparison leaves the fade up permanently on some zoom levels.
 */
const EDGE_SLACK = 4;

export function CourseNav({ slug }: { slug: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const base = `/home/${slug}`;
  const stillness = useReducedMotion();

  /* Which ends the track runs off, so the fade is only ever shown over
     content that is actually cut off. A fade sitting over the last tab on a
     wide screen is not an affordance, it is a smudge on the label. */
  const trackRef = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState({ start: false, end: false });

  const measure = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setOverflow({
      start: el.scrollLeft > EDGE_SLACK,
      end: el.scrollLeft + el.clientWidth < el.scrollWidth - EDGE_SLACK,
    });
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    for (const child of el.children) observer.observe(child);
    return () => observer.disconnect();
  }, [measure]);

  return (
    <div className="relative border-border border-b">
      <div
        ref={trackRef}
        onScroll={measure}
        className="flex gap-1 overflow-x-auto px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {STEPS.map((step) => {
          const href = `${base}${step.slug}`;
          const active = pathname === href;
          return (
            <Link
              key={step.label}
              href={href}
              aria-current={active ? "page" : undefined}
              onFocus={() => router.prefetch(href)}
              onPointerEnter={() => router.prefetch(href)}
              onTouchStart={() => router.prefetch(href)}
              className={cn(
                "relative whitespace-nowrap px-3 py-3 font-medium text-sm transition-colors",
                active ? "text-strong" : "text-subtle hover:text-strong",
              )}
            >
              {step.label}
              {/* The indicator travels between tabs rather than being redrawn
                  under the new one. Motion Primitives calls this an animated
                  background and does it with a shared `layoutId`, which is
                  the same trick and the right one: the four tabs are one
                  control with a position, not four controls with a state.
                  This nav lives in the segment layout, so it survives the
                  navigation and the slide actually plays — moved into a page
                  it would remount and the indicator would jump. */}
              {active ? (
                <motion.span
                  layoutId="course-nav-indicator"
                  className="absolute inset-x-0 bottom-0 h-[2px] bg-brand"
                  transition={
                    stillness
                      ? { duration: 0 }
                      : { duration: 0.28, ease: [0.23, 1, 0.32, 1] }
                  }
                />
              ) : null}
            </Link>
          );
        })}
      </div>

      {overflow.start ? (
        <ProgressiveBlur
          direction="left"
          className="absolute inset-y-0 left-0 z-10 w-10"
        />
      ) : null}
      {overflow.end ? (
        <ProgressiveBlur
          direction="right"
          className="absolute inset-y-0 right-0 z-10 w-10"
        />
      ) : null}
    </div>
  );
}
