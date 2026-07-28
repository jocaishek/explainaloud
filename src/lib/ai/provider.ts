import "server-only";

import { env } from "~/env";

/**
 * Two-provider JSON completion: Gemini first, Groq as failover.
 *
 * Both are called through plain fetch rather than an SDK — the request shapes
 * are small and stable, and it keeps the failover logic honest and visible
 * instead of buried behind two different client abstractions.
 */

const GEMINI_MODEL = "gemini-2.0-flash";
const GROQ_PRIMARY_MODEL = "llama-3.3-70b-versatile";
const GROQ_FALLBACK_MODEL = "llama-3.1-8b-instant";

const GEMINI_URL = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

/** Per-attempt ceiling. Two providers, so the worst case is ~2x this. */
const TIMEOUT_MS = 45_000;

/**
 * Output ceiling per call.
 *
 * Groq's free tier bills *requested* max_tokens against a 12k tokens-per-minute
 * budget, not tokens actually produced — so asking for 8192 "just in case" made
 * a single grading call blow the minute's allowance and 429. These responses
 * are small JSON objects; 3000 is comfortably above the largest real one.
 */
const MAX_OUTPUT_TOKENS = 3000;

/** One retry against a rate limit before giving up on a provider. */
const RATE_LIMIT_RETRIES = 1;
/** Longer limits (for example a daily quota) should fall through immediately. */
const MAX_RATE_LIMIT_WAIT_MS = 60_000;

class RateLimitedError extends Error {
  constructor(
    readonly retryAfterMs: number,
    readonly retryable = true,
  ) {
    super("rate limited");
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Parses the standard Retry-After header before falling back to body text. */
function parseRetryAfter(body: string, header: string | null): number {
  if (header) {
    const seconds = Number(header);
    if (Number.isFinite(seconds) && seconds >= 0) {
      return Math.ceil(seconds * 1000);
    }

    const date = Date.parse(header);
    if (Number.isFinite(date)) return Math.max(0, date - Date.now());
  }

  const ms = /try again in ([\d.]+)ms/i.exec(body);
  if (ms?.[1]) return Math.ceil(Number(ms[1]));
  const minAndSec = /try again in ([\d.]+)m([\d.]+)s/i.exec(body);
  if (minAndSec?.[1] && minAndSec[2]) {
    return Math.ceil((Number(minAndSec[1]) * 60 + Number(minAndSec[2])) * 1000);
  }
  const s = /try again in ([\d.]+)s/i.exec(body);
  if (s?.[1]) return Math.ceil(Number(s[1]) * 1000);
  return 1500;
}

export class AiUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiUnavailableError";
  }
}

export type AiResult<T> = {
  data: T;
  /** Which provider actually produced this, for surfacing in the UI. */
  provider: "gemini" | "groq";
};

/**
 * Strips markdown fences and any prose either side of the JSON body. Both
 * models are told to return bare JSON and both occasionally ignore that.
 */
function extractJson(raw: string): unknown {
  const trimmed = raw.trim();
  const unfenced = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  try {
    return JSON.parse(unfenced);
  } catch {
    // Fall back to the outermost balanced braces.
    const start = unfenced.indexOf("{");
    const end = unfenced.lastIndexOf("}");
    if (start === -1 || end <= start) {
      throw new Error("Model returned no parseable JSON");
    }
    return JSON.parse(unfenced.slice(start, end + 1));
  }
}

