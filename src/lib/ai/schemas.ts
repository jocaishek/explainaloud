import { z } from "zod";

export const agentStepSchema = z.object({
  id: z.string().min(1),
  role: z.string().min(1),
  task: z.string().min(1),
  // "skipped" is a deliberate non-run, not a failure: a sources-only course
  // never asks the researchers for anything. Kept distinct from "degraded" so
  // the pipeline does not report a fallback the student did not hit.
  status: z.enum(["completed", "revised", "degraded", "skipped"]),
  summary: z.string().min(1),
  provider: z.enum(["gemini", "groq", "gateway", "local"]).optional(),
});
export type AgentStep = z.infer<typeof agentStepSchema>;

export const agentRunSchema = z.object({
  run_id: z.string().min(1),
  strategy: z.string().min(1),
  started_at: z.string().min(1),
  completed_at: z.string().min(1),
  agents: z.array(agentStepSchema).min(1),
});
export type AgentRun = z.infer<typeof agentRunSchema>;

export const courseReviewSchema = z.object({
  approved: z.boolean(),
  summary: z.string().min(1),
  checks: z
    .array(
      z.object({
        name: z.enum(["grounding", "coverage", "pedagogy", "assessment"]),
        passed: z.boolean(),
        detail: z.string().min(1),
      }),
    )
    .min(1),
  issues: z.array(z.string()).default([]),
});
export type CourseReview = z.infer<typeof courseReviewSchema>;

const modelText = z.preprocess(
  (value) =>
    Array.isArray(value)
      ? value.filter((item) => typeof item === "string").join(" ")
      : value,
  z.string().min(1),
);

export const courseCitationSchema = z.object({
  source: z.string().min(1),
  quote: z.string().min(1),
  url: z.string().url().optional(),
});
export type CourseCitation = z.infer<typeof courseCitationSchema>;

/**
 * Schemas for every model response. `completeJson` treats a validation
 * failure as a provider failure, so these double as the failover trigger —
 * a model that returns well-formed-but-wrong-shaped JSON gets replaced by the
 * backup rather than corrupting the database.
 */

const courseResponseSchema = z.object({
  summary: modelText,
  /** Evidence supporting the overview and condensed revision notes. */
  citations: z.array(courseCitationSchema).default([]),
  sections: z
    .array(
      z.object({
        title: modelText,
        intuition: modelText,
        analogy: modelText,
        technical: modelText,
        example: modelText,
        quiz: modelText,
        key_points: z.array(z.string().min(1)).default([]),
        /** Exact source excerpts supporting the claims in this section. */
        citations: z.array(courseCitationSchema).default([]),
      }),
    )
    .min(1),
  /** Condensed revision notes — the thing a student actually re-reads. */
  notes: z.array(z.string().min(1)).default([]),
  /**
   * Search queries, never URLs. A model asked for a YouTube link invents
   * plausible video IDs that 404; asked for a query it produces something
   * that always resolves. The UI turns these into real search links.
   */
  video_searches: z.array(z.string().min(1)).default([]),
  videos: z
    .array(
      z.object({
        title: z.string().min(1),
        url: z.string().url(),
      }),
    )
    .default([]),
  /** Further-reading suggestions; Tavily resolves them to direct pages. */
  resources: z
    .array(
      z.object({
        label: z.string().min(1),
        why: z.string().default(""),
        url: z.string().url().optional(),
      }),
    )
    .default([]),
  uncovered: z.array(z.string()).default([]),
  /**
   * Set when the topic is too broad to grade an explanation against well.
   *
   * A vague topic still produces a course, because refusing to build one is a
   * worse experience than building a shallow one. But it quietly degrades
   * everything downstream: the key points spread thin across a whole field, so
   * a good explanation of one corner scores badly against a rubric covering
   * ten. The student reads that as the app being wrong about them, and they are
   * more right than not.
   *
   * Saying so up front turns an unexplained bad score into an understood one,
   * and points at the fix. Null when the topic is specific enough.
   */
  scope_note: z
    .object({
      /** One sentence, addressed to the student, on why this is broad. */
      reason: z.string().min(1),
      /** Two or three narrower topics they could use instead. */
      suggestions: z.array(z.string().min(1)).default([]),
    })
    .nullish()
    .transform((value) => value ?? null),
  orchestration: agentRunSchema.optional(),
});

