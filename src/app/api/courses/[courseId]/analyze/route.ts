import { NextResponse } from "next/server";
import { z } from "zod";
import { orchestrateExplanation } from "~/lib/ai/orchestrator";
import { AiUnavailableError } from "~/lib/ai/provider";
import type { GeneratedCourse } from "~/lib/ai/schemas";
import type { SourceRow } from "~/lib/ai/sources";

/** What the grading pass reads: the budget's worth, plus how long the real
    document is, so the prompt can say truthfully that it was cut. */
type SourceExcerptRow = {
  filename: string;
  content_excerpt: string;
  content_length: number;
};

import { toPurpose } from "~/lib/purpose";
import { claimApiCall, RATE_LIMITED_MESSAGE } from "~/lib/rate-limit";
import { sessionUser } from "~/lib/supabase/server";

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
/** Mirrors `content_excerpt`'s `left(content, 8000)`, for the fallback path
    below and for nothing else — `SOURCE_BUDGET.grading` still owns the real
    decision, and the database column is generated from the same number. */
const GRADING_EXCERPT_CHARS = 8_000;
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
   * The section's own question text and key points are read from the stored
   * course on this side. `question` and `questionKeyPoints` below can override
   * them for questions written on the spot — both bias only the sender's own
   * score.
   */
  sectionIndex: z.number().int().nonnegative().optional(),
  /**
   * The question the student was actually shown, when it isn't the section's
   * own quiz — an interview's adaptive follow-up is written on the spot and
   * exists nowhere in the stored course. Grading used to fall back to the
   * section quiz for those, so the model framed its marking around a question
   * the student was never asked; question three, the most likely to be a
   * follow-up, was graded against the wrong question most often. Like
   * `questionKeyPoints` below, this comes from a model rather than the
   * student, and the only thing it can bias is the student's own score.
   */
  question: z.string().min(1).max(500).optional(),
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

  /* Claims, not `auth.getUser()`, and on this route the difference is
     measurable: a live pass runs about once a second while somebody is still
     speaking, and `getUser()` spends an Auth-server round trip on each one to
     re-learn what the signed token already says. Every query below is
     owner-scoped and sits behind RLS, which checks the same token again at the
     database. */
  const { supabase, user } = await sessionUser();
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

  /* Both reads at once. They do not depend on each other, and this route is
     on a one-second clock: run in series, the sources wait out the course
     lookup for no reason. The ownership filter is on both, so the sources
     query is not trusting the course query's result — it never was. */
  const [{ data: course }, { data: sources, error: sourcesError }] =
    await Promise.all([
      supabase
        .from("courses")
        .select("id, topic, generated, purpose")
        .eq("id", courseId)
        .eq("user_id", user.id)
        .maybeSingle<{
          id: string;
          topic: string;
          generated: GeneratedCourse | null;
          purpose: string | null;
        }>(),
      /* The opening of each source, not the document.
       *
       * Grading's budget is 8,000 characters across every source and always has
       * been — the sources are here to catch a contradiction, not to be taught
       * from. This query used to select `content` whole and then discard all but
       * that budget in JavaScript, which on a 5 MB upload is several megabytes
       * over the wire, once a second, to use two per cent of it.
       *
       * `content_excerpt` is that budget's worth, computed by the database. */
      supabase
        .from("course_sources")
        .select("filename, content_excerpt, content_length")
        .eq("course_id", courseId)
        .eq("user_id", user.id)
        .returns<SourceExcerptRow[]>(),
    ]);

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
  const question =
    parsedBody.data.question?.trim() || section?.quiz?.trim() || undefined;
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

  /* A deployment that arrived before its migration still grades grounded.
   *
   * Migrations here are applied by hand and the deploy happens on merge, so
   * there is a window where this code is live and `content_excerpt` does not
   * exist yet. PostgREST fails the whole select on an unknown column, which
   * would read as "this course has no sources" — grading would quietly stop
   * being grounded for exactly the people who uploaded something, and nothing
   * on screen would say so. One extra query during that window is cheap; the
   * silence is not. */
  let excerpts = sources;
  if (sourcesError) {
    console.error(
      "Falling back to full source content — has the excerpt migration been applied?",
      sourcesError.message,
    );
    const { data: whole } = await supabase
      .from("course_sources")
      .select("filename, content")
      .eq("course_id", courseId)
      .eq("user_id", user.id)
      .returns<Array<{ filename: string; content: string }>>();
    excerpts = (whole ?? []).map((row) => ({
      filename: row.filename,
      content_excerpt: row.content.slice(0, GRADING_EXCERPT_CHARS),
      content_length: row.content.length,
    }));
  }

  /* Marked where it was cut, in the text itself.
   *
   * `renderSources` says which documents it trimmed, because a model that
   * cannot tell it is reading part of one is the model that fills in the rest
   * from general knowledge. It works that out by comparing what it rendered
   * against what it was handed — and what it is handed here is already an
   * excerpt, so the cut has to be declared here or it is invisible. */
  const gradingSources: SourceRow[] = (excerpts ?? []).map((row) => ({
    filename: row.filename,
    content:
      row.content_length > row.content_excerpt.length
        ? `${row.content_excerpt}\n\n[This document is longer than one grading pass reads. Judge only what is above.]`
        : row.content_excerpt,
  }));

  const grounded = gradingSources.length > 0;
  try {
    const result = await orchestrateExplanation({
      topic: course.topic,
      purpose: toPurpose(course.purpose),
      keyPoints,
      question,
      transcript,
      grounded,
      sources: gradingSources,
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
      /* `.select()` on the update, and the result is checked.
       *
       * An UPDATE that matches no rows is not an error in PostgREST — it is a
       * success that changed nothing. Without asking for the row back, a
       * report that was never stored returned 200 with the report in the body,
       * so the recording screen showed it, the database did not have it, and
       * every later visit to the gap report quietly served the *previous*
       * session instead. The client cannot tell that apart from being graded
       * the same as last time. */
      const { data: saved, error: sessionError } = await supabase
        .from("course_sessions")
        .update({
          spans: result.spans,
          report,
          score: Math.round(report.score),
          analyzed_at: new Date().toISOString(),
        })
        .eq("id", sessionId)
        .eq("course_id", courseId)
        .eq("user_id", user.id)
        .select("id")
        .maybeSingle<{ id: string }>();

      if (sessionError || !saved) {
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
