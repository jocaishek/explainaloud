"use client";

import { cn } from "~/lib/utils";

/**
 * One half of the outside-sources choice.
 *
 * A real radio rather than a styled button, so the pair is one arrow-key group
 * to a keyboard and one option to a screen reader — and so, on the create
 * form, the value reaches `createCourse` through the same FormData as every
 * other field without a hidden input shadowing it.
 *
 * `name` differs between the two callers: the create form posts a real form,
 * the course page holds the value in state and sends it as JSON. Both still
 * need a name, or the two radios do not form a group.
 */
export function SourceScopeOption({
  name,
  value,
  checked,
  onSelect,
  title,
  description,
}: {
  name: string;
  value: "on" | "off";
  checked: boolean;
  onSelect: () => void;
  title: string;
  description: string;
}) {
  return (
    <label
      className={cn(
        "flex flex-1 cursor-pointer flex-col gap-1 rounded-lg border p-3 transition-colors",
        checked
          ? "border-brand bg-brand/[0.06]"
          : "border-border bg-card hover:border-brand/40",
      )}
    >
      <span className="flex items-center gap-2">
        <input
          type="radio"
          name={name}
          value={value}
          checked={checked}
          onChange={onSelect}
          className="size-3.5 shrink-0 accent-brand"
        />
        <span className="text-sm font-medium text-strong">{title}</span>
      </span>
      <span className="text-xs leading-5 text-subtle">{description}</span>
    </label>
  );
}

/** The two options, worded the same wherever the question is asked. */
export const SCOPE_OPTIONS = {
  open: {
    title: "Yes, fill the gaps",
    description:
      "Your files lead, and the course adds background, videos, and further reading around them.",
  },
  strict: {
    title: "No, my files only",
    description:
      "Built strictly from what you uploaded. No videos, no reading links, and anything your files skip is listed as not covered.",
  },
} as const;

export const SCOPE_QUESTION = "Use anything beyond your files?";
