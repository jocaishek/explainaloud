import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { courseTitle } from "~/lib/folders";
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
    .select("id, topic, name")
    .eq("id", courseId)
    .eq("user_id", user.id)
    .maybeSingle<{ id: string; topic: string; name: string | null }>();

  if (!course) {
    notFound();
  }

  const title = courseTitle(course);

  return (
    <div className="flex flex-col">
      <div className="px-6 pt-8">
        <Link
          href="/dashboard"
          className="group -ml-1 inline-flex items-center gap-1.5 rounded-md px-1 py-1 text-sm text-subtle transition-colors hover:text-strong"
        >
          <ArrowLeft className="size-4 transition-transform duration-200 ease-out group-hover:-translate-x-0.5" />
          All topics
        </Link>

        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-strong">
          {title}
        </h1>
        {/* The renamed title can drift a long way from what the course was
            actually built from, so keep the original in view. */}
        {course.name?.trim() && course.name.trim() !== course.topic && (
          <p className="mt-1 text-sm text-subtle">Topic: {course.topic}</p>
        )}
      </div>
      <CourseNav courseId={course.id} />
      <div className="mx-auto w-full max-w-2xl px-6 py-10">{children}</div>
    </div>
  );
}
