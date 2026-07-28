import Link from "next/link";
import { notFound } from "next/navigation";
import { NotWiredYet } from "~/components/not-wired-yet";
import { Button } from "~/components/ui/button";
import { requireUser } from "~/lib/supabase/server";

export default async function CoursePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const { supabase, user } = await requireUser();

  const { data: course } = await supabase
    .from("courses")
    .select("topic, input_notes, status")
    .eq("id", courseId)
    .eq("user_id", user.id)
    .single();

  if (!course) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-8">
      {course.input_notes && (
        <div>
          <h2 className="text-sm font-medium text-subtle">Your notes</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">
            {course.input_notes}
          </p>
        </div>
      )}

      <div>
        <h2 className="text-sm font-medium text-subtle">
          Sub-concepts and sources
        </h2>
        <div className="mt-2">
          <NotWiredYet
            title="Course generation isn't wired up yet"
            description="This is where the sub-concepts and real sources TeachItBack pulls this topic from will show up, grounded and citable, not generic AI text."
          />
        </div>
      </div>

      <Button
        asChild
        className="w-fit bg-brand font-semibold text-white shadow-[0_0_30px_-8px_var(--color-brand)] transition-transform hover:bg-brand/90 active:scale-[0.98]"
      >
        <Link href={`/dashboard/courses/${courseId}/record`}>
          Start recording
        </Link>
      </Button>
    </div>
  );
}
