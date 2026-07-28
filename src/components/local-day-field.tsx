"use client";

import { useEffect, useState } from "react";
import { localDay } from "~/lib/limits";

/**
 * Carries the browser's own calendar date into a server action.
 *
 * Daily quotas have to reset at the student's midnight. The server only knows
 * its own timezone, so without this a user in Auckland would get a new day
 * around lunchtime. Rendered empty on the server and filled after mount to
 * avoid a hydration mismatch; the action falls back to the server date if
 * this somehow never runs.
 */
export function LocalDayField() {
  const [day, setDay] = useState("");

  useEffect(() => setDay(localDay()), []);

  return <input type="hidden" name="day" value={day} readOnly />;
}
