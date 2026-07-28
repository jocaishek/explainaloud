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
const GROQ_MODEL = "llama-3.3-70b-versatile";

const GEMINI_URL = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

/** Per-attempt ceiling. Two providers, so the worst case is ~2x this. */
const TIMEOUT_MS = 45_000;

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

async function callGemini(prompt: string): Promise<string> {
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
          maxOutputTokens: 8192,
          responseMimeType: "application/json",
        },
      }),
    }),
  );

  if (!response.ok) {
    throw new Error(`Gemini ${response.status}: ${await response.text()}`);
  }

  const json = await response.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== "string" || !text.trim()) {
    throw new Error("Gemini returned an empty completion");
  }
  return text;
}

async function callGroq(prompt: string): Promise<string> {
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
        model: GROQ_MODEL,
        temperature: 0,
        top_p: 0.1,
        max_tokens: 8192,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: prompt }],
      }),
    }),
  );

  if (!response.ok) {
    throw new Error(`Groq ${response.status}: ${await response.text()}`);
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
): Promise<AiResult<T>> {
  const attempts: Array<{
    provider: "gemini" | "groq";
    call: (p: string) => Promise<string>;
    configured: boolean;
  }> = [
    { provider: "gemini", call: callGemini, configured: !!env.GEMINI_API_KEY },
    { provider: "groq", call: callGroq, configured: !!env.GROQ_API_KEY },
  ];

  const failures: string[] = [];

  for (const attempt of attempts) {
    if (!attempt.configured) {
      failures.push(`${attempt.provider}: no API key configured`);
      continue;
    }
    try {
      const raw = await attempt.call(prompt);
      return { data: validate(extractJson(raw)), provider: attempt.provider };
    } catch (error) {
      failures.push(
        `${attempt.provider}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  throw new AiUnavailableError(failures.join(" | "));
}

export function aiConfigured() {
  return !!(env.GEMINI_API_KEY || env.GROQ_API_KEY);
}
