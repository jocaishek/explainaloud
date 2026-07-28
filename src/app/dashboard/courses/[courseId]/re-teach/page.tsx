import Link from "next/link";
import type { GeneratedCourse } from "~/lib/ai/schemas";
import { requireUser } from "~/lib/supabase/server";

type GapRow = {
  id: string;
  phrase: string;
  category: string;
  explanation: string | null;
  quiz: string | null;
  resolved: boolean;
};

/**
 * Re-Teach: the focused mini-lesson for each thing that was actually flagged.
 *
 * Unlike the course page, this shows only the material tied to a gap, so a
 * student who missed one step isn't re-reading the whole topic to find it.
 */
export default async function ReTeachPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const { supabase, user } = await requireUser();

  const [{ data: sessions }, { data: course }] = await Promise.all([
    supabase
      .from("course_sessions")
      .select("id, gaps ( id, phrase, category, explanation, quiz, resolved )")
      .eq("course_id", courseId)
      .eq("user_id", user.id)
      .order("started_at", { ascending: false }),
    supabase
      .from("courses")
      .select("generated")
      .eq("id", courseId)
      .eq("user_id", user.id)
      .maybeSingle<{ generated: GeneratedCourse | null }>(),
  ]);

  const gaps: GapRow[] =
    sessions?.flatMap((s) => (s.gaps ?? []) as unknown as GapRow[]) ?? [];

  if (gaps.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-subtle">
          Nothing to re-teach yet. Explain the topic out loud and anything that
          doesn&apos;t hold together shows up here as its own mini lesson.
        </p>
        <Link
          href={`/dashboard/courses/${courseId}/record`}
          className="w-fit rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white transition-transform duration-200 ease-out hover:bg-brand/90 active:scale-[0.97]"
        >
          Start explaining
        </Link>
      </div>
    );
  }

  // Match a gap to the course section that covers it, so the mini lesson can
  // put the original teaching next to the correction.
  const sections = course?.generated?.sections ?? [];
  function relatedSection(phrase: string) {
    const words = phrase
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length > 4);
    return sections.find((section) =>
      section.key_points.some((point) =>
        words.some((word) => point.toLowerCase().includes(word)),
      ),
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-subtle">
        {gaps.length} thing{gaps.length === 1 ? "" : "s"} to go back over. Each
        one is just the piece you missed.
      </p>

      {gaps.map((gap) => {
        const section = relatedSection(gap.phrase);
        return (
          <article
            key={gap.id}
            className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4"
          >
            <p className="font-mono text-[10px] tracking-[0.14em] text-brand uppercase">
              {gap.category.replace(/_/g, " ")}
            </p>

            <p className="text-sm text-subtle">
              You said: &ldquo;{gap.phrase}&rdquo;
            </p>

            {gap.explanation && (
              <p className="text-sm whitespace-pre-wrap text-foreground">
                {gap.explanation}
              </p>
            )}

            {section && (
              <div className="rounded-lg border border-border bg-background p-3">
                <p className="font-mono text-[10px] tracking-[0.14em] text-subtle uppercase">
                  From your course · {section.title}
                </p>
                <p className="mt-2 text-sm text-foreground">
                  {section.intuition}
                </p>
                <p className="mt-2 text-sm text-subtle">{section.analogy}</p>
              </div>
            )}

            {gap.quiz && (
              <p className="rounded-lg border border-brand/20 bg-brand/[0.06] px-3 py-2 text-sm font-medium text-strong">
                {gap.quiz}
              </p>
            )}
          </article>
        );
      })}

      <Link
        href={`/dashboard/courses/${courseId}/re-explain`}
        className="w-fit rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white transition-transform duration-200 ease-out hover:bg-brand/90 active:scale-[0.97]"
      >
        Try explaining it again
      </Link>
    </div>
  );
}
