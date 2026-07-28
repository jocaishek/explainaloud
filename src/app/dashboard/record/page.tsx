import { Mic } from "lucide-react";
import Link from "next/link";
import { Card } from "~/components/ui/card";
import { requireUser } from "~/lib/supabase/server";

export default async function RecordHubPage() {
  const { supabase, user } = await requireUser();

  const { data: courses } = await supabase
    .from("courses")
    .select("id, topic")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-16">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-strong">
          Record
        </h1>
        <p className="mt-2 text-foreground">
          Pick a topic to explain out loud.
        </p>
      </div>

      {!courses?.length ? (
        <p className="text-sm text-subtle">
          You don&apos;t have any topics yet.{" "}
          <Link
            href="/dashboard/new"
            className="font-medium text-strong underline underline-offset-2"
          >
            Start one
          </Link>{" "}
          first.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {courses.map((course) => (
            <Link
              key={course.id}
              href={`/dashboard/courses/${course.id}/record`}
            >
              <Card className="glass glass-lift flex flex-row items-center justify-between gap-4 rounded-2xl border-0 bg-transparent p-4">
                <span className="font-medium text-strong">{course.topic}</span>
                <Mic className="size-4 text-brand" />
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
