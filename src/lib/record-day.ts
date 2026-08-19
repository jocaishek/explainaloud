"use client";

import { STREAK_EVENT, type StreakEvent } from "~/lib/streak";
import { createClient } from "~/lib/supabase/client";

/**
 * Files a finished recording against today, and tells the page what that did.
 *
 * Called from the browser rather than from the server, and the reason is the
 * timezone. Which calendar day a recording belongs to is a question about
 * where the person is standing, and the only place that is reliably known is
 * the machine they are standing at — `Intl` reports the zone the operating
 * system is set to, where an IP reports where the traffic came out, which a
 * VPN moves and the person does not.
 *
 * The profile carries a zone captured at onboarding as the fallback, used when
 * a recording is filed by something other than this browser. Here, live, the
 * browser is the better answer: somebody who flew to Tokyo on Tuesday is
 * recording on Tokyo's Wednesday whatever their profile still says.
 *
 * Best effort, and deliberately not awaited by anything that matters. A streak
 * is a nice thing to have; it is not the recording, and no failure here may
 * cost somebody the take they just gave.
 */
export async function markRecordingDay(): Promise<StreakEvent | null> {
  let zone = "UTC";
  try {
    zone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    // An environment with no zone database. UTC, and the streak is still real.
  }

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .rpc("record_today", { zone })
      .maybeSingle<{
        local_day: string;
        sessions_today: number;
        streak: number;
        is_first_today: boolean;
      }>();

    if (error || !data) {
      if (error) console.error("Couldn't record today's streak day:", error);
      return null;
    }

    const event: StreakEvent = {
      streak: data.streak,
      day: data.local_day,
      sessions: data.sessions_today,
      isFirstToday: data.is_first_today,
    };

    /* A window event rather than a context.
     *
     * The toast lives in the app shell and the recording lives four routes
     * down inside it, so a provider would mean threading a callback through
     * every component in between — including a 1900-line console whose job is
     * audio, not notifications. The shell listens, the console announces, and
     * neither imports the other. */
    window.dispatchEvent(new CustomEvent(STREAK_EVENT, { detail: event }));
    return event;
  } catch (thrown) {
    console.error("Couldn't record today's streak day:", thrown);
    return null;
  }
}
