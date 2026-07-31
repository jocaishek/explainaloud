import Link from "next/link";
import { PageEnter } from "~/components/page-enter";
import { SessionPicker } from "~/components/session-picker";
import { conciseTeachingText } from "~/lib/ai/presentation";
import type { GeneratedCourse } from "~/lib/ai/schemas";
import {
  courseSectionId,
  findRelatedSectionIndex,
} from "~/lib/course-sections";
import { requireUser } from "~/lib/supabase/server";

type GapRow = {
  id: string;
  phrase: string;
  category: string;
  explanation: string | null;
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
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  /** `?session=` picks which recording to re-teach. Absent means the newest. */
  searchParams: Promise<{ session?: string }>;
}) {
  const { courseId } = await params;
  const { session: wanted } = await searchParams;
  const { supabase, user } = await requireUser();

  const { data: graded } = await supabase
    .from("course_sessions")
    .select("id, started_at, score, mode")
    .eq("course_id", courseId)
    .eq("user_id", user.id)
    .not("report", "is", null)
    .order("started_at", { ascending: false })
    .limit(30)
    .returns<
      Array<{
        id: string;
        started_at: string;
        score: number | null;
        mode: string | null;
      }>
    >();

  const [{ data: session }, { data: course }] = await Promise.all([
    (wanted
      ? supabase
          .from("course_sessions")
          .select("id, gaps ( id, phrase, category, explanation, resolved )")
          .eq("course_id", courseId)
          .eq("user_id", user.id)
          .eq("id", wanted)
      : supabase
          .from("course_sessions")
          .select("id, gaps ( id, phrase, category, explanation, resolved )")
          .eq("course_id", courseId)
          .eq("user_id", user.id)
          .not("report", "is", null)
          .order("started_at", { ascending: false })
          .limit(1)
    ).maybeSingle<{ id: string; gaps: GapRow[] }>(),
    supabase
      .from("courses")
      .select("generated")
      .eq("id", courseId)
      .eq("user_id", user.id)
      .maybeSingle<{ generated: GeneratedCourse | null }>(),
  ]);

  const gaps = session?.gaps ?? [];

  if (gaps.length === 0) {
    return (
      <PageEnter>
        <div className="flex flex-col gap-3">
          <p className="text-sm text-subtle">
            Nothing to re-teach yet. Explain the topic out loud and anything
            that doesn&apos;t hold together shows up here as its own mini
            lesson.
          </p>
          <Link
            href={`/dashboard/courses/${courseId}/record`}
            className="w-fit rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white transition-transform duration-200 ease-out hover:bg-brand/90 active:scale-[0.97]"
          >
            Start explaining
          </Link>
        </div>
      </PageEnter>
    );
  }

  const sections = course?.generated?.sections ?? [];

  return (
    <PageEnter>
      <div className="flex flex-col gap-6">
        {(graded?.length ?? 0) > 1 && session && (
          <SessionPicker
            sessions={graded ?? []}
            current={session.id}
            courseId={courseId}
            basePath="re-teach"
          />
        )}
        <p className="text-sm text-subtle">
          {gaps.length} thing{gaps.length === 1 ? "" : "s"} to go back over.
          Each one is just the piece you missed.
        </p>

        {gaps.map((gap) => {
          const sectionIndex = findRelatedSectionIndex(
            sections,
            `${gap.phrase} ${gap.explanation ?? ""}`,
          );
          const section = sectionIndex >= 0 ? sections[sectionIndex] : null;
          return (
            <article
              id={`gap-${gap.id}`}
              key={gap.id}
              tabIndex={-1}
              className="flex scroll-mt-24 flex-col gap-3 rounded-xl border border-border bg-surface p-4"
            >
              <p className="font-mono text-[10px] tracking-[0.14em] text-brand uppercase">
                {gap.category.replace(/_/g, " ")}
              </p>

              <p className="text-sm text-subtle">
                {gap.category === "missing_step"
                  ? "Missing concept: "
                  : "You said: "}
                &ldquo;{gap.phrase}&rdquo;
              </p>

              {gap.explanation && (
                <p className="max-w-2xl text-sm leading-6 text-foreground">
                  <span className="font-semibold text-strong">
                    Explanation:{" "}
                  </span>
                  {conciseTeachingText(gap.explanation)}
                </p>
              )}

              {section && (
                <Link
                  href={`/dashboard/courses/${courseId}#${courseSectionId(sectionIndex)}`}
                  className="w-fit rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-strong transition-colors hover:border-brand/40 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Review “{section.title}” in your course →
                </Link>
              )}
            </article>
          );
        })}

        <Link
          href={`/dashboard/courses/${courseId}/record`}
          className="w-fit rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white transition-transform duration-200 ease-out hover:bg-brand/90 active:scale-[0.97]"
        >
          Record another explanation
        </Link>
      </div>
    </PageEnter>
  );
}
