"use client";

import { useEffect, useState } from "react";
import { cn } from "~/lib/utils";

export type SettingsSection = { id: string; label: string };

/**
 * The section list, following the scroll.
 *
 * A section counts as current while it crosses a band a little above the
 * middle of the window — the place somebody's eyes are while reading, rather
 * than the top edge, which a short card can pass without ever being read.
 * At the very bottom of the page the last section wins, because a short final
 * card may never reach the band at all.
 */
export function SettingsNav({ sections }: { sections: SettingsSection[] }) {
  const [active, setActive] = useState(sections[0]?.id ?? "");

  useEffect(() => {
    const fromHash = window.location.hash.slice(1);
    if (sections.some((section) => section.id === fromHash)) {
      setActive(fromHash);
    }

    const targets = sections
      .map((section) => document.getElementById(section.id))
      .filter((node): node is HTMLElement => node !== null);

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: "-30% 0px -60% 0px" },
    );
    for (const target of targets) observer.observe(target);

    const last = sections.at(-1)?.id;
    function onScroll() {
      const atBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 2;
      if (atBottom && last) setActive(last);
    }
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, [sections]);

  return (
    <nav
      aria-label="Sections"
      className="-mx-4 flex gap-1 overflow-x-auto px-4 md:sticky md:top-8 md:mx-0 md:grid md:gap-0.5 md:self-start md:overflow-visible md:px-0"
    >
      {sections.map((section) => {
        const current = active === section.id;
        return (
          <a
            key={section.id}
            href={`#${section.id}`}
            onClick={() => setActive(section.id)}
            aria-current={current ? "true" : undefined}
            className={cn(
              "flex h-9 shrink-0 items-center rounded-control px-3 text-sm transition-colors duration-150 ease-[cubic-bezier(0.22,1,0.36,1)]",
              "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[color:var(--accent-ring)]",
              current
                ? "bg-card text-strong ring-1 ring-border"
                : "text-subtle hover:bg-muted hover:text-strong",
            )}
          >
            {section.label}
          </a>
        );
      })}
    </nav>
  );
}
