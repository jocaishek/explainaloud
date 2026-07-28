import { NextResponse } from "next/server";
import { gapDetectionPrompt, gapReportPrompt } from "~/lib/ai/prompts";
import { AiUnavailableError, completeJson } from "~/lib/ai/provider";
import {
  type GeneratedCourse,
  reconcileSpans,
  reportSchema,
  spansSchema,
} from "~/lib/ai/schemas";
import { renderSources, type SourceRow } from "~/lib/ai/sources";
import { createClient } from "~/lib/supabase/server";

export const maxDuration = 120;

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

  let body: { transcript?: unknown; mode?: unknown; sessionId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  const transcript = String(body.transcript ?? "").trim();
  const mode = body.mode === "final" ? "final" : "live";
  const sessionId =
    typeof body.sessionId === "string" ? body.sessionId : undefined;

  if (transcript.length < 12) {
    return NextResponse.json({ spans: [], covered: [], tooShort: true });
  }

  const { data: course } = await supabase
    .from("courses")
    .select("id, topic, generated")
    .eq("id", courseId)
    .eq("user_id", user.id)
    .maybeSingle<{
      id: string;
      topic: string;
      generated: GeneratedCourse | null;
    }>();

  if (!course) {
    return NextResponse.json({ error: "Topic not found." }, { status: 404 });
  }

  const keyPoints =
    course.generated?.sections.flatMap((s) => s.key_points) ?? [];

  if (keyPoints.length === 0) {
    return NextResponse.json(
      {
        error: "Generate the course first — there's nothing to grade against.",
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
  const sourceBlock = renderSources(sources ?? []);

  try {
    const detection = await completeJson(
      `${gapDetectionPrompt({ topic: course.topic, keyPoints, transcript, grounded })}\n\n${sourceBlock}`,
      (value) => spansSchema.parse(value),
    );

    // Guarantees every character of what the student said is rendered, even
    // if the model's spans were incomplete.
    const spans = reconcileSpans(transcript, detection.data.spans);

    if (mode === "live") {
      return NextResponse.json({
        spans,
        covered: detection.data.covered_key_points,
        provider: detection.provider,
      });
    }

    const report = await completeJson(
      `${gapReportPrompt({
        topic: course.topic,
        keyPoints,
        transcript,
        gaps: spans
          .filter((s) => s.status === "gap")
          .map((s) => ({ text: s.text, issue: s.issue })),
        grounded,
      })}\n\n${sourceBlock}`,
      (value) => reportSchema.parse(value),
    );

    if (sessionId) {
      await supabase
        .from("course_sessions")
        .update({
          spans,
          report: report.data,
          score: Math.round(report.data.score),
          analyzed_at: new Date().toISOString(),
        })
        .eq("id", sessionId)
        .eq("user_id", user.id);

      // Persist each gap so the Gap Report screen has real rows to show.
      if (report.data.gaps.length) {
        await supabase.from("gaps").insert(
          report.data.gaps.map((gap) => ({
            session_id: sessionId,
            user_id: user.id,
            phrase: gap.phrase,
            category: gap.category,
            explanation: gap.explanation,
            quiz: gap.quiz,
          })),
        );
      }
    }

    return NextResponse.json({
      spans,
      covered: detection.data.covered_key_points,
      report: report.data,
      provider: report.provider,
    });
  } catch (error) {
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
