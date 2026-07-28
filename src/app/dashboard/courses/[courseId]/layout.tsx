import { notFound } from "next/navigation";
import { requireUser } from "~/lib/supabase/server";
import { CourseNav } from "./course-nav";

export default async function CourseLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const { supabase, user } = await requireUser();

  const { data: course } = await supabase
    .from("courses")
    .select("id, topic")
    .eq("id", courseId)
    .eq("user_id", user.id)
    .single();

  if (!course) {
    notFound();
  }

  return (
    <div className="flex flex-col">
      <div className="px-6 pt-10">
        <h1 className="text-2xl font-semibold tracking-tight text-strong">
          {course.topic}
        </h1>
      </div>
      <CourseNav courseId={course.id} />
      <div className="mx-auto w-full max-w-2xl px-6 py-10">{children}</div>
    </div>
  );
}
