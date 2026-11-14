import Link from "next/link";
import { PageEnter } from "~/components/page-enter";
import { SessionPicker } from "~/components/session-picker";
import { conciseTeachingText } from "~/lib/ai/presentation";
import type { GeneratedCourse } from "~/lib/ai/schemas";
import {
  courseSectionId,
  findRelatedSectionIndex,
} from "~/lib/course-sections";
import { courseIdForSlug } from "~/lib/courses";
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
  params: Promise<{ slug: string }>;
  /** `?session=` picks which recording to re-teach. Absent means the newest. */
  searchParams: Promise<{ session?: string }>;
}) {
  const { slug } = await params;
  const courseId = await courseIdForSlug(slug);
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
            href={`/home/${slug}/record`}
            className="w-fit rounded-control bg-accent-solid px-5 py-2 text-sm font-semibold text-accent-contrast transition-transform duration-200 ease-out hover:bg-accent-solid-hover active:scale-[0.97]"
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
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        {(graded?.length ?? 0) > 0 && session && (
          <SessionPicker
            sessions={graded ?? []}
            current={session.id}
            slug={slug}
            basePath="re-teach"
          />
        )}
        {/* Framed as distance to the whole topic, because a goal that looks
            close is worked at harder than one that looks far (Kivetz, Urminsky
            & Zheng, 2006) — and "two to go back over" is the same fact as
            "two points from having all of it". */}
        <div className="flex flex-col gap-1">
          <h2 className="font-display text-2xl text-strong">
            {gaps.length === 1
              ? "One point between you and the whole topic"
              : `${gaps.length} points between you and the whole topic`}
          </h2>
          <p className="text-sm text-subtle">
            Each one is just the piece you missed. Read it, then explain the
            topic again.
          </p>
        </div>

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
              className="flex scroll-mt-24 flex-col gap-3 rounded-card border border-border bg-surface p-4"
            >
              <p className="font-medium text-brand-ink text-xs first-letter:uppercase">
                {gap.category === "missing_step"
                  ? "Not said yet"
                  : gap.category.replace(/_/g, " ")}
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
                  href={`/home/${slug}#${courseSectionId(sectionIndex)}`}
                  className="w-fit rounded-control border border-border px-3 py-1.5 text-xs font-semibold text-strong transition-colors hover:border-brand/40 hover:text-brand-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Review “{section.title}” in your course →
                </Link>
              )}
            </article>
          );
        })}

        <div className="flex flex-col items-start gap-2 border-border border-t pt-6">
          <p className="text-sm text-subtle">
            Every point you explain on the next take comes off this list.
          </p>
          <Link
            href={`/home/${slug}/record`}
            className="w-fit rounded-control bg-accent-solid px-5 py-2 text-sm font-semibold text-accent-contrast transition-transform duration-200 ease-out hover:bg-accent-solid-hover active:scale-[0.97]"
          >
            Explain it again
          </Link>
        </div>
      </div>
    </PageEnter>
  );
}
