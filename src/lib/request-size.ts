/**
 * Refuses an over-sized upload before its bytes are read.
 *
 * `await request.formData()` buffers the *entire* body before anything can
 * look at it, so a size check written after that line has already paid for
 * what it is about to reject: a 500 MB POST to a route with a 5 MB ceiling is
 * 500 MB held in a function that is billed by active CPU and memory, and
 * enough of them at once is the whole instance.
 *
 * `Content-Length` is caller-supplied and therefore not a limit on its own —
 * it is a cheap way to decline the honest 500 MB upload, which is all of them
 * in practice. The real ceiling still lives after the parse, where the actual
 * byte count is known, and both are kept.
 *
 * Returns the advertised length when it is within bounds, so a caller may log
 * it; returns null when the header is missing or unparseable, which is not an
 * error — a chunked upload has no length to declare.
 */
export function declaredLengthWithin(
  request: Request,
  limit: number,
): { ok: true; length: number | null } | { ok: false; length: number } {
  const header = request.headers.get("content-length");
  if (!header) return { ok: true, length: null };

  const length = Number(header);
  if (!Number.isFinite(length) || length < 0) return { ok: true, length: null };

  return length > limit ? { ok: false, length } : { ok: true, length };
}
