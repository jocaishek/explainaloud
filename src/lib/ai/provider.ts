import "server-only";

import { env } from "~/env";
import type { TranscribedWord } from "~/lib/speech-metrics";
import { stripHallucinations } from "./transcript-cleanup";

/**
 * Three-provider JSON completion: Gemini first, then Groq, with the Vercel AI
 * Gateway between the two Groq tiers.
 *
 * All three are called through plain fetch rather than an SDK — the request
 * shapes are small and stable, and it keeps the failover logic honest and
 * visible instead of buried behind three different client abstractions. The
 * Gateway is OpenAI-shaped, so it shares Groq's caller outright.
 *
 * The ordering is about context size as much as quality. Groq's free tier
 * budgets tokens per minute and rejects an oversized request outright with a
 * 413, so a long course fails on the large Groq tier and then fails again on
 * the small one — the two now share one 8K/min allowance, so the second Groq
 * attempt cannot hold a prompt the first could not. The Gateway rung sits
 * between them on a 262K window, so the request neither Groq tier can hold
 * still lands somewhere.
 *
 * **Gemini is not routed through the Gateway, deliberately.** It is called on
 * Google's own endpoint, which serves `gemini-3.5-flash-lite` to this key
 * while the Gateway restricts that model to accounts holding paid credits and
 * answers a free-tier key with 403. Going through the Gateway everywhere would
 * mean unified billing bought at the price of the provider that actually
 * works. See `GATEWAY_MODEL` for when that trade changes.
 */

/**
 * Flash-Lite rather than Flash: a 1M-token window, structured output support
 * and roughly a fifth of Flash's input price. The window is the reason — it is
 * what takes request size off the table as a failure mode entirely.
 */
const GEMINI_MODEL = "gemini-3.5-flash-lite";

/**
 * The two Groq rungs, after Llama was decommissioned.
 *
 * `llama-3.3-70b-versatile` and `llama-3.1-8b-instant` were announced for
 * deprecation on 17 June 2026 and shut down on 16 August 2026 for free and
 * developer tier keys, which is every key this project has. Groq's own
 * replacements are `openai/gpt-oss-120b` for the large tier and
 * `openai/gpt-oss-20b` for the small one, and those are what these are.
 *
 * **They reason, and that changes the arithmetic here.** Llama emitted answer
 * tokens only; gpt-oss spends completion tokens thinking before it writes a
 * word, at `reasoning_effort` *medium* unless told otherwise. Two consequences
 * this file has to carry rather than discover in production:
 *
 * - Every Groq call asks for `low`. These prompts are extraction and grading
 *   against a rubric that is already in the prompt, not problems that get
 *   better with deliberation, and the live colouring rung is on a latency
 *   budget that medium would blow.
 * - Every Groq call is given `REASONING_HEADROOM` tokens above what the answer
 *   needs. `max_tokens` counts reasoning, so the old budgets — 128 for the
 *   health probe, 900 for live colouring — were amounts a reasoning model can
 *   spend entirely on thinking and then return an empty completion. That is
 *   not a truncated answer anybody can see; it is a provider that looks broken.
 *
 * Both tiers are 131K context and 8K tokens/minute on the free plan, where
 * Llama was 12K and 6K. The large tier therefore lost a third of its per-minute
 * allowance and the small one gained a third: they are the same size now, which
 * is why the Gateway rung between them matters more than it did.
 */
const GROQ_PRIMARY_MODEL = "openai/gpt-oss-120b";
const GROQ_FALLBACK_MODEL = "openai/gpt-oss-20b";

/**
 * Tokens allowed for thinking, on top of the answer the caller asked for.
 *
 * At `low` effort these prompts think in a few hundred tokens. 600 is above
 * every one measured against the real course-building and grading prompts, and
 * it is charged against the minute's budget only when it is used — Groq bills
 * *requested* `max_tokens` against TPM, so this is not free, which is why it is
 * one number rather than a generous multiplier.
 */
const REASONING_HEADROOM = 600;

/**
 * How hard the Groq rungs are allowed to think.
 *
 * `medium` is the default and it is wrong for every call this file makes: the
 * work is extraction and rubric-checking, and the reasoning budget comes out of
 * the same 8K/minute the answer does.
 */
