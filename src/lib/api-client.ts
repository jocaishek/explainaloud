/**
 * One place that turns a fetch into either a body or a sentence worth reading.
 *
 * Every caller used to do `await response.json()` inside a `try`, which is
 * correct right up until the response is not JSON — and the responses that
 * matter most are exactly the ones that are not. A gateway timeout is an HTML
 * error page, so `.json()` throws, the catch fires, and a request that reached
 * the server and ran for two minutes is reported as "couldn't reach the
 * server". The one failure a student can do nothing about was described as the
 * one thing they might have caused.
 */

const OFFLINE = "You appear to be offline. Check your connection and retry.";
const TOO_LONG =
  "That took too long and was cut off. Try again — it usually works second time.";
const UNREACHABLE = "Couldn't reach the server. Try again in a moment.";

/** What to say about a response that arrived but was not a success. */
function describe(
  status: number,
  body: { error?: string; detail?: string } | null,
): string {
  // The server's own message wins whenever it wrote one: it knows what it was
  // doing, and these are already written for a student rather than a log.
  //
  // `detail` is only ever attached for admins — the server decides that, not
  // the client — so a failure is diagnosable from the screen rather than from
  // the hosting provider's log viewer.
  if (body?.error) {
    return body.detail ? `${body.error} — ${body.detail}` : body.error;
  }

  if (status === 408 || status === 502 || status === 504) return TOO_LONG;
  if (status === 413) return "That file is too large.";
  if (status === 429) return "Too many requests just now. Wait a minute.";
  if (status === 401) return "You've been signed out. Log in and try again.";
  if (status >= 500) return "The server hit an error. Try again shortly.";
  return `The request failed (${status}).`;
}

export type JsonResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status: number | null };

/**
 * A JSON request that always resolves, never throws, and distinguishes the
 * three failures worth telling apart: no network, no answer in time, and an
 * answer that was not a success.
 *
 * The timeout is deliberately generous — longer than any route's own ceiling —
 * because its job is to stop a request hanging forever, not to second-guess
 * how long the server is allowed to take.
 */
export async function requestJson<T = unknown>(
  url: string,
  init: RequestInit = {},
  timeoutMs = 150_000,
): Promise<JsonResult<T>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const text = await response.text();

    let body: unknown = null;
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        // Left null. An unparseable body is what a proxy's error page looks
        // like, and `describe` reads the status rather than the noise.
      }
    }

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        error: describe(
          response.status,
          body as { error?: string; detail?: string } | null,
        ),
      };
    }

    return { ok: true, data: body as T };
  } catch (error) {
    const aborted =
      error instanceof DOMException && error.name === "AbortError";
    return {
      ok: false,
      status: null,
      error: aborted
        ? TOO_LONG
        : typeof navigator !== "undefined" && navigator.onLine === false
          ? OFFLINE
          : UNREACHABLE,
    };
  } finally {
    clearTimeout(timer);
  }
}
