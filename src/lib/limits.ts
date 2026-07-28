import type { SupabaseClient } from "@supabase/supabase-js";

/** Free-tier daily caps. */
export const DAILY_LIMITS = {
  topic: 2,
  recording: 5,
} as const;

export type QuotaKind = keyof typeof DAILY_LIMITS;

export const QUOTA_MESSAGES: Record<QuotaKind, string> = {
  topic: `You've hit today's limit of ${DAILY_LIMITS.topic} new topics. It resets at midnight your time.`,
  recording: `You've hit today's limit of ${DAILY_LIMITS.recording} recordings. It resets at midnight your time.`,
};

/**
 * The caller's local calendar date as YYYY-MM-DD.
 *
 * Quota days are the *user's* days. Using the server's date would reset a
 * student in Auckland at 1pm and one in Los Angeles at 4pm the day before.
 * `toISOString` is UTC, so it can't be used here.
 */
export function localDay(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Claims one unit of quota atomically. Returns false when the user is already
 * at their cap for that day.
 *
 * The check and the increment are the same operation on purpose — a
 * read-then-write would let two tabs slip past the last slot together.
 */
export async function claimQuota(
  supabase: SupabaseClient,
  kind: QuotaKind,
  day: string,
): Promise<{ ok: boolean; message?: string }> {
  const { data, error } = await supabase.rpc("claim_daily_quota", {
    p_kind: kind,
    p_day: day,
    p_limit: DAILY_LIMITS[kind],
  });

  if (error) {
    return {
      ok: false,
      message: "Couldn't check your daily limit. Try again.",
    };
  }
  if (data !== true) {
    return { ok: false, message: QUOTA_MESSAGES[kind] };
  }
  return { ok: true };
}

export type UsageToday = { topics_created: number; recordings_started: number };

export async function usageToday(
  supabase: SupabaseClient,
  userId: string,
  day: string,
): Promise<UsageToday> {
  const { data } = await supabase
    .from("usage_daily")
    .select("topics_created, recordings_started")
    .eq("user_id", userId)
    .eq("day", day)
    .maybeSingle<UsageToday>();

  return data ?? { topics_created: 0, recordings_started: 0 };
}
