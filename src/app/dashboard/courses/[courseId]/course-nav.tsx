"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "~/lib/utils";

const STEPS = [
  { slug: "", label: "Course" },
  { slug: "/record", label: "Record" },
  { slug: "/gaps", label: "Gap Report" },
  { slug: "/re-teach", label: "Re-Teach" },
  { slug: "/re-explain", label: "Re-Explain" },
];

export function CourseNav({ courseId }: { courseId: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const base = `/dashboard/courses/${courseId}`;

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-border px-6">
      {STEPS.map((step) => {
        const href = `${base}${step.slug}`;
        const active = pathname === href;
        return (
          <Link
            key={step.label}
            href={href}
            onFocus={() => router.prefetch(href)}
            onPointerEnter={() => router.prefetch(href)}
            onTouchStart={() => router.prefetch(href)}
            className={cn(
              "whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition-colors",
              active
                ? "border-brand text-strong"
                : "border-transparent text-subtle hover:text-strong",
            )}
          >
            {step.label}
          </Link>
        );
      })}
    </nav>
  );
}
