import "server-only";

import { z } from "zod";

import {
  completeCoverageReport,
  coveredKeyPointIndices,
} from "~/lib/ai/coverage-report";
import {
  courseGenerationPrompt,
  courseReviewPrompt,
  courseRevisionPrompt,
  gapDetectionPrompt,
  gapReportPrompt,
  topicBreadthPrompt,
} from "~/lib/ai/prompts";
import { AiUnavailableError, completeJson } from "~/lib/ai/provider";
import {
  type AgentRun,
  type AgentStep,
  type CourseCitation,
  type CourseReview,
  courseReviewSchema,
  courseSchema,
  type GapReport,
  type GeneratedCourse,
  reconcileSpans,
  reportSchema,
  type SpanStatus,
  spansSchema,
} from "~/lib/ai/schemas";
import { renderSources, type SourceRow } from "~/lib/ai/sources";
import {
  discoverCourseEvidence,
  discoverCourseResources,
  discoverCourseVideos,
} from "~/lib/video-search";

const REVIEW_OUTPUT_TOKENS = 900;
const REVIEW_EVIDENCE_CHARS = 6_000;

export class CourseCitationError extends Error {
  constructor() {
    super(
      "The course could not be matched to verified excerpts from its sources.",
    );
    this.name = "CourseCitationError";
  }
}

function agentStep(
  id: string,
  role: string,
  task: string,
  summary: string,
  options: Pick<AgentStep, "status" | "provider">,
): AgentStep {
  return { id, role, task, summary, ...options };
}

function sourceEvidence(sources: SourceRow[]) {
  let remaining = REVIEW_EVIDENCE_CHARS;
  const excerpts: string[] = [];

  for (const source of sources) {
    if (remaining <= 0) break;
    const excerpt = source.content.slice(0, remaining);
    remaining -= excerpt.length;
    excerpts.push(`[${source.filename}]\n${excerpt}`);
  }

  return excerpts.join("\n\n");
}

function auditView(course: GeneratedCourse) {
  return {
    summary: course.summary,
    citations: course.citations,
    sections: course.sections.map((section) => ({
      title: section.title,
      technical: section.technical,
      quiz: section.quiz,
      key_points: section.key_points,
      citations: section.citations,
    })),
    notes: course.notes,
    uncovered: course.uncovered,
  };
}

function normalizeEvidence(value: string) {
  return value.replace(/\s+/gu, " ").trim().toLocaleLowerCase();
}

const CITATION_STOP_WORDS = new Set([
  "about",
  "after",
  "also",
  "and",
  "are",
  "can",
  "for",
  "from",
  "has",
  "have",
  "into",
  "its",
  "more",
  "not",
  "that",
  "the",
  "their",
  "then",
  "this",
  "use",
  "uses",
  "using",
  "was",
  "were",
  "with",
]);

function evidenceWords(value: string) {
  return new Set(
    normalizeEvidence(value)
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .split(/\s+/u)
      .filter((word) => word.length >= 3 && !CITATION_STOP_WORDS.has(word)),
  );
}

/**
 * Models sometimes identify the right source but paraphrase its quote. Repair
 * that formatting error without trusting the paraphrase: select the exact
 * source sentence with the strongest lexical match to the generated claim.
 */
