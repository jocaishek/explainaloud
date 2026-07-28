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
    target.scrollIntoView({
      behavior: "instant",
      block: "start",
    });
    target.focus({ preventScroll: true });
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
