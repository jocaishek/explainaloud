"use client";

import type { MouseEvent, ReactNode } from "react";

/**
 * A red phrase in the transcript, wired to the weakness that explains it.
 *
 * The target is marked with an attribute rather than left to `:target`,
 * because the highlight has to survive being clicked twice and has to read as
 * a highlight when the two panels sit side by side — where the browser's own
 * hash behaviour scrolls a column that was already fully in view.
 *
 * The scroll is conditional for the same reason: on a wide screen the matching
 * weakness is usually already visible, and yanking the page towards something
 * the reader can already see is worse than not moving at all.
 */
export function ScrollToTargetLink({
  targetId,
  className,
  title,
  children,
}: {
  targetId: string;
  className?: string;
  title?: string;
  children: ReactNode;
}) {
  function selectTarget(event: MouseEvent<HTMLAnchorElement>) {
    const target = document.getElementById(targetId);
    if (!target) return;

    event.preventDefault();

    for (const previous of document.querySelectorAll("[data-highlighted]")) {
      previous.removeAttribute("data-highlighted");
    }
    target.setAttribute("data-highlighted", "true");
    target.focus({ preventScroll: true });

    const box = target.getBoundingClientRect();
    const offScreen = box.top < 72 || box.bottom > window.innerHeight - 24;
    if (offScreen) {
      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      target.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "center",
      });
    }
  }

  return (
    <a
      href={`#${targetId}`}
      className={className}
      title={title}
      onClick={selectTarget}
    >
      {children}
    </a>
  );
}