const GROQ_REASONING_EFFORT = "low";
/**
 * The wide-context failover, reached through the Vercel AI Gateway.
 *
 * The Gateway rather than OpenRouter because the key already exists on the
 * deployment and one vendor account is one fewer thing to keep alive for a
 * rung that only fires when two others have already failed.
 *
 * The model it named first — `inclusionai/ling-3.0-flash-free` — is **gone**,
 * and answers `404 model_not_found`. That is what a free model on a gateway
 * does eventually: no SLA, no support channel, no guarantee it stays either
 * free or present. It is the reason this is an environment variable now, and
 * the reason the default is chosen rather than assumed. `AI_GATEWAY_MODEL` in
 * `env.ts` repoints it from the dashboard, without a deploy.
 *
 * The default is `alibaba/qwen3.8-27b`: 262K of context, free on input and
 * output, 1.1s to first token. That is the same window the Ling model was
 * chosen for and the same price, which is the whole specification for this
 * rung — it earns its place on window size alone, and is deliberately not
 * first for anything.
 *
 * Free matters as much as wide. The Gateway answers a key with no credits with
 * 403 `RestrictedModelsError` for models that need them, so a paid model here
 * would be a rung that 403s on every call. `alibaba/qwen3.8-max` is the same
 * family at 1M tokens and $2/$6 per million, and is the upgrade if this
 * project ever has Gateway credits — not before.
 *
 * Note it is a reasoning model, and this rung deliberately sends no
 * `reasoning_effort`: the Gateway is not Groq and does not take Groq's
 * parameters for every model behind it. `jsonMode` is off here for the same
 * reason — see the flag's own note — so the JSON constraint comes from the
 * prompt and `extractJson` unwraps whatever arrives around it. That is weaker
 * than a schema, and acceptable for a rung reached only after two providers
 * have already declined.
 *
 * **Why this is not `google/gemini-3.5-flash-lite`.** The Gateway restricts
 * that model to accounts with paid credits and answers a free-tier key with
 * 403 `RestrictedModelsError`, while the direct Google endpoint above serves
 * it happily. Pointing this rung at Gemini would therefore trade a working
 * provider for a 403. Once the Vercel team has credits it becomes a real
 * second Gemini path and is worth switching; until then it must not be.
 *
 * A 404 here is treated as configuration rather than failure — see
 * `MODEL_MISSING_COOLDOWN_MS`. A model that does not exist will not exist on
 * the next request either, and paying a round trip per call to rediscover that
 * is worse than skipping the rung.
 */
const GATEWAY_MODEL = env.AI_GATEWAY_MODEL ?? "alibaba/qwen3.8-27b";

/**
 * How long a rung is parked after the provider says its model does not exist.
 *
 * Long, because this is a configuration fact rather than a transient one. It
 * is not indefinite: the fix is an environment change, and this is what stops
 * an instance that started before the change from ignoring the rung forever.
 */
const MODEL_MISSING_COOLDOWN_MS = 30 * 60_000;

const GEMINI_URL = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
/** OpenAI-shaped, so it goes through the same caller as Groq. */
const GATEWAY_URL = "https://ai-gateway.vercel.sh/v1/chat/completions";

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

/** The provider is reachable and the model it was asked for is not there. */
class ModelMissingError extends Error {
  constructor(label: string, model: string) {
    super(`${label} has no model "${model}"`);
    this.name = "ModelMissingError";
  }
}

