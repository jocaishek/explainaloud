import { NextResponse } from "next/server";
import { probeProviders } from "~/lib/ai/provider";
import { requireAdmin } from "~/lib/supabase/server";

/**
 * Admin-only provider health check.
 *
 * "This service can't be used at the moment" is deliberately vague for
 * students, which leaves an operator with nothing to act on: a missing key, a
 * revoked key and a rate limit all look identical. This reports which of the
 * three is true, without ever returning a key or any part of one.
 */
export async function GET() {
  await requireAdmin();

  const results = await probeProviders();
  const usable = results.some((result) => result.ok);

  return NextResponse.json(
    { usable, providers: results },
    { status: usable ? 200 : 503 },
  );
}
