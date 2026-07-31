import { notFound } from "next/navigation";
import type { SourceItem } from "~/components/source-uploader";
import { isAdminEmail } from "~/lib/admin";
import { courseSchema } from "~/lib/ai/schemas";
import { courseIdForSlug } from "~/lib/courses";
import { requireUser } from "~/lib/supabase/server";
import { CourseBuilder } from "./course-builder";

export default async function CoursePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const courseId = await courseIdForSlug(slug);
  const { supabase, user } = await requireUser();

  const [{ data: course }, { data: sources }] = await Promise.all([
    supabase
      .from("courses")
      .select("input_notes, status, generated, sources_only")
      .eq("id", courseId)
      .eq("user_id", user.id)
      .maybeSingle<{
        input_notes: string | null;
        status: string;
        generated: unknown;
        sources_only: boolean;
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
  const parsedCourse = course.generated
    ? courseSchema.safeParse(course.generated)
    : null;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
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
        slug={slug}
        initialSources={sources ?? []}
        initialCourse={parsedCourse?.success ? parsedCourse.data : null}
        initialSourcesOnly={course.sources_only === true}
        unlimited={isAdminEmail(user.email)}
      />
    </div>
  );
}
