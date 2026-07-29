import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Per-user ceilings on the routes that spend money.
 *
 * These exist because the AI routes call Gemini and Groq on a key the whole
 * project shares, and until now a signed-in caller could invoke them in a loop.
 * The bill is one problem; the shared provider rate limit is the sharper one,
 * since exhausting it breaks grading for everyone at once.
 *
 * Note what this is *not*: it is not the plan's daily quota. Those are product
 * limits, live in `claim_daily_quota`, and are counted per topic and per
 * recording. This is an abuse ceiling counted per HTTP request, set far above
 * anything a person does by hand — the two answer different questions and
 * deliberately do not share a mechanism.
 */
export const RATE_BUCKETS = ["analyze", "transcribe", "generate"] as const;

export type RateBucket = (typeof RATE_BUCKETS)[number];

/**
 * Claims one call against a bucket's per-minute and per-day ceilings.
 *
 * The actual numbers live in the database function, not here: this module runs
 * on the server today, but a limit is only a limit if the side being limited
 * cannot choose it, and keeping them in one place that no client can reach
 * means that stays true however this is called later.
 *
 * Fails open on an unexpected database error, and only on that. A limiter that
 * takes the whole product down when its bookkeeping table is briefly unhappy
 * has done more damage than the abuse it was guarding against — the ceilings
 * are a backstop, not the security boundary. Authentication and ownership
 * checks, which *are* the boundary, have already run by this point.
 */
export async function claimApiCall(
  supabase: SupabaseClient,
  bucket: RateBucket,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("claim_api_call", {
    p_bucket: bucket,
  });

  if (error) {
    console.error("Rate limit check failed", {
      bucket,
      code: error.code,
      message: error.message,
    });
    return true;
  }

  return data === true;
}

/**
 * What a caller sees when they hit a ceiling.
 *
 * Worded for the person who got there by using the product hard rather than by
 * attacking it, since that is who will actually read it. Someone in a loop is
 * not reading error copy.
 */
export const RATE_LIMITED_MESSAGE =
  "You're going faster than we can keep up with. Wait a minute and try again.";
