import { NextResponse } from "next/server";
import { z } from "zod";
import { interviewQuestionPrompt } from "~/lib/ai/prompts";
import { AiUnavailableError, completeJson } from "~/lib/ai/provider";
import { drawFromBank } from "~/lib/ai/question-bank";
import type { GeneratedCourse } from "~/lib/ai/schemas";
import { claimApiCall, RATE_LIMITED_MESSAGE } from "~/lib/rate-limit";
import { createClient } from "~/lib/supabase/server";

export const maxDuration = 60;

/** Enough to make the next question specific; short enough not to cost. */
const MAX_WEAKNESS_CHARS = 600;

const requestSchema = z.object({
  /** How many to draw. Three to open an interview, one for a follow-up. */
  count: z.number().int().min(1).max(3).default(1),
  /**
   * What the last answer got wrong or never reached.
   *
   * This is what turns a question list into an examiner: given it, the next
   * question goes at the thing the student has just demonstrated they do not
   * have. Absent for the opening draw, which has nothing to go on.
   */
  weakness: z.string().max(MAX_WEAKNESS_CHARS).optional(),
  /** Bank ids already drawn this run, so one interview cannot repeat itself. */
  exclude: z.array(z.uuid()).max(12).default([]),
  /** Question text already asked this run — the follow-up's do-not-repeat list. */
  asked: z.array(z.string().max(400)).max(12).default([]),
});

const followUpSchema = z.object({
  questions: z
    .array(
      z.object({
        question: z.string().min(8),
        section_index: z.number().int().nonnegative().default(0),
        key_points: z.array(z.string().min(1)).default([]),
      }),
    )
    .min(1),
});

/**
 * The questions for an interview.
 *
 * Two different jobs behind one route, and `weakness` is the difference.
 *
 * Without it, this is a draw from the topic's stored bank: no model call on the
 * critical path of a click, and never a question this student has already been
 * asked while an unasked one exists. With it, the question is written fresh —
 * the whole point of a follow-up is that it could not have been written before
 * the last answer existed.
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

  try {
    if (!parsed.data.weakness) {
      const drawn = await drawFromBank({
        supabase,
        courseId,
        userId: user.id,
        topic: course.topic,
        sections,
        count: parsed.data.count,
        exclude: parsed.data.exclude,
      });

      if (drawn.length === 0) {
        // Nothing banked and nothing writable. The console falls back to the
        // course's own section questions, so this is a degradation rather than
        // a dead end.
        return NextResponse.json(
          { error: "Couldn't draw a question right now." },
          { status: 503 },
        );
      }

      return NextResponse.json({ questions: drawn });
    }

    // A follow-up. Written now, against the answer that just happened, and
    // never banked: it is about one moment in one interview and would mean
    // nothing drawn cold three weeks later.
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

    const result = await completeJson(
      interviewQuestionPrompt({
        topic: course.topic,
        sections: sections.map((section) => ({
          title: section.title,
          technical: section.technical,
          keyPoints: section.key_points,
        })),
        asked: [...new Set([...parsed.data.asked, ...askedBefore])].slice(
          0,
          12,
        ),
        weakness: parsed.data.weakness,
        count: parsed.data.count,
      }),
      (value) => followUpSchema.parse(value),
      { fast: true, maxOutputTokens: 700 },
    );

    return NextResponse.json({
      questions: result.data.questions.slice(0, parsed.data.count).map((q) => {
        const index = Math.min(q.section_index, sections.length - 1);
        return {
          question: q.question,
          section_index: index,
          section: sections[index]?.title ?? "",
          // What a complete answer to THIS question contains. Grading reads
          // these rather than the section's own key points: the examiner asks
          // something narrow, and marking it against everything the section
          // covers is what scored a decent answer zero for coverage.
          key_points:
            q.key_points.length > 0
              ? q.key_points
              : (sections[index]?.key_points ?? []),
        };
      }),
    });
  } catch (error) {
    if (error instanceof AiUnavailableError) {
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
