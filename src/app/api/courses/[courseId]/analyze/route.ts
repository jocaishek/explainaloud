import { NextResponse } from "next/server";
import { z } from "zod";
import { orchestrateExplanation } from "~/lib/ai/orchestrator";
import { AiUnavailableError } from "~/lib/ai/provider";
import type { GeneratedCourse } from "~/lib/ai/schemas";
import type { SourceRow } from "~/lib/ai/sources";
import { toPurpose } from "~/lib/purpose";
import { claimApiCall, RATE_LIMITED_MESSAGE } from "~/lib/rate-limit";
import { createClient } from "~/lib/supabase/server";

export const maxDuration = 120;

/**
 * Ceilings on what one request may carry.
 *
 * A three-minute explanation is a few thousand characters, so these are far
 * above any honest recording. They exist because the transcript is caller-
 * supplied text that goes straight into a paid model prompt: without a cap, a
 * single crafted POST spends the token budget for every other student.
 */
const MAX_TRANSCRIPT_CHARS = 20_000;
const MAX_CONTEXT_CHARS = 2_000;

const requestSchema = z.object({
  transcript: z.string().max(MAX_TRANSCRIPT_CHARS),
  mode: z.enum(["live", "final"]).default("live"),
  // Preceding, already-graded speech. Live passes send only the newest slice
  // of the transcript so that latency stays flat as the recording grows; this
  // is the context that makes that slice judgeable on its own.
  context: z.string().max(MAX_CONTEXT_CHARS).optional(),
  sessionId: z.uuid().optional(),
  /**
   * Which section's question the student is answering.
   *
   * Only an index crosses the wire. The question text and the key points are
   * read from the stored course on this side, so a caller cannot choose what
   * they are graded against by sending a friendlier question with it.
   */
  sectionIndex: z.number().int().nonnegative().optional(),
  /**
   * What a complete answer to the question contains, as the Examiner wrote it
   * alongside the question itself.
   *
   * The section's own key points are the wrong yardstick for a question the
   * Examiner invented: it asks something narrow, and marking the answer
   * against everything the section covers reported "0 of 3 covered" for an
   * answer that addressed the question well. These come from a model, not from
   * the student, and the only thing they can bias is the student's own score.
   */
  questionKeyPoints: z.array(z.string().min(1).max(400)).max(6).optional(),
});

/**
 * Grades a spoken explanation.
 *
 * `mode: "live"` classifies the transcript so far and returns coloured spans
 * only. `mode: "final"` additionally produces the teaching report.
 *
 * The split is the product rule made structural: the explaining pass is a
 * separate request that literally cannot run until the client says the
 * student has finished, so nothing can interrupt them mid-sentence.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  const { courseId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  // The highest-volume route in the app — live grading calls it roughly once a
  // second — so its ceiling is the loosest, and still trips a loop in seconds.
  if (!(await claimApiCall(supabase, "analyze"))) {
    return NextResponse.json({ error: RATE_LIMITED_MESSAGE }, { status: 429 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  const parsedBody = requestSchema.safeParse(raw);
  if (!parsedBody.success) {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  const transcript = parsedBody.data.transcript.trim();
  const mode = parsedBody.data.mode;
  const sessionId = parsedBody.data.sessionId;
  // Context only narrows a live pass. On a final pass the whole transcript is
  // already in hand, so accepting one would just pay for duplicated tokens.
  const context =
    mode === "live" ? parsedBody.data.context?.trim() || undefined : undefined;

  if (transcript.length < 12) {
    return NextResponse.json({ spans: [], covered: [], tooShort: true });
  }

  const { data: course } = await supabase
    .from("courses")
    .select("id, topic, generated, purpose")
    .eq("id", courseId)
    .eq("user_id", user.id)
    .maybeSingle<{
      id: string;
      topic: string;
      generated: GeneratedCourse | null;
      purpose: string | null;
    }>();

  if (!course) {
    return NextResponse.json({ error: "Topic not found." }, { status: 404 });
  }

  // A question narrows the grading to the section it came from. That is the
  // whole point of asking one: an answer is complete when it answers what was
  // asked, so the denominator has to be what was asked and nothing else.
  const sections = course.generated?.sections ?? [];
  const section =
    parsedBody.data.sectionIndex !== undefined
      ? sections[parsedBody.data.sectionIndex]
      : undefined;
  const question = section?.quiz?.trim() || undefined;
  const keyPoints = parsedBody.data.questionKeyPoints?.length
    ? parsedBody.data.questionKeyPoints
    : section
      ? section.key_points
      : sections.flatMap((s) => s.key_points);

  if (keyPoints.length === 0) {
    return NextResponse.json(
      {
        error: "Generate the course first. There's nothing to grade against.",
      },
      { status: 422 },
    );
  }

  const { data: sources } = await supabase
    .from("course_sources")
    .select("filename, content")
    .eq("course_id", courseId)
    .eq("user_id", user.id)
    .returns<SourceRow[]>();

  const grounded = (sources?.length ?? 0) > 0;
  try {
    const result = await orchestrateExplanation({
      topic: course.topic,
      purpose: toPurpose(course.purpose),
      keyPoints,
      question,
      transcript,
      grounded,
      sources: sources ?? [],
      mode,
      context,
    });

    if (mode === "live") {
      return NextResponse.json({
        spans: result.spans,
        covered: result.covered,
        provider: result.provider,
        orchestration: result.orchestration,
      });
    }

    const report = result.report;
    if (!report) {
      throw new AiUnavailableError("Gap Coach returned no final report.");
    }

    if (sessionId) {
      const { error: sessionError } = await supabase
        .from("course_sessions")
        .update({
          spans: result.spans,
          report,
          score: Math.round(report.score),
          analyzed_at: new Date().toISOString(),
        })
        .eq("id", sessionId)
        .eq("course_id", courseId)
        .eq("user_id", user.id);

      if (sessionError) {
        return NextResponse.json(
          { error: "The gap report was built but couldn't be saved." },
          { status: 500 },
        );
      }

      // A retry replaces an earlier partial result instead of duplicating it.
      const { error: clearError } = await supabase
        .from("gaps")
        .delete()
        .eq("session_id", sessionId)
        .eq("user_id", user.id);

      if (clearError) {
        return NextResponse.json(
          { error: "The gap report was built but couldn't be saved." },
          { status: 500 },
        );
      }

      // Persist each gap so the Gap Report screen has real rows to show.
      if (report.gaps.length) {
        const { error: gapsError } = await supabase.from("gaps").insert(
          report.gaps.map((gap) => ({
            session_id: sessionId,
            user_id: user.id,
            phrase: gap.phrase,
            category: gap.category,
            explanation: gap.explanation,
          })),
        );

        if (gapsError) {
          return NextResponse.json(
            { error: "The gap report was built but couldn't be saved." },
            { status: 500 },
          );
        }
      }
    }

    return NextResponse.json({
      spans: result.spans,
      covered: result.covered,
      report,
      provider: result.provider,
      orchestration: result.orchestration,
    });
  } catch (error) {
    console.error("Explanation analysis failed:", error);
    if (error instanceof AiUnavailableError) {
      return NextResponse.json(
        // The provider breakdown is diagnostic, not something to put in
        // front of a student — it names vendors and leaks failure detail.
        {
          error: "This service can't be used at the moment. Try again shortly.",
        },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: "This service can't be used at the moment. Try again shortly." },
      { status: 500 },
    );
  }
}
