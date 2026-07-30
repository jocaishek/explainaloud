import { isAdminEmail } from "~/lib/admin";
import type { GeneratedCourse } from "~/lib/ai/schemas";
import { localDay, usageToday } from "~/lib/limits";
import { PLAN_LIMITS, PLAN_RECORDING_MS } from "~/lib/plans";
import { requireProfile } from "~/lib/supabase/server";
import { type CourseQuestion, RecordConsole } from "./record-console";

export default async function RecordPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const { supabase, user, profile } = await requireProfile();

  const [{ data: sessions }, { data: course }, usage] = await Promise.all([
    supabase
      .from("course_sessions")
      .select(
        "id, transcript, started_at, ended_at, score, question_section, mode",
      )
      .eq("course_id", courseId)
      .eq("user_id", user.id)
      .order("started_at", { ascending: false }),
    supabase
      .from("courses")
      .select("generated")
      .eq("id", courseId)
      .eq("user_id", user.id)
      .maybeSingle<{ generated: GeneratedCourse | null }>(),
    // Server-rendered from the server's date; the console re-checks with the
    // browser's own day when the student actually presses record.
    usageToday(supabase, user.id, localDay()),
  ]);

  // One question per section, in course order. A section whose generation left
  // no quiz behind is skipped rather than shown as an empty prompt.
  const questions: CourseQuestion[] = (course?.generated?.sections ?? [])
    .map((section, index) => ({
      index,
      section: section.title,
      question: section.quiz?.trim() ?? "",
    }))
    .filter((item) => item.question.length > 0);

  // Open on something they have not answered yet, so a second visit is a new
  // question rather than the same one again. Everything answered — or nothing
  // recorded — and it opens on the first.
  const answered = new Set(
    (sessions ?? [])
      .map((session) => session.question_section)
      .filter((index): index is number => typeof index === "number"),
  );
  const firstUnanswered = questions.findIndex(
    (item) => !answered.has(item.index),
  );

  return (
    <RecordConsole
      courseId={courseId}
      initialSessions={sessions ?? []}
      questions={questions}
      initialQuestion={firstUnanswered === -1 ? 0 : firstUnanswered}
      courseReady={!!course?.generated}
      recordingsUsed={usage.recordings_started}
      // Pro has no daily cap, so it shares the admin's "don't count down"
      // treatment. The database enforces this independently — see
      // `claim_daily_quota`; this only decides what the counter says.
      unlimited={isAdminEmail(user.email) || profile.plan === "pro"}
      dailyLimit={PLAN_LIMITS[profile.plan].recording}
      maxRecordingMs={PLAN_RECORDING_MS[profile.plan]}
    />
  );
}
