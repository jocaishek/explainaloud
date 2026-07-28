import { NextResponse } from "next/server";
import { courseGenerationPrompt } from "~/lib/ai/prompts";
import { AiUnavailableError, completeJson } from "~/lib/ai/provider";
import { courseSchema } from "~/lib/ai/schemas";
import { renderSources, type SourceRow } from "~/lib/ai/sources";
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

  // Sources are optional. With them, the model is locked to them; without,
  // it teaches from its own knowledge and the course is marked ungrounded so
  // the UI can say where the material came from.
  const grounded = (sources?.length ?? 0) > 0;
  const prompt = `${courseGenerationPrompt(course.topic, course.input_notes, grounded)}

${renderSources(sources ?? [])}`;

  try {
    const { data, provider } = await completeJson(prompt, (value) =>
      courseSchema.parse(value),
    );

    const { error: saveError } = await supabase
      .from("courses")
      .update({
        generated: data,
        generated_at: new Date().toISOString(),
        generated_by: provider,
        grounded,
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

    return NextResponse.json({ course: data, provider, grounded });
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
