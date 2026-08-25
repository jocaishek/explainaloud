"use server";

import { requireUser } from "~/lib/supabase/server";

/**
 * Record that the first-run tour has been shown to this account.
 *
 * Called once, when the tour renders — not when it is dismissed. The failure
 * being fixed is the tour coming back, and every step names something that is
 * on screen anyway, so a tour that was opened and then navigated away from has
 * done its job well enough. Marking on dismissal only would leave the repeat
 * in place for the most common mobile behaviour there is: reading the first
 * card, tapping the thing it points at, and never pressing Done.
 *
 * Deliberately silent on failure. A write that does not land means the tour
 * appears once more, which is the old behaviour and not worth an error state
 * on somebody's first screen.
 */
export async function markTourSeen(): Promise<void> {
  try {
    const { supabase, user } = await requireUser();
    await supabase
      .from("profiles")
      .update({ tour_seen_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("tour_seen_at", null);
  } catch {
    // See above.
  }
}