async function withTimeout<T>(fn: (signal: AbortSignal) => Promise<T>) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fn(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

async function callGemini(
  prompt: string,
  maxOutputTokens: number,
): Promise<string> {
  if (!env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not set");

  const response = await withTimeout((signal) =>
    fetch(GEMINI_URL(GEMINI_MODEL), {
      method: "POST",
      signal,
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": env.GEMINI_API_KEY as string,
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          // Deterministic: this is grading and grounded explanation, not
          // creative writing. Variance here shows up as wrong feedback.
          temperature: 0,
          topP: 0.1,
          maxOutputTokens,
          responseMimeType: "application/json",
        },
      }),
    }),
  );

  if (!response.ok) {
    const body = await response.text();
    if (response.status === 429) {
      // A project with a hard zero quota cannot recover by sleeping.
      throw new RateLimitedError(
        parseRetryAfter(body, response.headers.get("retry-after")),
        !/limit:\s*0(?:\D|$)/i.test(body),
      );
    }
    throw new Error(`Gemini ${response.status}: ${body}`);
  }

  const json = await response.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== "string" || !text.trim()) {
    throw new Error("Gemini returned an empty completion");
  }
  return text;
}

async function callGroq(
  prompt: string,
  maxOutputTokens: number,
  model: string,
): Promise<string> {
  if (!env.GROQ_API_KEY) throw new Error("GROQ_API_KEY not set");

  const response = await withTimeout((signal) =>
    fetch(GROQ_URL, {
      method: "POST",
      signal,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        top_p: 0.1,
        max_tokens: maxOutputTokens,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: prompt }],
      }),
    }),
  );

  if (!response.ok) {
    const body = await response.text();
    if (response.status === 429)
      throw new RateLimitedError(
        parseRetryAfter(body, response.headers.get("retry-after")),
      );
    throw new Error(`Groq ${response.status}: ${body}`);
  }

  const json = await response.json();
  const text = json?.choices?.[0]?.message?.content;
  if (typeof text !== "string" || !text.trim()) {
    throw new Error("Groq returned an empty completion");
  }
  return text;
}

/**
 * Runs `prompt` through Gemini, falling back to Groq on any failure —
 * including a response that parses but fails `validate`. A provider that
 * returns confidently-shaped garbage is as broken as one that 500s, so schema
 * failure is a failover trigger, not just a thrown error.
 */
export async function completeJson<T>(
  prompt: string,
  validate: (value: unknown) => T,
  options: { maxOutputTokens?: number } = {},
): Promise<AiResult<T>> {
  const maxOutputTokens = Math.max(
    128,
    Math.min(options.maxOutputTokens ?? MAX_OUTPUT_TOKENS, MAX_OUTPUT_TOKENS),
  );
  const attempts: Array<{
    provider: "gemini" | "groq";
    label: string;
    call: (p: string, maxTokens: number) => Promise<string>;
    configured: boolean;
  }> = [
    {
      provider: "gemini",
      label: "gemini",
      call: callGemini,
      configured: !!env.GEMINI_API_KEY,
    },
    {
      provider: "groq",
      label: "groq-70b",
      call: (value, tokens) => callGroq(value, tokens, GROQ_PRIMARY_MODEL),
      configured: !!env.GROQ_API_KEY,
    },
    {
      provider: "groq",
      label: "groq-8b",
      // The fallback model has a 6K TPM window. Its validated course JSON
      // comfortably fits in 2.4K output tokens, leaving room for sources.
      call: (value, tokens) =>
        callGroq(value, Math.min(tokens, 2400), GROQ_FALLBACK_MODEL),
      configured: !!env.GROQ_API_KEY,
    },
  ];

  const failures: string[] = [];

  for (const attempt of attempts) {
    if (!attempt.configured) {
      failures.push(`${attempt.label}: no API key configured`);
      continue;
    }
    for (let tries = 0; tries <= RATE_LIMIT_RETRIES; tries++) {
      try {
        const raw = await attempt.call(prompt, maxOutputTokens);
        return { data: validate(extractJson(raw)), provider: attempt.provider };
      } catch (error) {
        // A rate limit is a "wait", not a "this provider is broken" — the
        // provider tells us how long, so honour it rather than failing over
        // to a backup that may be no healthier.
        if (
          error instanceof RateLimitedError &&
          error.retryable &&
          error.retryAfterMs <= MAX_RATE_LIMIT_WAIT_MS &&
          tries < RATE_LIMIT_RETRIES
        ) {
          await sleep(error.retryAfterMs + 250);
          continue;
        }
        failures.push(
          `${attempt.label}: ${error instanceof Error ? error.message : String(error)}`,
        );
        break;
      }
    }
  }

  throw new AiUnavailableError(failures.join(" | "));
}