/**
 * A provider occasionally returns a complete section with an empty
 * `key_points` array. Rejecting the entire lesson makes Course Builder look
 * broken even though the section's technical explanation is itself a usable,
 * checkable reference. Keep the strict shape, but repair that one safe
 * omission deterministically.
 */
export const courseSchema = courseResponseSchema.transform((course) => ({
  ...course,
  sections: course.sections.map((section) => ({
    ...section,
    key_points:
      section.key_points.length > 0 ? section.key_points : [section.technical],
  })),
}));
export type GeneratedCourse = z.infer<typeof courseSchema>;

/**
 * How a stretch of speech is coloured.
 *
 * "vague" is its own verdict rather than a shade of wrong. A student who says
 * something true but woolly has not made a mistake, and colouring it red says
 * they have; colouring it green says the woolliness passed. Grey is the honest
 * third answer, and it shares that grey with speech that makes no claim at all
 * because both mean the same thing to a reader: nothing was established here.
 */
export const spanStatus = z.enum(["correct", "gap", "vague", "neutral"]);
export type SpanStatus = z.infer<typeof spanStatus>;

export const spansSchema = z.object({
  spans: z
    .array(
      z.object({
        text: z.string(),
        status: spanStatus,
        key_point: z
          .union([z.string(), z.number()])
          .nullish()
          .transform((value) =>
            typeof value === "number" ? String(value) : value,
          ),
        issue: z.string().nullish(),
      }),
    )
    .min(1),
  covered_key_points: z.array(z.number().int().nonnegative()).default([]),
  /**
   * Points where the student got the substance but not all of it.
   *
   * Key points are frequently compound — "the light-dependent reactions
   * produce ATP and NADPH" is two facts wearing one number. Under a binary
   * decision a student who said ATP scored the same as one who said nothing,
   * which is how an accurate explanation ended up at 8 out of 100. These earn
   * half credit.
   */
  partial_key_points: z.array(z.number().int().nonnegative()).default([]),
  /**
   * The subset of covered points the student actually *explained* rather than
   * merely named.
   *
   * Coverage alone cannot separate "the Calvin cycle happens in the stroma"
   * from an account of what the Calvin cycle does and why it needs the stroma.
   * Both state the point correctly, so both are covered, and a rubric that
   * stops there hands full marks to someone reciting a list of labels.
   */
  thorough_key_points: z.array(z.number().int().nonnegative()).default([]),
  confidence: z.number().min(0).max(100).default(0),
});
export type TranscriptSpans = z.infer<typeof spansSchema>;

function flattenModelText(value: unknown): unknown {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value
      .map(flattenModelText)
      .filter((item): item is string => typeof item === "string")
      .join(" ");
  }
  if (value && typeof value === "object") {
    return Object.values(value)
      .map(flattenModelText)
      .filter((item): item is string => typeof item === "string")
      .join(" ");
  }
  return value;
}

const reportText = z.preprocess(flattenModelText, z.string().min(1));

const gapCategory = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;
    const normalized = value.toLowerCase().replace(/[\s-]+/g, "_");
    if (
      normalized === "missing_step" ||
      normalized === "misconception" ||
      normalized === "vague" ||
      normalized === "contradicted"
    ) {
      return normalized;
    }
    if (normalized.includes("missing") || normalized.includes("omission")) {
      return "missing_step";
    }
    if (normalized.includes("vague") || normalized.includes("unclear")) {
      return "vague";
    }
    if (normalized.includes("contradict")) return "contradicted";
    // Models commonly return labels such as "incorrect" or "error". They are
    // still valid coaching data, so normalize them instead of failing the
    // entire report after every provider has already done the expensive work.
    return "misconception";
  },
  z.enum(["missing_step", "misconception", "vague", "contradicted"]),
);

export const reportSchema = z
  .object({
    score: z.number().min(0).max(100),
    verdict: reportText,
    gaps: z
      .array(
        z.object({
          phrase: reportText,
          category: gapCategory,
          explanation: reportText,
        }),
      )
      .default([]),
    strengths: z.array(reportText).default([]),
    next_focus: reportText.optional(),
  })
  .transform((report) => ({
    ...report,
    next_focus: report.next_focus ?? "",
  }));
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
