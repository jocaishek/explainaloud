import { NextResponse } from "next/server";
import { z } from "zod";
import {
  AiUnavailableError,
  completeJson,
  probeProviders,
} from "~/lib/ai/provider";
import { requireAdmin } from "~/lib/supabase/server";
import { probeSearch } from "~/lib/video-search";

/**
 * Admin-only provider health check.
 *
 * "This service can't be used at the moment" is deliberately vague for
 * students, which leaves an operator with nothing to act on: a missing key, a
 * revoked key and a rate limit all look identical. This reports which of the
 * three is true, without ever returning a key or any part of one.
 */
/** Smallest possible exercise of the real failover path. */
const probeSchema = z.object({ ok: z.boolean() });

export async function GET(request: Request) {
  await requireAdmin();

  const results = await probeProviders();
  const usable = results.some((result) => result.ok);

  /* The search key too, because it fails the same way and was not reported.
     A deep probe spends one search credit, so it only runs when asked — the
     shallow answer already separates "not configured" from "configured", and
     that is the distinction that was missing. */
  const deep = new URL(request.url).searchParams.get("deep") === "1";
  const search = await probeSearch(deep);

  // `?deep=1` runs an actual completion through the same failover chain the
  // course builder uses. A reachable key still fails the real path when the
  // minute's token budget is spent or a model returns unusable JSON, and only
  // this reproduces that. AiUnavailableError's message is the per-attempt
  // failure list — the detail otherwise buried in the server log.
  let live: { ok: boolean; provider?: string; detail?: string } | undefined;
  if (deep) {
    try {
      const result = await completeJson(
        // Groq rejects `response_format: json_object` unless the message text
        // contains the word "json", so the probe must say it too — otherwise
        // the health check reports a 400 the real prompts never hit.
        'Return JSON exactly equal to {"ok":true} and nothing else.',
        (value) => probeSchema.parse(value),
        { maxOutputTokens: 128 },
      );
      live = { ok: true, provider: result.provider };
    } catch (error) {
      live = {
        ok: false,
        detail:
          error instanceof AiUnavailableError
            ? error.message
            : error instanceof Error
              ? error.message
              : String(error),
      };
    }
  }

  const healthy = live ? live.ok : usable;

  return NextResponse.json(
    { usable, providers: results, live, search },
    { status: healthy ? 200 : 503 },
  );
}
