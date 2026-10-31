import { cache } from "react";
import { createClient } from "~/lib/supabase/server";

/**
 * The reader's current streak, counted in their own timezone.
 *
 * Cached for the render pass: the app layout shows it at the foot of the rail
 * on every screen, and home and settings show it again, so without this one
 * request asked the database the same question twice. A failure reads as no
 * streak — on a dashboard the difference is invisible, and the alternative is
 * an error state for a decoration.
 */
export const ownStreak = cache(async (zone: string): Promise<number> => {
  const supabase = await createClient();
  const { data } = await supabase.rpc("own_streak", { zone });
  return typeof data === "number" ? data : 0;
});
