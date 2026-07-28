import { notFound } from "next/navigation";
import type { SourceItem } from "~/components/source-uploader";
import type { GeneratedCourse } from "~/lib/ai/schemas";
import { requireUser } from "~/lib/supabase/server";
import { CourseBuilder } from "./course-builder";

export default async function CoursePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const { supabase, user } = await requireUser();

  const [{ data: course }, { data: sources }] = await Promise.all([
    supabase
      .from("courses")
      .select("topic, input_notes, status, generated, generated_by")
      .eq("id", courseId)
      .eq("user_id", user.id)
      .maybeSingle<{
        topic: string;
        input_notes: string | null;
        status: string;
        generated: GeneratedCourse | null;
        generated_by: string | null;
      }>(),
    supabase
      .from("course_sources")
      .select("id, filename, byte_size")
      .eq("course_id", courseId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .returns<SourceItem[]>(),
  ]);

  if (!course) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-8">
      {course.input_notes && (
        <div>
          <h2 className="font-mono text-[11px] tracking-[0.18em] text-brand uppercase">
            Your notes
          </h2>
          <p className="mt-2 text-sm whitespace-pre-wrap text-foreground">
            {course.input_notes}
          </p>
        </div>
      )}

      <CourseBuilder
        courseId={courseId}
        topic={course.topic}
        initialSources={sources ?? []}
        initialCourse={course.generated}
        generatedBy={course.generated_by}
      />
    </div>
  );
}