const GROQ_TRANSCRIPTION_URL =
  "https://api.groq.com/openai/v1/audio/transcriptions";
const GROQ_TRANSCRIPTION_MODEL = "whisper-large-v3-turbo";

/**
 * Transcribes a browser-recorded audio file. This is the reliable path for
 * browsers whose built-in Web Speech service cannot reach its remote backend.
 */
export async function transcribeAudio(file: File, topic: string) {
  if (!env.GROQ_API_KEY) {
    throw new AiUnavailableError("groq: no API key configured");
  }

  const body = new FormData();
  body.set("file", file, file.name || "recording.webm");
  body.set("model", GROQ_TRANSCRIPTION_MODEL);
  body.set("language", "en");
  body.set("response_format", "json");
  body.set(
    "prompt",
    `A student is explaining ${topic}. Preserve course terminology and punctuation.`,
  );

  const response = await withTimeout((signal) =>
    fetch(GROQ_TRANSCRIPTION_URL, {
      method: "POST",
      signal,
      headers: { authorization: `Bearer ${env.GROQ_API_KEY}` },
      body,
    }),
  );

  if (!response.ok) {
    throw new AiUnavailableError(`groq transcription: ${response.status}`);
  }

  const json = await response.json();
  if (typeof json?.text !== "string") {
    throw new AiUnavailableError("groq transcription: empty response");
  }
  return json.text.trim();
}

export function aiConfigured() {
  return !!(env.GEMINI_API_KEY || env.GROQ_API_KEY);
}

export type ProviderProbe = {
  provider: "gemini" | "groq";
  configured: boolean;
  ok: boolean;
  status: number | null;
  reason: string;
};

function describeProbeStatus(status: number): { ok: boolean; reason: string } {
  if (status === 200) return { ok: true, reason: "reachable" };
  if (status === 401 || status === 403) {
    return {
      ok: false,
      reason: `unauthorized (${status}) — key invalid or revoked`,
    };
  }
  if (status === 429) {
    return { ok: false, reason: "rate limited (429) — wait a minute" };
  }
  return { ok: false, reason: `unexpected status ${status}` };
}

/**
 * Cheapest possible liveness check per provider: list models, which costs no
 * tokens. Returns status codes and our own wording only — never a key, a key
 * fragment, or a provider response body.
 */
export async function probeProviders(): Promise<ProviderProbe[]> {
  const checks: Array<{
    provider: "gemini" | "groq";
    key: string | undefined;
    run: (key: string) => Promise<Response>;
  }> = [
    {
      provider: "gemini",
      key: env.GEMINI_API_KEY,
      run: (key) =>
        fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`,
        ),
    },
    {
      provider: "groq",
      key: env.GROQ_API_KEY,
      run: (key) =>
        fetch("https://api.groq.com/openai/v1/models", {
          headers: { authorization: `Bearer ${key}` },
        }),
    },
  ];

  return Promise.all(
    checks.map(async ({ provider, key, run }): Promise<ProviderProbe> => {
      if (!key) {
        return {
          provider,
          configured: false,
          ok: false,
          status: null,
          reason: "no API key configured in this environment",
        };
      }
      try {
        const response = await run(key);
        const { ok, reason } = describeProbeStatus(response.status);
        return {
          provider,
          configured: true,
          ok,
          status: response.status,
          reason,
        };
      } catch {
        return {
          provider,
          configured: true,
          ok: false,
          status: null,
          reason: "network error reaching the provider",
        };
      }
    }),
  );
}