class RateLimitedError extends Error {
  constructor(
    readonly retryAfterMs: number,
    readonly retryable = true,
  ) {
    super("rate limited");
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * How long to stop trying a provider that reported an exhausted quota.
 *
 * A key whose quota is spent doesn't recover in the seconds a retry waits, and
 * trying it first on every request costs a full round trip before the working
 * provider is even attempted — then leaves less of the next provider's
 * per-minute budget for the call that matters. Best-effort and per-instance:
 * serverless instances don't share this, which is fine, since the worst case is
 * simply the old behaviour.
 */
const QUOTA_COOLDOWN_MS = 10 * 60_000;

/**
 * The same idea for a per-minute limit, at the scale a per-minute limit lives.
 *
 * Live colouring calls this up to fifty times a minute, and the free tier of
 * every provider in the chain allows fewer than that. Without a cooldown the
 * first rung 429s, the call falls through to the second — and then the next
 * tick, 1.2 seconds later, pays that same failed round trip again, and so does
 * every tick after it. The rung that is *known* to be rate limited is the one
 * being asked first, forever.
 *
 * With it, one tick eats the 429 and the rest go straight to whatever answered.
 * The provider's own `retry-after` sets the length when it sends one; this is
 * the floor for when it does not, and the ceiling is `MAX_RATE_LIMIT_WAIT_MS`
 * so a provider is never parked longer than a minute on a burst limit.
 */
const RATE_LIMIT_COOLDOWN_MS = 15_000;

/** Label -> when it may be tried again. Covers both kinds of limit. */
const quotaExhaustedUntil = new Map<string, number>();

function inCooldown(label: string): boolean {
  const until = quotaExhaustedUntil.get(label);
  if (until === undefined) return false;
  if (Date.now() >= until) {
    quotaExhaustedUntil.delete(label);
    return false;
  }
  return true;
}

/** A spent daily/project quota, as opposed to a momentary burst limit. */
function isQuotaExhausted(error: unknown): boolean {
  if (error instanceof RateLimitedError) return !error.retryable;
  return (
    error instanceof Error &&
    /exceeded your current quota|quota exceeded|insufficient_quota/i.test(
      error.message,
    )
  );
}

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
  provider: AiProvider;
};

export type AiProvider = "gemini" | "groq" | "gateway";

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
      // A hard zero quota, or a plan whose allowance is spent, cannot recover
      // by sleeping — those must fall through to the next provider instead of
      // burning a retry. Only a momentary burst limit is worth waiting on.
      const unrecoverable =
        /limit:\s*0(?:\D|$)/i.test(body) ||
        /exceeded your current quota|check your plan and billing/i.test(body);
      throw new RateLimitedError(
        parseRetryAfter(body, response.headers.get("retry-after")),
        !unrecoverable,
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

/**
 * One caller for every OpenAI-shaped chat endpoint.
 *
 * Groq and the Gateway speak the same request and response format, so the only
 * things that differ are the URL, the key, the model and the name to put in an
 * error message. Writing it twice would mean two places to fix the next time a
 * status code needs handling.
 */
async function callOpenAiCompatible(
  prompt: string,
  maxOutputTokens: number,
  config: {
    label: string;
    url: string;
    apiKey: string | undefined;
    keyName: string;
    model: string;
    headers?: Record<string, string>;
    /**
     * Whether the endpoint accepts `response_format: {type: "json_object"}`.
     *
     * "OpenAI-compatible" is not one specification. Groq honours this field;
     * the Vercel AI Gateway rejects the whole request with a bare 400 "Invalid
     * input" — verified against the live endpoint by sending the same call
     * with and without it. Left unconditional, the Gateway rung would have
     * failed every single time while looking perfectly configured, which is
     * the worst shape a failover can have.
     *
     * Off, the JSON constraint comes from the prompt alone. That is weaker,
     * and it is why `extractJson` still strips fences and prose: this rung is
     * the third thing tried, and a model that needs its answer unwrapped is
     * better than no answer.
     */
    jsonMode?: boolean;
    /**
     * Sent as `reasoning_effort` when the model is one that thinks.
     *
     * Per-config rather than unconditional, because it is not portable: Groq
     * accepts it for gpt-oss, and the Gateway rung points at a model that has
     * never seen the field. Sending it everywhere would be the same mistake
     * `jsonMode` documents above, in the other direction.
     */
    reasoningEffort?: "low" | "medium" | "high";
  },
): Promise<string> {
  if (!config.apiKey) throw new Error(`${config.keyName} not set`);

  const response = await withTimeout((signal) =>
    fetch(config.url, {
      method: "POST",
      signal,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${config.apiKey}`,
        ...config.headers,
      },
      body: JSON.stringify({
        model: config.model,
        temperature: 0,
        top_p: 0.1,
        max_tokens: maxOutputTokens,
        ...(config.jsonMode === false
          ? {}
          : { response_format: { type: "json_object" } }),
        /* `include_reasoning: false` as well as the effort setting. The thinking
           is not wanted in the response — `extractJson` would have to strip it
           back out of the same string it is looking for an object in, and the
           two failure modes that produces (a brace inside the reasoning, a
           truncated object after it) are indistinguishable from a bad model. */
        ...(config.reasoningEffort
          ? {
              reasoning_effort: config.reasoningEffort,
              include_reasoning: false,
            }
          : {}),
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
    /* "This model does not exist" is not a failure to retry around.
     *
     * It is what a provider says after retiring something, and it will say it
     * again on the next request and the one after that. Left as an ordinary
     * error, the rung stays in the chain and every call pays a round trip to
     * be told the same thing. Named here so the chain can park it. */
    if (
      response.status === 404 &&
      /model.?not.?found|no such model/i.test(body)
    )
      throw new ModelMissingError(config.label, config.model);
    throw new Error(`${config.label} ${response.status}: ${body}`);
  }

  const json = await response.json();
  const text = json?.choices?.[0]?.message?.content;
  if (typeof text !== "string" || !text.trim()) {
    throw new Error(`${config.label} returned an empty completion`);
  }
  return text;
}

async function callGroq(
  prompt: string,
  maxOutputTokens: number,
  model: string,
): Promise<string> {
  /* The headroom is added here rather than at each call site on purpose: every
     caller asks for the size of the *answer* it needs, which is the honest
     question, and the cost of the model thinking first belongs to the fact
     that this rung is a reasoning model. See `REASONING_HEADROOM`. */
  return callOpenAiCompatible(prompt, maxOutputTokens + REASONING_HEADROOM, {
    label: "Groq",
    url: GROQ_URL,
    apiKey: env.GROQ_API_KEY,
    keyName: "GROQ_API_KEY",
    model,
    reasoningEffort: GROQ_REASONING_EFFORT,
  });
}

async function callGateway(
  prompt: string,
  maxOutputTokens: number,
): Promise<string> {
  return callOpenAiCompatible(prompt, maxOutputTokens, {
    label: "Gateway",
    url: GATEWAY_URL,
    apiKey: env.AI_GATEWAY_API_KEY,
    keyName: "AI_GATEWAY_API_KEY",
    model: GATEWAY_MODEL,
    jsonMode: false,
  });
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
  options: { maxOutputTokens?: number; fast?: boolean } = {},
): Promise<AiResult<T>> {
  const maxOutputTokens = Math.max(
    128,
    Math.min(options.maxOutputTokens ?? MAX_OUTPUT_TOKENS, MAX_OUTPUT_TOKENS),
  );
  const attempts: Array<{
    provider: AiProvider;
    label: string;
    call: (p: string, maxTokens: number) => Promise<string>;
    configured: boolean;
  }> = [
    /* Gemini leads every call, including the latency-sensitive ones.
     *
     * It did not used to. `fast` callers — live transcript colouring above all
     * — skipped Gemini outright and opened on Groq's small tier, because that
     * model answered in ~415ms against Gemini's round trip and colour arriving
     * late is colour that is wrong. That was a good trade and it is now void
     * twice over: the model it was measured on was decommissioned in August
     * 2026, and its replacement reasons before it answers even at `low`
     * effort, so the premise — "the small Groq tier is the quick one" — is
     * exactly what nobody has measured since.
     *
     * What is left is the thing that was always true: one ordering is easier
     * to reason about than two, and a path that skips the primary provider is
     * a path that fails whenever the *secondary* one does. Live colouring is
     * the most visible surface in the product and it was the only one with no
     * Gemini in front of it.
     *
     * The cost of leading with Gemini on a 1.2s tick is its per-minute limit,
     * and that is what `RATE_LIMIT_COOLDOWN_MS` is for: the first tick that
     * 429s parks Gemini for a few seconds and the rest of the recording goes
     * straight to Groq, so the fallback costs one wasted round trip per
     * cooldown window rather than one per tick. */
    {
      provider: "gemini",
      label: "gemini",
      call: callGemini,
      configured: !!env.GEMINI_API_KEY,
    },
    /* Which Groq tier stands behind Gemini is what `fast` decides now.
     *
     * A live pass that has already lost a round trip wants the quickest thing
     * that can answer, not the most capable; a course build wants the reverse,
     * and can afford it. Both orderings keep the other tier in the chain
     * further down, so neither loses a rung — they disagree about which one to
     * spend first. */
    ...(options.fast
      ? [
          {
            provider: "groq" as const,
            label: "groq-small-fast",
            call: (value: string, tokens: number) =>
              callGroq(value, Math.min(tokens, 900), GROQ_FALLBACK_MODEL),
            configured: !!env.GROQ_API_KEY,
          },
        ]
      : [
          {
            provider: "groq" as const,
            label: "groq-large",
            call: (value: string, tokens: number) =>
              callGroq(value, tokens, GROQ_PRIMARY_MODEL),
            configured: !!env.GROQ_API_KEY,
          },
        ]),
    {
      provider: "gateway",
      label: `gateway:${GATEWAY_MODEL}`,
      /* Ahead of the small Groq tier on purpose, and more so than before. By
         the time we are here the large tier has already failed, and the most
         common reason is a prompt too large for its per-minute budget — which
         the small tier cannot hold either, because since the Llama models were
         retired the two share the same 8K/minute rather than the small one
         having half. A 262K window can. */
      call: callGateway,
      configured: !!env.AI_GATEWAY_API_KEY,
    },
    /* The tier the rung above did not spend. Last, in both orderings, because
       by here two providers have already declined and the question has stopped
       being "which is quickest" and become "is there anything left". */
    options.fast
      ? {
          provider: "groq",
          label: "groq-large",
          call: (value, tokens) => callGroq(value, tokens, GROQ_PRIMARY_MODEL),
          configured: !!env.GROQ_API_KEY,
        }
      : {
          provider: "groq",
          label: "groq-small",
          // Validated course JSON comfortably fits in 2.4K output tokens,
          // leaving room for sources — and `callGroq` adds thinking on top.
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
    if (inCooldown(attempt.label)) {
      failures.push(`${attempt.label}: skipped, limited recently`);
      continue;
    }
    for (let tries = 0; tries <= RATE_LIMIT_RETRIES; tries++) {
      try {
        const raw = await attempt.call(prompt, maxOutputTokens);
        const data = validate(extractJson(raw));
        // Only worth a line when something above this one did not answer.
        // Silence on the happy path, and a record of every degraded call —
        // otherwise the app can run a week on the free fallback and the first
        // report of it comes from a student.
        if (failures.length > 0) {
          console.warn(
            `ai: served by ${attempt.label} after ${failures.length} failure(s): ${failures.join(" | ")}`,
          );
        }
        return { data, provider: attempt.provider };
      } catch (error) {
        /* A model that has been withdrawn. Parked for half an hour and logged
           loudly: nothing about this recovers on its own, and the fix —
           repointing `AI_GATEWAY_MODEL` — needs somebody to know. */
        if (error instanceof ModelMissingError) {
          quotaExhaustedUntil.set(
            attempt.label,
            Date.now() + MODEL_MISSING_COOLDOWN_MS,
          );
          console.error(
            `ai: ${error.message}. Repoint it, or unset its key to drop the rung.`,
          );
          failures.push(`${attempt.label}: ${error.message}`);
          break;
        }
        if (isQuotaExhausted(error)) {
          quotaExhaustedUntil.set(
            attempt.label,
            Date.now() + QUOTA_COOLDOWN_MS,
          );
          failures.push(`${attempt.label}: quota exhausted`);
          break;
        }
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
        /* Out of retries against a burst limit: park this rung briefly so the
           next caller does not open with the round trip that just failed. See
           `RATE_LIMIT_COOLDOWN_MS` — without this, a 1.2s tick re-tries a
           provider it already knows is limited, on every single tick. */
        if (error instanceof RateLimitedError) {
          quotaExhaustedUntil.set(
            attempt.label,
            Date.now() +
              Math.min(
                Math.max(error.retryAfterMs, RATE_LIMIT_COOLDOWN_MS),
                MAX_RATE_LIMIT_WAIT_MS,
              ),
          );
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
/**
 * The full model, not the turbo distillation.
 *
 * Turbo is roughly twice as fast and measurably worse on exactly what this
 * app records: proper nouns, technical terms, and anyone who is thinking
 * while they talk. That trade is wrong here — transcription runs after the
 * recording has stopped, so nobody is watching the clock, and every word it
 * gets wrong is graded as something the student said. A mistranscription is
 * not a cosmetic error in this product; it is a wrong answer attributed to
 * someone who gave a right one.
 */
const GROQ_TRANSCRIPTION_MODEL = "whisper-large-v3";

/**
 * A transcript plus the word timings behind it.
 *
 * `words` is empty when the provider returned none — callers must treat the
 * timings as optional and never assume a non-empty array.
 */
export type TranscriptionResult = {
  transcript: string;
  words: TranscribedWord[];
};

export class NoSpeechDetectedError extends Error {
  constructor() {
    super("No speech was detected in the recording.");
    this.name = "NoSpeechDetectedError";
  }
}

function normalizedTranscript(value: string) {
  return value
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/**
 * Transcribes a browser-recorded audio file. This is the reliable path for
 * browsers whose built-in Web Speech service cannot reach its remote backend.
 */
export async function transcribeAudio(
  file: File,
  topic: string,
  /**
   * The course's own vocabulary — section titles and key-point terms.
   *
   * Whisper's prompt is a decoding hint, not an instruction: words in it are
   * far likelier to come out spelled that way. Without it the model hears an
   * unfamiliar proper noun and writes what it sounds like, which is how
   * "Claude Code" was transcribed as "Clawd Code" and "Cloud Code" in the same
   * recording. The terms come from the course the student is being graded
   * against, so they are exactly the words that must not be mangled.
   */
  vocabulary: string[] = [],
): Promise<TranscriptionResult> {
  if (!env.GROQ_API_KEY) {
    throw new AiUnavailableError("groq: no API key configured");
  }

  const body = new FormData();
  body.set("file", file, file.name || "recording.webm");
  body.set("model", GROQ_TRANSCRIPTION_MODEL);
  body.set("language", "en");
  // `verbose_json` rather than `json` so the response carries word timings.
  // Same model, same call, same cost — the timings are simply discarded under
  // `json`, and they are what makes pace and hesitation measurable at all.
  body.set("response_format", "verbose_json");
  body.set("timestamp_granularities[]", "word");
  // Capped: the prompt is a decoding bias, and past a couple of hundred
  // characters it starts steering the transcript towards its own wording
  // rather than towards the student's.
  const terms = [...new Set(vocabulary.map((term) => term.trim()))]
    .filter((term) => term.length > 2)
    .join(", ")
    .slice(0, 400);
  /* "um, uh" in the prompt is not an instruction — it is an example.
   *
   * Whisper tidies disfluency away by default: it is trained on written
   * targets, so it hears "the, um, mitochondria" and writes "the
   * mitochondria". That is usually welcome and here it is not, because the
   * filler count in `speech-metrics` can only count what survives into the
   * transcript, and a transcript with the hesitations removed reports every
   * speaker as fluent.
   *
   * The prompt is a decoding bias rather than a directive, so this shifts the
   * odds and does not guarantee anything. Writing the sounds out is what
   * makes them likelier to come back: the same mechanism that keeps proper
   * nouns spelled correctly, used on a different kind of word. */
  const prompt =
    `A student is explaining ${topic}. ` +
    "Preserve course terminology and punctuation. " +
    "Write hesitations as spoken, um, uh, like this." +
    (terms ? ` Terms used: ${terms}.` : "");
  body.set("prompt", prompt);
  // Nothing here benefits from the model getting creative about what it heard.
  body.set("temperature", "0");

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

  /* Whisper's answer to silence, removed before anybody is graded on it.
   *
   * The checks below catch a transcript that is nothing but an artefact. They
   * cannot catch the common case, which is real speech with caption
   * boilerplate looping through the gaps in it — see `transcript-cleanup.ts`.
   * Cleaning first means the emptiness checks then run against what was
   * actually said, so a recording that was only silence still ends up at
   * `NoSpeechDetectedError` rather than passing as five words of "thank you". */
  const cleaned = stripHallucinations(json.text.trim(), parseWords(json));
  if (cleaned.removed > 0) {
    console.warn(
      `groq transcription: dropped ${cleaned.removed} hallucinated sentence(s)`,
    );
  }

  const transcript = cleaned.transcript.trim();
  const normalized = normalizedTranscript(transcript);
  const promptEcho =
    normalized === normalizedTranscript(prompt) ||
    normalized.startsWith("a student is explaining") ||
    normalized.includes("preserve course terminology");
  if (
    !transcript ||
    promptEcho ||
    normalized === "blank audio" ||
    normalized === "silence"
  ) {
    throw new NoSpeechDetectedError();
  }
  return { transcript, words: cleaned.words };
}

/**
 * Word timings out of a `verbose_json` body.
 *
 * Tolerant by design. Timings are an enhancement, not the payload: if a
 * provider omits `words`, renames it, or returns something unparseable, the
 * transcript is still perfectly good and callers get an empty array rather
 * than an error. Every field is checked because one malformed entry would
 * otherwise poison the metrics with NaN.
 */
function parseWords(json: unknown): TranscribedWord[] {
  const raw = (json as { words?: unknown })?.words;
  if (!Array.isArray(raw)) return [];

  const words: TranscribedWord[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const { word, start, end } = entry as Record<string, unknown>;
    if (
      typeof word === "string" &&
      typeof start === "number" &&
      typeof end === "number" &&
      Number.isFinite(start) &&
      Number.isFinite(end)
    ) {
      words.push({ word, start, end });
    }
  }
  return words;
}

export function aiConfigured() {
  return !!(env.GEMINI_API_KEY || env.GROQ_API_KEY || env.AI_GATEWAY_API_KEY);
}

export type ProviderProbe = {
  provider: AiProvider;
  configured: boolean;
  ok: boolean;
  status: number | null;
  reason: string;
};

function describeProbeStatus(status: number): { ok: boolean; reason: string } {
  if (status === 200) return { ok: true, reason: "reachable" };
  // 400 belongs with the auth failures: Google answers a malformed or unknown
  // key on the model endpoint with INVALID_ARGUMENT rather than 401, so
  // without this the commonest failure of all reads as "unexpected status".
  if (status === 400 || status === 401 || status === 403) {
    return {
      ok: false,
      reason: `unauthorized (${status}), key invalid or revoked`,
    };
  }
  if (status === 429) {
    return { ok: false, reason: "rate limited (429), wait a minute" };
  }
  // The key is fine and the model is not. Worth its own wording: this is the
  // failure that looks like nothing at all in production, because the chain
  // quietly serves every request from the next provider down.
  if (status === 404) {
    return {
      ok: false,
      reason: "model not found (404), it may have been retired",
    };
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
    provider: AiProvider;
    key: string | undefined;
    run: (key: string) => Promise<Response>;
  }> = [
    {
      provider: "gemini",
      key: env.GEMINI_API_KEY,
      // Asks after the one model this app actually calls, using the same
      // header `callGemini` uses.
      //
      // Listing every model with `?key=` answered 200 while real generation
      // was falling through to Groq on every request, so the health check
      // reported a provider that did not work. Two reasons it could:
      // `?key=` is the legacy auth form, and Google is midway through
      // replacing `AIza` standard keys with service-account-bound `AQ.` ones,
      // so the probe and the real call were not proving the same thing. And a
      // model that has been retired still leaves the *list* endpoint healthy —
      // naming the model is what turns that into a 404 here rather than a
      // silent failover in production.
      run: (key) =>
        fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}`,
          { headers: { "x-goog-api-key": key } },
        ),
    },
    {
      provider: "groq",
      key: env.GROQ_API_KEY,
      /* Deliberately the list endpoint, and therefore deliberately weaker than
         the Gemini probe above it.

         The same trap applies — Groq retired both Llama models on 16 August
         2026 and this call would have gone on answering 200 the whole time —
         but the fix that worked for Gemini does not transfer: a Groq model id
         now contains a slash (`openai/gpt-oss-120b`), so naming it puts an
         extra path segment into `/openai/v1/models/{model}`, and a probe that
         404s on a healthy provider is a worse failure than one that misses a
         retirement. `?deep=1` on the health route is what catches a dead
         model: it runs a real completion through the real chain. */
      run: (key) =>
        fetch("https://api.groq.com/openai/v1/models", {
          headers: { authorization: `Bearer ${key}` },
        }),
    },
    {
      provider: "gateway",
      key: env.AI_GATEWAY_API_KEY,
      run: (key) =>
        fetch("https://ai-gateway.vercel.sh/v1/models", {
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
