import { requireUser } from "~/lib/supabase/server";

export default async function GapReportPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const { supabase, user } = await requireUser();

  const { data: sessions } = await supabase
    .from("course_sessions")
    .select(
      "id, gaps ( id, phrase, category, explanation, resolved, created_at )",
    )
    .eq("course_id", courseId)
    .eq("user_id", user.id)
    .order("started_at", { ascending: false });

  const gaps = sessions?.flatMap((session) => session.gaps) ?? [];

  if (gaps.length === 0) {
    return (
      <p className="text-sm text-subtle">
        No flagged moments yet — this fills in the moment you explain the topic
        out loud and something doesn&apos;t hold together.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {gaps.map((gap) => (
        <div
          key={gap.id}
          className="rounded-lg border border-border bg-surface p-4"
        >
          <p className="text-xs font-medium text-brand capitalize">
            {gap.category}
          </p>
          <p className="mt-1 text-sm text-strong">&ldquo;{gap.phrase}&rdquo;</p>
          {gap.explanation && (
            <p className="mt-2 text-sm text-foreground">{gap.explanation}</p>
          )}
        </div>
      ))}
    </div>
  );
}