function bestExactCitation(
  claim: string,
  sources: SourceRow[],
): CourseCitation | null {
  const claimWords = evidenceWords(claim);
  let best:
    | {
        citation: CourseCitation;
        score: number;
      }
    | undefined;

  for (const source of sources) {
    const sentences = source.content
      .replace(/\s+/gu, " ")
      .split(/(?<=[.!?])\s+/u)
      .map((sentence) => sentence.trim())
      .filter(
        (sentence) =>
          sentence.length >= 24 &&
          sentence.length <= 360 &&
          !/[#`]/u.test(sentence) &&
          !sentence.includes("[...]"),
      );

    for (const sentence of sentences) {
      const sentenceWords = evidenceWords(sentence);
      const score = [...claimWords].filter((word) =>
        sentenceWords.has(word),
      ).length;
      if (score < 2 || (best && score <= best.score)) continue;
      best = {
        citation: {
          source: source.filename,
          quote: sentence,
          url: source.url,
        },
        score,
      };
    }
  }

  return best?.citation ?? null;
}

function uniqueCitations(citations: CourseCitation[]) {
  const seen = new Set<string>();
  return citations.filter((citation) => {
    const key = `${citation.source}\u0000${normalizeEvidence(citation.quote)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Model citations are untrusted output. Keep only citations whose filename
 * resolves to an uploaded source and whose quoted text appears in that file.
 * This prevents a plausible-looking citation from reaching the student.
 */
function verifiedCitations(
  citations: CourseCitation[],
  sources: SourceRow[],
): CourseCitation[] {
  const sourceByName = new Map(
    sources.map((source) => [
      source.filename.trim().toLocaleLowerCase(),
      source,
    ]),
  );
  const seen = new Set<string>();
  const verified: CourseCitation[] = [];

  for (const citation of citations) {
    const source = sourceByName.get(citation.source.trim().toLocaleLowerCase());
    const quote = citation.quote.trim();
    if (
      !source ||
      quote.length < 8 ||
      !normalizeEvidence(source.content).includes(normalizeEvidence(quote))
    ) {
      continue;
    }

    const key = `${source.filename}\u0000${normalizeEvidence(quote)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    verified.push({ source: source.filename, quote, url: source.url });
  }

  return verified;
}

function verifyCourseCitations(
  course: GeneratedCourse,
  sources: SourceRow[],
): GeneratedCourse {
  const courseCitations = verifiedCitations(course.citations, sources);
  const researchedNoteCitations = sources.some((source) => source.url)
    ? uniqueCitations(
        course.notes
          .map((note) => bestExactCitation(note, sources))
          .filter((citation): citation is CourseCitation => !!citation),
      ).slice(0, 8)
    : [];
  const overviewCitation =
    courseCitations.length > 0
      ? courseCitations
      : [
          bestExactCitation(
            `${course.summary} ${course.notes.join(" ")}`,
            sources,
          ),
        ].filter((citation): citation is CourseCitation => !!citation);

  return {
    ...course,
    notes:
      researchedNoteCitations.length > 0
        ? researchedNoteCitations.map((citation) => citation.quote)
        : course.notes,
    citations: uniqueCitations([
      ...overviewCitation,
      ...researchedNoteCitations,
    ]),
    sections: course.sections.map((section) => {
      const citations = verifiedCitations(section.citations, sources);
      return {
        ...section,
        citations:
          citations.length > 0
            ? citations
            : [
                bestExactCitation(
                  [
                    section.title,
                    section.intuition,
                    section.technical,
                    section.example,
                    ...section.key_points,
                  ].join(" "),
                  sources,
                ),
              ].filter((citation): citation is CourseCitation => !!citation),
      };
    }),
  };
}

function hasCitationCoverage(course: GeneratedCourse, grounded: boolean) {
  return (
    !grounded ||
    (course.citations.length > 0 &&
      course.sections.every((section) => section.citations.length > 0))
  );
}

function localCourseReview(
  course: GeneratedCourse,
  grounded: boolean,
): CourseReview {
  const hasKeyPoints = course.sections.every(
    (section) => section.key_points.length > 0,
  );
  const hasLearningChecks = course.sections.every(
    (section) => section.quiz.trim().length > 0,
  );
  const hasCitations = hasCitationCoverage(course, grounded);

  return {
    approved: hasKeyPoints && hasLearningChecks && hasCitations,
    summary:
      "The model reviewer was unavailable, so the orchestrator completed structural safety checks locally.",
    checks: [
      {
        name: "grounding",
        passed: hasCitations,
        detail: hasCitations
          ? "Grounding rules are enforced and every grounded section retains verified source evidence."
          : "One or more grounded sections are missing a verified source citation.",
      },
      {
        name: "coverage",
        passed: course.sections.length > 0,
        detail: "The course contains at least one teachable section.",
      },
      {
        name: "pedagogy",
        passed: course.sections.every(
          (section) =>
            !!section.intuition && !!section.technical && !!section.example,
        ),
        detail:
          "Every section includes intuition, technical detail, and an example.",
      },
      {
        name: "assessment",
        passed: hasKeyPoints && hasLearningChecks,
        detail: "Every section includes key points and a quiz.",
      },
    ],
    issues: [],
  };
}

const breadthSchema = z.object({
  broad: z.boolean(),
  reason: z.string().nullish(),
  suggestions: z.array(z.string().min(1)).default([]),
});

/**
 * Topics that name a whole field rather than a thing inside one.
 *
 * This is a list, not a judgement, because the judgement did not work. Asked
 * as a field inside the course JSON it flagged "the Krebs cycle"; asked with a
 * tighter prompt it let "Psychology" through; asked as its own call on the
 * small model it missed "machine learning"; asked again on the larger model it
 * missed "Chemistry" as well. Four configurations, four different wrong
 * answers, all on a question a person answers instantly.
 *
 * A list cannot generalise, but it also cannot tell someone their perfectly
 * good topic is too broad — and that is the failure that actually costs
 * something. Anything not here is treated as specific, which is the safe
 * default. Extend it when a real topic slips through.
 */
const FIELD_TOPICS = new Set([
  "algebra",
  "anatomy",
  "art",
  "artificial intelligence",
  "astronomy",
  "biology",
  "business",
  "calculus",
  "chemistry",
  "computer science",
  "data science",
  "deep learning",
  "earth science",
  "ecology",
  "economics",
  "engineering",
  "english",
  "finance",
  "genetics",
  "geography",
  "geometry",
  "history",
  "law",
  "linguistics",
  "literature",
  "machine learning",
  "maths",
  "mathematics",
  "medicine",
  "microbiology",
  "music",
  "neuroscience",
  "nursing",
  "philosophy",
  "physics",
  "physiology",
  "politics",
  "programming",
  "psychology",
  "science",
  "sociology",
  "software engineering",
  "statistics",
  "trigonometry",
  "world history",
]);

/**
 * Strips the decoration people put around a subject name so "Intro to Biology"
 * and "biology 101" both reach the list as "biology".
 */
function normalizedTopicName(topic: string): string {
  return topic
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b(an?|the)\b/g, " ")
    .replace(/\b(intro|introduction|basics|fundamentals|overview)\b/g, " ")
    .replace(/\bto\b/g, " ")
    .replace(/\b(101|1|i)\b$/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Used when the copy call fails but the list has already decided. */
const FALLBACK_BREADTH_REASON = (topic: string) =>
  `"${topic}" covers a whole field, which is more than one explanation can reach.`;

function namesAWholeField(topic: string): boolean {
  return FIELD_TOPICS.has(normalizedTopicName(topic));
}

/**
 * Whether the topic is too wide to explain back, as its own small call.
 *
 * Returns null on anything unexpected, including an unavailable provider. The
 * note is a courtesy; a course that fails to build because the breadth check
 * had a bad minute would be a far worse trade.
 */
async function judgeTopicBreadth(
  topic: string,
): Promise<GeneratedCourse["scope_note"]> {
  if (!namesAWholeField(topic)) return null;

  // The list has already decided. The model only writes the copy, which is
  // what it is reliably good at, and runs in parallel with generation so it
  // costs no wall-clock time.
  try {
    const result = await completeJson(
      topicBreadthPrompt(topic),
      (value) => breadthSchema.parse(value),
      { fast: true, maxOutputTokens: 300 },
    );
    const { reason, suggestions } = result.data;
    if (!reason?.trim()) {
      return { reason: FALLBACK_BREADTH_REASON(topic), suggestions: [] };
    }
    return {
      reason: reason.trim(),
      // Strip the "Narrower topic:" style prefixes the model reaches for even
      // when told not to.
      suggestions: suggestions
        .map((s) => s.replace(/^\s*(narrower\s+topic|try|instead)\s*:\s*/i, ""))
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 3),
    };
  } catch {
    // The list already established this is a field; losing the warning because
    // the copy call failed would be the wrong trade.
    return { reason: FALLBACK_BREADTH_REASON(topic), suggestions: [] };
  }
}

export async function orchestrateCourse(params: {
  topic: string;
  notes: string | null;
  sources: SourceRow[];
}) {
  const startedAt = new Date().toISOString();
  const runId = crypto.randomUUID();
  const grounded = params.sources.length > 0;
  const research = grounded
    ? { sources: [], resources: [], searched: false }
    : await discoverCourseEvidence(params.topic);
  const evidenceSources =
    params.sources.length > 0 ? params.sources : research.sources;
  const evidenceGrounded = evidenceSources.length > 0;
  const agents: AgentStep[] = [
    agentStep(
      "source-scout",
      "Source Scout",
      "Index uploads or research direct evidence before generation.",
      grounded
        ? `Indexed ${params.sources.length} source${params.sources.length === 1 ? "" : "s"} for grounded generation.`
        : research.sources.length > 0
          ? `Researched ${research.sources.length} direct source${research.sources.length === 1 ? "" : "s"} with one basic search.`
          : "No uploads or reliable research results were available; using established textbook knowledge.",
      {
        status:
          grounded || research.sources.length > 0 ? "completed" : "degraded",
        provider: "local",
      },
    ),
  ];

  // Breadth is judged by its own call, in parallel, so it adds no wall-clock
  // time to an operation already measured in tens of seconds. Asked as one
  // question it is answerable; asked as a field inside the course JSON it was
  // wrong in both directions.
  const [architect, breadth] = await Promise.all([
    completeJson(
      `${courseGenerationPrompt(params.topic, params.notes, evidenceGrounded)}

${renderSources(evidenceSources)}`,
      (value) => courseSchema.parse(value),
    ),
    judgeTopicBreadth(params.topic),
  ]);
  const architectCourse = {
    ...verifyCourseCitations(architect.data, evidenceSources),
    scope_note: breadth,
  };
  const keyPointCount = architectCourse.sections.reduce(
    (total, section) => total + section.key_points.length,
    0,
  );

  agents.push(
    agentStep(
      "course-architect",
      "Course Architect",
      "Build the lesson, revision notes, checks, and follow-up resources.",
      `Created ${architectCourse.sections.length} lesson section${architectCourse.sections.length === 1 ? "" : "s"} with ${keyPointCount} checkable key point${keyPointCount === 1 ? "" : "s"}.`,
      { status: "completed", provider: architect.provider },
    ),
  );

  let review: CourseReview;
  let reviewerProvider: "gemini" | "groq" | "local" = "local";
  let reviewerStatus: AgentStep["status"] = "completed";

  try {
    const reviewer = await completeJson(
      courseReviewPrompt({
        topic: params.topic,
        grounded: evidenceGrounded,
        sourceNames: evidenceSources.map((source) => source.filename),
        sourceEvidence: sourceEvidence(evidenceSources),
        draft: auditView(architectCourse),
      }),
      (value) => courseReviewSchema.parse(value),
      { maxOutputTokens: REVIEW_OUTPUT_TOKENS },
    );
    review = reviewer.data;
    reviewerProvider = reviewer.provider;
  } catch (error) {
    if (!(error instanceof AiUnavailableError)) throw error;
    review = localCourseReview(architectCourse, evidenceGrounded);
    reviewerStatus = "degraded";
  }

  if (!hasCitationCoverage(architectCourse, evidenceGrounded)) {
    review = {
      ...review,
      approved: false,
      summary:
        "The draft needs revision because one or more claims lack verified source evidence.",
      checks: review.checks.map((check) =>
        check.name === "grounding"
          ? {
              ...check,
              passed: false,
              detail:
                "Every grounded section and the course overview must retain an exact, verified source excerpt.",
            }
          : check,
      ),
      issues: [
        ...review.issues,
        "Add a verified citation to the overview and every lesson section. Use an exact source filename and a verbatim excerpt from that source.",
      ],
    };
  }

  agents.push(
    agentStep(
      "accuracy-reviewer",
      "Accuracy Reviewer",
      "Independently audit grounding, coverage, pedagogy, and assessment.",
      review.summary,
      { status: reviewerStatus, provider: reviewerProvider },
    ),
  );

  let course = architectCourse;
  if (!review.approved && review.issues.length > 0) {
    try {
      const revision = await completeJson(
        courseRevisionPrompt({
          topic: params.topic,
          grounded: evidenceGrounded,
          draft: course,
          issues: review.issues,
          sourceBlock: renderSources(evidenceSources),
        }),
        (value) => courseSchema.parse(value),
      );
      course = {
        ...verifyCourseCitations(revision.data, evidenceSources),
        // The reviser rewrites the course body and has no idea the topic was
        // classified as a field, so it returns this as null and would silently
        // discard the warning. Breadth is decided from the topic string alone
        // and cannot be changed by revising the prose.
        scope_note: architectCourse.scope_note,
      };
      agents.push(
        agentStep(
          "revision-specialist",
          "Revision Specialist",
          "Resolve every issue raised by the Accuracy Reviewer.",
          `Revised the course in response to ${review.issues.length} reviewer issue${review.issues.length === 1 ? "" : "s"}.`,
          { status: "revised", provider: revision.provider },
        ),
      );
    } catch (error) {
      if (!(error instanceof AiUnavailableError)) throw error;
      agents.push(
        agentStep(
          "revision-specialist",
          "Revision Specialist",
          "Resolve every issue raised by the Accuracy Reviewer.",
          "The revision agent could not return a valid draft, so the orchestrator preserved the architect's validated course.",
          { status: "degraded", provider: "local" },
        ),
      );
    }
  }

  if (!hasCitationCoverage(course, evidenceGrounded)) {
    throw new CourseCitationError();
  }

  const [videoDiscovery, resourceDiscovery] = await Promise.all([
    discoverCourseVideos(params.topic, course.video_searches),
    grounded
      ? discoverCourseResources(
          params.topic,
          course.sections.flatMap((section) => section.key_points),
        )
      : Promise.resolve(research),
  ]);
  course = {
    ...course,
    videos: videoDiscovery.videos,
    resources:
      resourceDiscovery.resources.length > 0
        ? resourceDiscovery.resources
        : course.resources,
  };
  agents.push(
    agentStep(
      "video-researcher",
      "Video Researcher",
      "Find direct educational videos for the finished course.",
      videoDiscovery.videos.length > 0
        ? `Found ${videoDiscovery.videos.length} direct video${videoDiscovery.videos.length === 1 ? "" : "s"} matched to this course.`
        : "No reliable direct videos were found, so no search-page links were added.",
      {
        status: videoDiscovery.videos.length > 0 ? "completed" : "degraded",
      },
    ),
  );
  agents.push(
    agentStep(
      "resource-researcher",
      "Resource Researcher",
      "Resolve follow-up topics to direct English educational websites.",
      resourceDiscovery.resources.length > 0
        ? `Found ${resourceDiscovery.resources.length} direct English reading resource${resourceDiscovery.resources.length === 1 ? "" : "s"}.`
        : "No reliable direct reading pages were found, so no search-page links were added.",
      {
        status:
          resourceDiscovery.resources.length > 0 ? "completed" : "degraded",
      },
    ),
  );

  const orchestration: AgentRun = {
    run_id: runId,
    strategy:
      "source research → architect → independent review → conditional revision",
    started_at: startedAt,
    completed_at: new Date().toISOString(),
    agents,
  };

  return {
    course: { ...course, orchestration },
    grounded,
    primaryProvider: architect.provider,
    review,
  };
}

type ExplanationParams = {
  topic: string;
  keyPoints: string[];
  transcript: string;
  grounded: boolean;
  sources: SourceRow[];
  mode: "live" | "final";
  /**
   * The section question this recording answers.
   *
   * When set, `keyPoints` are that section's alone and both prompts are told
   * what was asked, so the answer is judged against the question instead of
   * against the whole course. Absent for sessions recorded before questions
   * existed, and for courses that have no sections to ask about.
   */
  question?: string;
  /**
   * Speech that came before `transcript` and has already been graded.
   *
   * Live passes grade only the newest slice of the explanation, so that the
   * prompt and the span JSON stay the same size at three minutes as they were
   * at three seconds. This carries just enough of what came before for a
   * back-referencing sentence to still be judgeable. Never set on a `final`
   * pass, which grades the whole transcript at once.
   */
  context?: string;
};

type EvaluatedTranscriptSpan = {
  text: string;
  status: SpanStatus;
  issue: string | null;
};

const FALLBACK_STOP_WORDS = new Set([
  "about",
  "after",
  "also",
  "and",
  "are",
  "because",
  "been",
  "before",
  "being",
  "between",
  "but",
  "can",
  "did",
  "does",
  "during",
  "for",
  "from",
  "has",
  "have",
  "into",
  "its",
  "more",
  "not",
  "that",
  "the",
  "their",
  "then",
  "there",
  "these",
  "they",
  "this",
  "through",
  "was",
  "were",
  "which",
  "with",
  "would",
]);

function meaningfulTerms(value: string) {
  return new Set(
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .split(/\s+/)
      .filter((term) => term.length >= 3 && !FALLBACK_STOP_WORDS.has(term))
      .map((term) => term.replace(/(ing|ed|es|s)$/u, "")),
  );
}

/**
 * Last-resort evaluator for provider outages. It is intentionally
 * conservative: only a strong vocabulary match counts as covered. That can
 * under-credit a creative paraphrase, but it cannot award a high score for a
 * one-line explanation that omits most of the course.
 */
function localTranscriptEvaluation(params: ExplanationParams) {
  const transcriptTerms = meaningfulTerms(params.transcript);
  const covered = new Set<number>();

  params.keyPoints.forEach((keyPoint, index) => {
    const terms = [...meaningfulTerms(keyPoint)];
    if (terms.length === 0) return;
    const matches = terms.filter((term) => transcriptTerms.has(term)).length;
    const required =
      terms.length <= 3 ? terms.length : Math.ceil(terms.length * 0.6);
    if (matches >= required) covered.add(index);
  });

  const status: SpanStatus =
    covered.size > 0 ? "correct" : params.mode === "live" ? "neutral" : "gap";
  const spans: EvaluatedTranscriptSpan[] = [
    {
      text: params.transcript,
      status,
      issue:
        status === "gap"
          ? "The explanation did not clearly cover a course key point."
          : null,
    },
  ];

  return { spans, covered };
}

function localGapReport({
  keyPoints,
  covered,
  spans,
}: {
  keyPoints: string[];
  covered: Set<number>;
  spans: EvaluatedTranscriptSpan[];
}): GapReport {
  const correctClaims = spans.filter((span) => span.status === "correct");
  return completeCoverageReport({
    // The offline path cannot judge depth — it matches vocabulary, which says
    // nothing about whether a mechanism was explained. Claiming no thoroughness
    // understates rather than flatters, which is the right way to be wrong when
    // the grader is degraded.
    thorough: new Set<number>(),
    partial: new Set<number>(),
    draft: {
      score: 0,
      verdict: "",
      gaps: spans
        .filter((span) => span.status === "gap" && span.issue)
        .map((span) => ({
          phrase: span.text.slice(0, 120),
          category: "vague" as const,
          explanation:
            span.issue ?? "This point needs a more specific explanation.",
        })),
      strengths:
        correctClaims.length > 0
          ? ["Your explanation included course-relevant details."]
          : [],
      next_focus: "",
    },
    keyPoints,
    covered,
    spans,
  });
}

export async function orchestrateExplanation(params: ExplanationParams) {
  const startedAt = new Date().toISOString();
  const runId = crypto.randomUUID();
  const sourceBlock = renderSources(params.sources);
  const agents: AgentStep[] = [];

  let spans: EvaluatedTranscriptSpan[];
  let covered: Set<number>;
  let partial: Set<number>;
  let thorough: Set<number>;
  let detectionProvider: "gemini" | "groq" | "local";
  let detectionStatus: AgentStep["status"] = "completed";

  try {
    const detection = await completeJson(
      `${gapDetectionPrompt(params)}\n\n${sourceBlock}`,
      (value) => spansSchema.parse(value),
      // Live colouring is on the student's critical path — every millisecond
      // here is a millisecond of grey text while they're still talking. The
      // span JSON for one explanation fits well inside 900 tokens, and asking
      // for less is also what keeps the small model's 6K-per-minute window from
      // rate-limiting a run of quick phrases.
      params.mode === "live" ? { fast: true, maxOutputTokens: 900 } : {},
    );
    spans = reconcileSpans(params.transcript, detection.data.spans);
    covered = coveredKeyPointIndices(
      detection.data.covered_key_points,
      params.keyPoints.length,
    );
    partial = coveredKeyPointIndices(
      detection.data.partial_key_points,
      params.keyPoints.length,
    );
    thorough = coveredKeyPointIndices(
      detection.data.thorough_key_points,
      params.keyPoints.length,
    );
    detectionProvider = detection.provider;
  } catch (error) {
    if (!(error instanceof AiUnavailableError)) throw error;
    const fallback = localTranscriptEvaluation(params);
    spans = fallback.spans;
    covered = fallback.covered;
    // Vocabulary matching can tell neither a mechanism from a mention nor a
    // half-covered point from a whole one.
    partial = new Set<number>();
    thorough = new Set<number>();
    detectionProvider = "local";
    detectionStatus = "degraded";
  }
  const missingKeyPoints = params.keyPoints.filter(
    (_, index) => !covered.has(index),
  );

  agents.push(
    agentStep(
      "transcript-evaluator",
      "Transcript Evaluator",
      "Classify the student's claims against the course key points.",
      detectionStatus === "degraded"
        ? "AI evaluation was unavailable, so a conservative local course-coverage check kept the recording usable."
        : `Evaluated the explanation and identified ${spans.filter((span) => span.status === "gap").length} gap span${spans.filter((span) => span.status === "gap").length === 1 ? "" : "s"}.`,
      { status: detectionStatus, provider: detectionProvider },
    ),
  );

  let report: GapReport | null = null;
  let finalProvider = detectionProvider;

  if (params.mode === "final") {
    let coachStatus: AgentStep["status"] = "completed";
    try {
      const coaching = await completeJson(
        `${gapReportPrompt({
          ...params,
          gaps: spans
            .filter((span) => span.status === "gap")
            .map((span) => ({ text: span.text, issue: span.issue })),
          missingKeyPoints,
        })}\n\n${sourceBlock}`,
        (value) => reportSchema.parse(value),
      );
      report = completeCoverageReport({
        draft: coaching.data,
        keyPoints: params.keyPoints,
        scoped: !!params.question,
        covered,
        partial,
        thorough,
        spans,
        transcript: params.transcript,
      });
      finalProvider = coaching.provider;
    } catch (error) {
      if (!(error instanceof AiUnavailableError)) throw error;
      report = localGapReport({ keyPoints: params.keyPoints, covered, spans });
      finalProvider = "local";
      coachStatus = "degraded";
    }

    agents.push(
      agentStep(
        "gap-coach",
        "Gap Coach",
        "Teach the detected gaps only after the student finishes speaking.",
        coachStatus === "degraded"
          ? `AI coaching was unavailable, so the course rubric produced a complete ${Math.round(report.score)}% coverage report with ${report.gaps.length} review item${report.gaps.length === 1 ? "" : "s"}.`
          : `Produced a ${Math.round(report.score)}% understanding score and ${report.gaps.length} targeted coaching item${report.gaps.length === 1 ? "" : "s"}.`,
        { status: coachStatus, provider: finalProvider },
      ),
    );
  }

  return {
    spans,
    covered: [...covered],
    report,
    provider: finalProvider,
    orchestration: {
      run_id: runId,
      strategy:
        params.mode === "live"
          ? "transcript evaluation"
          : "transcript evaluation → post-explanation coaching",
      started_at: startedAt,
      completed_at: new Date().toISOString(),
      agents,
    } satisfies AgentRun,
  };
}
