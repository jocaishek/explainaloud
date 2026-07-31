import "server-only";

import { notFound } from "next/navigation";
import { requireUser } from "~/lib/supabase/server";

/**
 * A course's address, derived from its topic.
 *
 * Stored on the row rather than computed on read: a computed slug would move
 * every time the topic is renamed, and a URL that changes under the person
 * holding it is not an address.
 */
export function slugify(topic: string): string {
  return (
    topic
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60)
      .replace(/-+$/g, "") || "topic"
  );
}

/**
 * The first slug in `base`, `base-2`, `base-3`… that this user is not already
 * using. Unique per user, not globally — two people studying photosynthesis
 * should both get `/home/photosynthesis`, and a global constraint would hand
 * the URL to whoever typed it first for no reason the second could see.
 */
export async function uniqueCourseSlug(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  userId: string,
  topic: string,
): Promise<string> {
  const base = slugify(topic);

  const { data } = await supabase
    .from("courses")
    .select("slug")
    .eq("user_id", userId)
    .like("slug", `${base}%`)
    .returns<Array<{ slug: string | null }>>();

  const taken = new Set((data ?? []).map((row) => row.slug));
  if (!taken.has(base)) return base;

  for (let n = 2; n < 1000; n += 1) {
    const candidate = `${base}-${n}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${base}-${Date.now()}`;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resolves a URL segment to the course it names, for the signed-in user.
 *
 * Accepts a UUID as well as a slug so that links made before slugs existed —
 * bookmarks, anything already shared — keep working instead of 404ing.
 * `notFound()` rather than a null return, because every caller is a page whose
 * only sensible response to an unknown course is the not-found page.
 */
export async function courseIdForSlug(slug: string): Promise<string> {
  const { supabase, user } = await requireUser();

  const base = supabase.from("courses").select("id").eq("user_id", user.id);
  const { data } = await (UUID.test(slug)
    ? base.eq("id", slug)
    : base.eq("slug", slug)
  ).maybeSingle<{ id: string }>();

  if (!data) notFound();
  return data.id;
}
