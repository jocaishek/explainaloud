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

  if (!sources?.length) {
    return NextResponse.json(
      {
        error:
          "Upload at least one source first — the course is built only from your material.",
      },
      { status: 422 },
    );
  }

  const prompt = `${courseGenerationPrompt(course.topic, course.input_notes)}

${renderSources(sources)}`;

  try {
    const { data, provider } = await completeJson(prompt, (value) =>
      courseSchema.parse(value),
    );

    await supabase
      .from("courses")
      .update({
        generated: data,
        generated_at: new Date().toISOString(),
        generated_by: provider,
        status: "ready",
        updated_at: new Date().toISOString(),
      })
      .eq("id", courseId)
      .eq("user_id", user.id);

    return NextResponse.json({ course: data, provider });
  } catch (error) {
    if (error instanceof AiUnavailableError) {
      return NextResponse.json(
        { error: "Both AI providers failed.", detail: error.message },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: "Course generation failed." },
      { status: 500 },
    );
  }
}
