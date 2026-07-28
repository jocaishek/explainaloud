import Link from "next/link";
import { localDay, usageToday } from "~/lib/limits";
import { requireUser } from "~/lib/supabase/server";
import { RecordConsole } from "../record/record-console";

type GapRow = { id: string; phrase: string; category: string };

/**
 * Re-Explain: the second attempt, scoped to what was flagged.
 *
 * It reuses the recording console rather than reimplementing it — same live
 * green/red grading, same five-minute cap, same daily quota. The difference
 * is the framing above it: the student is told exactly which pieces to cover,
 * and the previous attempt's score is shown so improvement is visible.
 */
export default async function ReExplainPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const { supabase, user } = await requireUser();

  const [{ data: sessions }, { data: course }, usage] = await Promise.all([
    supabase
      .from("course_sessions")
      .select(
        "id, transcript, started_at, ended_at, score, gaps ( id, phrase, category )",
      )
      .eq("course_id", courseId)
      .eq("user_id", user.id)
      .order("started_at", { ascending: false }),
    supabase
      .from("courses")
      .select("generated")
      .eq("id", courseId)
      .eq("user_id", user.id)
      .maybeSingle<{ generated: unknown }>(),
    usageToday(supabase, user.id, localDay()),
  ]);

  const all = sessions ?? [];
  const gaps: GapRow[] = all.flatMap(
    (s) => (s.gaps ?? []) as unknown as GapRow[],
  );
  const lastScored = all.find((s) => s.score !== null);

  if (gaps.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-subtle">
          Nothing flagged yet, so there&apos;s nothing to re-explain. Do a first
          run and this turns into a focused second attempt.
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

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="font-mono text-[11px] tracking-[0.18em] text-brand uppercase">
            Cover these this time
          </h2>
          {lastScored?.score !== null && lastScored?.score !== undefined && (
            <span className="font-mono text-sm text-subtle tabular-nums">
              last run {lastScored.score}
            </span>
          )}
        </div>

        <ul className="flex flex-col gap-2">
          {gaps.map((gap) => (
            <li key={gap.id} className="flex gap-3 text-sm text-foreground">
              <span
                aria-hidden
                className="mt-1.5 size-1.5 shrink-0 rounded-full bg-red-500"
              />
              <span>
                <span className="text-subtle">
                  {gap.category.replace(/_/g, " ")} —{" "}
                </span>
                &ldquo;{gap.phrase}&rdquo;
              </span>
            </li>
          ))}
        </ul>

        <Link
          href={`/dashboard/courses/${courseId}/re-teach`}
          className="w-fit font-mono text-[10px] tracking-[0.14em] text-subtle uppercase hover:text-strong"
        >
          Read the mini lessons first →
        </Link>
      </section>

      <RecordConsole
        courseId={courseId}
        initialSessions={all.map((s) => ({
          id: s.id,
          transcript: s.transcript,
          started_at: s.started_at,
          ended_at: s.ended_at,
          score: s.score,
        }))}
        courseReady={!!course?.generated}
        recordingsUsed={usage.recordings_started}
      />
    </div>
  );
}
