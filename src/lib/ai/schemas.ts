import { z } from "zod";

/**
 * Schemas for every model response. `completeJson` treats a validation
 * failure as a provider failure, so these double as the failover trigger —
 * a model that returns well-formed-but-wrong-shaped JSON gets replaced by the
 * backup rather than corrupting the database.
 */

export const courseSchema = z.object({
  summary: z.string().min(1),
  sections: z
    .array(
      z.object({
        title: z.string().min(1),
        intuition: z.string().min(1),
        analogy: z.string().min(1),
        technical: z.string().min(1),
        example: z.string().min(1),
        quiz: z.string().min(1),
        key_points: z.array(z.string().min(1)).min(1),
      }),
    )
    .min(1),
  uncovered: z.array(z.string()).default([]),
});
export type GeneratedCourse = z.infer<typeof courseSchema>;

export const spanStatus = z.enum(["correct", "gap", "neutral"]);
export type SpanStatus = z.infer<typeof spanStatus>;

export const spansSchema = z.object({
  spans: z
    .array(
      z.object({
        text: z.string(),
        status: spanStatus,
        key_point: z.string().nullish(),
        issue: z.string().nullish(),
      }),
    )
    .min(1),
  covered_key_points: z.array(z.number().int().nonnegative()).default([]),
  confidence: z.number().min(0).max(100).default(0),
});
export type TranscriptSpans = z.infer<typeof spansSchema>;

export const reportSchema = z.object({
  score: z.number().min(0).max(100),
  verdict: z.string().min(1),
  gaps: z
    .array(
      z.object({
        phrase: z.string().min(1),
        category: z.enum([
          "missing_step",
          "misconception",
          "vague",
          "contradicted",
        ]),
        explanation: z.string().min(1),
        quiz: z.string().min(1),
      }),
    )
    .default([]),
  strengths: z.array(z.string()).default([]),
  next_focus: z.string().default(""),
});
export type GapReport = z.infer<typeof reportSchema>;

/**
 * The model is told to return spans that concatenate back to the transcript,
 * and it usually does — but "usually" would mean silently dropping the
 * student's words from the UI. This reconciles the returned spans against the
 * real transcript, keeping the model's classifications while guaranteeing
 * every character is accounted for.
 */
export function reconcileSpans(
  transcript: string,
  spans: TranscriptSpans["spans"],
): Array<{ text: string; status: SpanStatus; issue: string | null }> {
  const out: Array<{ text: string; status: SpanStatus; issue: string | null }> =
    [];
  let cursor = 0;

  for (const span of spans) {
    const needle = span.text.trim();
    if (!needle) continue;

    const at = transcript.indexOf(needle, cursor);
    if (at === -1) continue; // Hallucinated span — drop it.

    // Anything the model skipped over stays visible as neutral text.
    if (at > cursor) {
      out.push({
        text: transcript.slice(cursor, at),
        status: "neutral",
        issue: null,
      });
    }

    out.push({
      text: transcript.slice(at, at + needle.length),
      status: span.status,
      issue: span.issue ?? null,
    });
    cursor = at + needle.length;
  }

  if (cursor < transcript.length) {
    out.push({
      text: transcript.slice(cursor),
      status: "neutral",
      issue: null,
    });
  }

  return out;
}
