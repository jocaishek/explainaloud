"use client";

import type { MouseEvent, ReactNode } from "react";

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
  function scrollToTarget(event: MouseEvent<HTMLAnchorElement>) {
    const target = document.getElementById(targetId);
    if (!target) return;

    event.preventDefault();
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    target.focus({ preventScroll: true });
    target.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start",
    });
    window.history.replaceState(null, "", `#${targetId}`);
  }

  return (
    <a
      href={`#${targetId}`}
      className={className}
      title={title}
      onClick={scrollToTarget}
    >
      {children}
    </a>
  );
}
