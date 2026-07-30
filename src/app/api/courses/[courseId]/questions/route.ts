import { NextResponse } from "next/server";
import { z } from "zod";
import { interviewQuestionPrompt } from "~/lib/ai/prompts";
import { AiUnavailableError, completeJson } from "~/lib/ai/provider";
import type { GeneratedCourse } from "~/lib/ai/schemas";
import { claimApiCall, RATE_LIMITED_MESSAGE } from "~/lib/rate-limit";
import { createClient } from "~/lib/supabase/server";

export const maxDuration = 60;

/** Enough to make the next question specific; short enough not to cost. */
const MAX_WEAKNESS_CHARS = 600;

const requestSchema = z.object({
  /** How many to write. One while the interview is running, three to open it. */
  count: z.number().int().min(1).max(3).default(1),
  /**
   * What the last answer got wrong or never reached.
   *
   * This is what turns a question list into an examiner: given it, the next
   * question goes at the thing the student has just demonstrated they do not
   * have. Absent for the opening question, which has nothing to go on.
   */
  weakness: z.string().max(MAX_WEAKNESS_CHARS).optional(),
  /** Questions already asked this run. Past runs are read from the database. */
  asked: z.array(z.string().max(400)).max(12).default([]),
});

const responseSchema = z.object({
  questions: z
    .array(
      z.object({
        question: z.string().min(8),
        section_index: z.number().int().nonnegative().default(0),
      }),
    )
    .min(1),
});

/**
 * Writes the questions for an interview.
 *
 * Deliberately a request per question rather than a batch up front. The
 * interesting one is the second: by then the student has answered the first,
 * that answer has been graded, and what it missed is the best available
 * evidence of what to ask next. A batch cannot use it, because it was written
 * before anyone spoke.
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

  if (!(await claimApiCall(supabase, "analyze"))) {
    return NextResponse.json({ error: RATE_LIMITED_MESSAGE }, { status: 429 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  const parsed = requestSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  const { data: course } = await supabase
    .from("courses")
    .select("topic, generated")
    .eq("id", courseId)
    .eq("user_id", user.id)
    .maybeSingle<{ topic: string; generated: GeneratedCourse | null }>();

  const sections = course?.generated?.sections ?? [];
  if (!course || sections.length === 0) {
    return NextResponse.json(
      { error: "Generate the course first — there is nothing to ask about." },
      { status: 422 },
    );
  }

  // Every question this student has ever been asked on this course, so a
  // second interview is a second interview rather than the first one again.
  const { data: past } = await supabase
    .from("course_sessions")
    .select("question, segments")
    .eq("course_id", courseId)
    .eq("user_id", user.id)
    .not("question", "is", null)
    .limit(30)
    .returns<
      Array<{
        question: string | null;
        segments: Array<{ question?: string }> | null;
      }>
    >();

  const askedBefore = (past ?? []).flatMap((session) => [
    ...(session.question ? [session.question] : []),
    ...(session.segments ?? []).flatMap((segment) =>
      segment.question ? [segment.question] : [],
    ),
  ]);

  try {
    const result = await completeJson(
      interviewQuestionPrompt({
        topic: course.topic,
        sections: sections.map((section) => ({
          title: section.title,
          technical: section.technical,
          keyPoints: section.key_points,
        })),
        // Newest first, capped: an examiner does not need every question from
        // every past run to avoid repeating itself, and the prompt has to stay
        // inside a size that the small model still attends to.
        asked: [...new Set([...parsed.data.asked, ...askedBefore])].slice(
          0,
          12,
        ),
        weakness: parsed.data.weakness,
        count: parsed.data.count,
      }),
      (value) => responseSchema.parse(value),
      { fast: true, maxOutputTokens: 700 },
    );

    return NextResponse.json({
      questions: result.data.questions.slice(0, parsed.data.count).map((q) => ({
        question: q.question,
        section_index: Math.min(q.section_index, sections.length - 1),
        section:
          sections[Math.min(q.section_index, sections.length - 1)]?.title ?? "",
      })),
    });
  } catch (error) {
    if (error instanceof AiUnavailableError) {
      // The console falls back to the section questions, so this is a
      // degradation rather than a dead end.
      return NextResponse.json(
        { error: "Couldn't write a question right now." },
        { status: 503 },
      );
    }
    console.error("Interview question generation failed:", error);
    return NextResponse.json(
      { error: "Couldn't write a question right now." },
      { status: 500 },
    );
  }
}
