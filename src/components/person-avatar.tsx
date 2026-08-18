import { cn } from "~/lib/utils";

/**
 * Somebody's picture, or their initials when there isn't one.
 *
 * Initials rather than a generic silhouette: a friend list of eight identical
 * grey heads is a list you have to read every line of, where two letters in
 * the accent wash are enough to find the person you are looking for at a
 * glance.
 */
export function PersonAvatar({
  firstName,
  lastName,
  avatarUrl,
  size = 40,
  className,
}: {
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  /** Pixels. Passed to `img` too, so the browser reserves the box. */
  size?: number;
  className?: string;
}) {
  const initials =
    `${firstName.at(0) ?? ""}${lastName.at(0) ?? ""}`.toUpperCase() || "?";

  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: Math.round(size * 0.34) }}
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent-wash font-medium text-brand-ink",
        className,
      )}
    >
      {avatarUrl ? (
        // biome-ignore lint/performance/noImgElement: a fixed-size avatar from Supabase storage; see profile/avatar-picker.tsx
        <img
          src={avatarUrl}
          alt=""
          width={size}
          height={size}
          className="size-full object-cover"
        />
      ) : (
        initials
      )}
    </span>
  );
}
