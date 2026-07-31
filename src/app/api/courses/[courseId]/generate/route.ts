import { NextResponse } from "next/server";
import { CourseCitationError, orchestrateCourse } from "~/lib/ai/orchestrator";
import { AiUnavailableError } from "~/lib/ai/provider";
import { BANK_TARGET, fillQuestionBank } from "~/lib/ai/question-bank";
import type { SourceRow } from "~/lib/ai/sources";
import { claimApiCall, RATE_LIMITED_MESSAGE } from "~/lib/rate-limit";
import { createClient } from "~/lib/supabase/server";

export const maxDuration = 120;

export async function POST(
  _request: Request,
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

  // Generation is the most expensive call in the app and the rarest in normal
  // use, which is why its ceiling is the tightest of the three.
  if (!(await claimApiCall(supabase, "generate"))) {
    return NextResponse.json({ error: RATE_LIMITED_MESSAGE }, { status: 429 });
  }

  // RLS would scope this anyway; the explicit filter turns a wrong id into a
  // clean 404 instead of an empty result further down.
  const { data: course } = await supabase
    .from("courses")
    .select("id, topic, input_notes")
    .eq("id", courseId)
    .eq("user_id", user.id)
    .maybeSingle<{ id: string; topic: string; input_notes: string | null }>();

  if (!course) {
    return NextResponse.json({ error: "Topic not found." }, { status: 404 });
  }

  const { data: sources } = await supabase
    .from("course_sources")
    .select("filename, content")
    .eq("course_id", courseId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .returns<SourceRow[]>();

  try {
    const result = await orchestrateCourse({
      topic: course.topic,
      notes: course.input_notes,
      sources: sources ?? [],
    });

    const { error: saveError } = await supabase
      .from("courses")
      .update({
        generated: result.course,
        generated_at: new Date().toISOString(),
        generated_by: result.primaryProvider,
        grounded: result.grounded,
        status: "ready",
        updated_at: new Date().toISOString(),
      })
      .eq("id", courseId)
      .eq("user_id", user.id);

    // Not checking this meant a failed write still returned 200 with a course
    // body: the student saw their course, and every later step that reads it
    // back from the database found nothing.
    if (saveError) {
      return NextResponse.json(
        { error: "Built the course but couldn't save it. Try again." },
        { status: 500 },
      );
    }

    // Fill the interview question bank now rather than on the first click.
    // Awaited, not fired and forgotten: a serverless function that returns
    // stops executing, so a floating promise here would be cancelled halfway
    // through and leave a half-written bank. Generation already takes tens of
    // seconds, so one more model call is not what makes it slow — and it is
    // what makes picking interview mode instant later.
    try {
      await fillQuestionBank({
        supabase,
        courseId,
        userId: user.id,
        topic: course.topic,
        sections: result.course.sections,
        count: BANK_TARGET,
      });
    } catch {
      // A course without a bank still works: the first interview fills it.
    }

    return NextResponse.json({
      course: result.course,
      provider: result.primaryProvider,
      grounded: result.grounded,
      review: result.review,
      orchestration: result.course.orchestration,
    });
  } catch (error) {
    console.error("Course generation failed:", error);
    // The provider breakdown names vendors and leaks failure detail, so it
    // never goes to a student — but an operator staring at "try again shortly"
    // has nothing to act on. Admins get the real reason inline instead of
    // having to dig through hosting logs.
    const { data: isAdmin } = await supabase.rpc("is_explainaloud_admin");
    const detail =
      isAdmin === true
        ? error instanceof Error
          ? error.message
          : String(error)
        : undefined;

    if (error instanceof AiUnavailableError) {
      return NextResponse.json(
        {
          error: "This service can't be used at the moment. Try again shortly.",
          detail,
        },
        { status: 503 },
      );
    }
    if (error instanceof CourseCitationError) {
      return NextResponse.json(
        {
          error:
            "Explainaloud couldn't verify every citation against your sources. Try rebuilding the course.",
          detail,
        },
        { status: 422 },
      );
    }
    return NextResponse.json(
      {
        error: "This service can't be used at the moment. Try again shortly.",
        detail,
      },
      { status: 500 },
    );
  }
}
