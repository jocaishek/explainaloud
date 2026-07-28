import "server-only";

import {
  courseGenerationPrompt,
  courseReviewPrompt,
  courseRevisionPrompt,
  gapDetectionPrompt,
  gapReportPrompt,
} from "~/lib/ai/prompts";
import { AiUnavailableError, completeJson } from "~/lib/ai/provider";
import {
  type AgentRun,
  type AgentStep,
  type CourseReview,
  courseReviewSchema,
  courseSchema,
  type GapReport,
  type GeneratedCourse,
  reconcileSpans,
  reportSchema,
  spansSchema,
} from "~/lib/ai/schemas";
import { renderSources, type SourceRow } from "~/lib/ai/sources";

const REVIEW_OUTPUT_TOKENS = 900;
const REVIEW_EVIDENCE_CHARS = 6_000;

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
    sections: course.sections.map((section) => ({
      title: section.title,
      technical: section.technical,
      quiz: section.quiz,
      key_points: section.key_points,
    })),
    notes: course.notes,
    uncovered: course.uncovered,
  };
}

function localCourseReview(course: GeneratedCourse): CourseReview {
  const hasKeyPoints = course.sections.every(
    (section) => section.key_points.length > 0,
  );
  const hasLearningChecks = course.sections.every(
    (section) => section.quiz.trim().length > 0,
  );

  return {
    approved: hasKeyPoints && hasLearningChecks,
    summary:
      "The model reviewer was unavailable, so the orchestrator completed structural safety checks locally.",
    checks: [
      {
        name: "grounding",
        passed: true,
        detail: "Grounding rules remain enforced in the architect prompt.",
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

export async function orchestrateCourse(params: {
  topic: string;
  notes: string | null;
  sources: SourceRow[];
}) {
  const startedAt = new Date().toISOString();
  const runId = crypto.randomUUID();
  const grounded = params.sources.length > 0;
  const agents: AgentStep[] = [
    agentStep(
      "source-scout",
      "Source Scout",
      "Index the available evidence and choose the grounding mode.",
      grounded
        ? `Indexed ${params.sources.length} source${params.sources.length === 1 ? "" : "s"} for grounded generation.`
        : "Confirmed that no sources were supplied; using established textbook knowledge.",
      { status: "completed", provider: "local" },
    ),
  ];

  const architect = await completeJson(
    `${courseGenerationPrompt(params.topic, params.notes, grounded)}

${renderSources(params.sources)}`,
    (value) => courseSchema.parse(value),
  );
  const keyPointCount = architect.data.sections.reduce(
    (total, section) => total + section.key_points.length,
    0,
  );

  agents.push(
    agentStep(
      "course-architect",
      "Course Architect",
      "Build the lesson, revision notes, checks, and follow-up resources.",
      `Created ${architect.data.sections.length} lesson section${architect.data.sections.length === 1 ? "" : "s"} with ${keyPointCount} checkable key point${keyPointCount === 1 ? "" : "s"}.`,
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
        grounded,
        sourceNames: params.sources.map((source) => source.filename),
        sourceEvidence: sourceEvidence(params.sources),
        draft: auditView(architect.data),
      }),
      (value) => courseReviewSchema.parse(value),
      { maxOutputTokens: REVIEW_OUTPUT_TOKENS },
    );
    review = reviewer.data;
    reviewerProvider = reviewer.provider;
  } catch (error) {
    if (!(error instanceof AiUnavailableError)) throw error;
    review = localCourseReview(architect.data);
    reviewerStatus = "degraded";
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

  let course = architect.data;
  if (!review.approved && review.issues.length > 0) {
    try {
      const revision = await completeJson(
        courseRevisionPrompt({
          topic: params.topic,
          grounded,
          draft: course,
          issues: review.issues,
          sourceBlock: renderSources(params.sources),
        }),
        (value) => courseSchema.parse(value),
      );
      course = revision.data;
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

  const orchestration: AgentRun = {
    run_id: runId,
    strategy: "source → architect → independent review → conditional revision",
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
};

export async function orchestrateExplanation(params: ExplanationParams) {
  const startedAt = new Date().toISOString();
  const runId = crypto.randomUUID();
  const sourceBlock = renderSources(params.sources);
  const agents: AgentStep[] = [];

  const detection = await completeJson(
    `${gapDetectionPrompt(params)}\n\n${sourceBlock}`,
    (value) => spansSchema.parse(value),
  );
  const spans = reconcileSpans(params.transcript, detection.data.spans);

  agents.push(
    agentStep(
      "transcript-evaluator",
      "Transcript Evaluator",
      "Classify the student's claims against the course key points.",
      `Evaluated the explanation and identified ${spans.filter((span) => span.status === "gap").length} gap span${spans.filter((span) => span.status === "gap").length === 1 ? "" : "s"}.`,
      { status: "completed", provider: detection.provider },
    ),
  );

  let report: GapReport | null = null;
  let finalProvider = detection.provider;

  if (params.mode === "final") {
    const coaching = await completeJson(
      `${gapReportPrompt({
        ...params,
        gaps: spans
          .filter((span) => span.status === "gap")
          .map((span) => ({ text: span.text, issue: span.issue })),
      })}\n\n${sourceBlock}`,
      (value) => reportSchema.parse(value),
    );
    report = coaching.data;
    finalProvider = coaching.provider;
    agents.push(
      agentStep(
        "gap-coach",
        "Gap Coach",
        "Teach the detected gaps only after the student finishes speaking.",
        `Produced a ${Math.round(report.score)}% understanding score and ${report.gaps.length} targeted coaching item${report.gaps.length === 1 ? "" : "s"}.`,
        { status: "completed", provider: coaching.provider },
      ),
    );
  }

  return {
    spans,
    covered: detection.data.covered_key_points,
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
