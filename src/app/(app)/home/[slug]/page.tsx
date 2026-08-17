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

  /* The notes are no longer rendered here.
   *
   * They used to open the page, above the sources and the build button and the
   * course — so the first thing on a topic you had already built was a verbatim
   * copy of what you typed to build it. They now sit at the foot of
   * `CourseBuilder`, with the files, under the course they produced. */
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      <CourseBuilder
        courseId={courseId}
        slug={slug}
        inputNotes={course.input_notes}
        initialSources={sources ?? []}
        initialCourse={parsedCourse?.success ? parsedCourse.data : null}
        initialSourcesOnly={course.sources_only === true}
        unlimited={isAdminEmail(user.email)}
      />
    </div>
  );
}
