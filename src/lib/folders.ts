export const FOLDER_COLORS = [
  "default",
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
] as const;

export type FolderColor = (typeof FOLDER_COLORS)[number];

/**
 * Per-colour classes. Written out in full rather than interpolated, because
 * Tailwind only ships classes it can see as literal strings in the source —
 * `bg-${color}-500` compiles to nothing.
 */
export const FOLDER_COLOR_CLASSES: Record<
  FolderColor,
  { swatch: string; border: string; tint: string; text: string; label: string }
> = {
  default: {
    swatch: "bg-subtle",
    border: "border-border",
    tint: "bg-surface",
    text: "text-subtle",
    label: "Default",
  },
  red: {
    swatch: "bg-red-500",
    border: "border-red-500/40",
    tint: "bg-red-500/[0.07]",
    text: "text-red-500",
    label: "Red",
  },
  orange: {
    swatch: "bg-orange-500",
    border: "border-orange-500/40",
    tint: "bg-orange-500/[0.07]",
    text: "text-orange-500",
    label: "Orange",
  },
  yellow: {
    swatch: "bg-yellow-500",
    border: "border-yellow-500/40",
    tint: "bg-yellow-500/[0.07]",
    text: "text-yellow-500",
    label: "Yellow",
  },
  green: {
    swatch: "bg-green-500",
    border: "border-green-500/40",
    tint: "bg-green-500/[0.07]",
    text: "text-green-500",
    label: "Green",
  },
  blue: {
    swatch: "bg-blue-500",
    border: "border-blue-500/40",
    tint: "bg-blue-500/[0.07]",
    text: "text-blue-500",
    label: "Blue",
  },
  purple: {
    swatch: "bg-purple-500",
    border: "border-purple-500/40",
    tint: "bg-purple-500/[0.07]",
    text: "text-purple-500",
    label: "Purple",
  },
};

export function isFolderColor(value: unknown): value is FolderColor {
  return (
    typeof value === "string" &&
    (FOLDER_COLORS as readonly string[]).includes(value)
  );
}

export function folderNameError(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "Give the folder a name.";
  if (trimmed.length > 60) return "That folder name is too long.";
  return null;
}

export function topicNameError(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "Give the topic a name.";
  if (trimmed.length > 120) return "That name is too long.";
  return null;
}

export type Folder = {
  id: string;
  name: string;
  color: FolderColor;
  created_at: string;
};

export type Course = {
  id: string;
  topic: string;
  /**
   * The course's URL segment. Null only for rows created between the slug
   * migration and the deploy that started writing one, which fall back to
   * being addressed by id.
   */
  slug: string | null;
  /** User-chosen display name; null means it was never renamed. */
  name: string | null;
  status: string;
  folder_id: string | null;
  created_at: string;
};

/** Where a course lives. Slug when it has one, id for the rows that don't. */
export function courseHref(course: Pick<Course, "id" | "slug">) {
  return `/home/${course.slug ?? course.id}`;
}

/** What to show as the card's title. */
export function courseTitle(course: Pick<Course, "name" | "topic">) {
  return course.name?.trim() || course.topic;
}
