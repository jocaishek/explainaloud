export const USE_TYPES = ["school", "teacher", "personal"] as const;
export type UseType = (typeof USE_TYPES)[number];

export const USE_TYPE_LABELS: Record<
  UseType,
  { title: string; description: string }
> = {
  school: {
    title: "School",
    description: "I'm a student studying for my own courses.",
  },
  teacher: {
    title: "Teaching",
    description: "I teach, and I want to see where students are shaky.",
  },
  personal: {
    title: "Personal",
    description: "I'm learning something on my own, outside of school.",
  },
};

/** Youngest age we'll accept, matching the minimum for a self-managed account. */
export const MIN_AGE_YEARS = 13;

export function isUseType(value: unknown): value is UseType {
  return (
    typeof value === "string" &&
    (USE_TYPES as readonly string[]).includes(value)
  );
}

export function nameError(value: string, field: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return `Enter your ${field}.`;
  if (trimmed.length > 80) return `That ${field} is too long.`;
  // Letters, marks, spaces, hyphens and apostrophes — permissive enough for
  // names from any script, strict enough to reject digits and symbols.
  if (!/^[\p{L}\p{M}][\p{L}\p{M}\s'’-]*$/u.test(trimmed)) {
    return `That doesn't look like a ${field}.`;
  }
  return null;
}

/**
 * Validates a yyyy-mm-dd date of birth. Age is computed against the caller's
 * local "today" — a birthday shouldn't unlock an hour late because the server
 * sits in a different timezone.
 */
export function dateOfBirthError(
  value: string,
  today = new Date(),
): string | null {
  if (!value) return "Enter your date of birth.";

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return "Enter your date of birth as YYYY-MM-DD.";

  const [, y, m, d] = match;
  const year = Number(y);
  const month = Number(m);
  const day = Number(d);

  const parsed = new Date(year, month - 1, day);
  // Round-trip check catches impossible dates like 2026-02-31, which the Date
  // constructor silently rolls forward into March.
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return "That date doesn't exist.";
  }

  if (parsed > today) return "Your date of birth can't be in the future.";
  if (year < 1900) return "Enter a real date of birth.";

  let age = today.getFullYear() - year;
  const hasHadBirthday =
    today.getMonth() > month - 1 ||
    (today.getMonth() === month - 1 && today.getDate() >= day);
  if (!hasHadBirthday) age -= 1;

  if (age < MIN_AGE_YEARS) {
    return `You need to be at least ${MIN_AGE_YEARS} to create an account.`;
  }

  return null;
}
