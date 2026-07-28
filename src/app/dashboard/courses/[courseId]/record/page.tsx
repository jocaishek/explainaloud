import { isAdminEmail } from "~/lib/admin";
import { localDay, usageToday } from "~/lib/limits";
import { PLAN_LIMITS, PLAN_RECORDING_MS } from "~/lib/plans";
import { requireProfile } from "~/lib/supabase/server";
import { RecordConsole } from "./record-console";

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
      .select("id, transcript, started_at, ended_at, score")
      .eq("course_id", courseId)
      .eq("user_id", user.id)
      .order("started_at", { ascending: false }),
    supabase
      .from("courses")
      .select("generated")
      .eq("id", courseId)
      .eq("user_id", user.id)
      .maybeSingle<{ generated: unknown }>(),
    // Server-rendered from the server's date; the console re-checks with the
    // browser's own day when the student actually presses record.
    usageToday(supabase, user.id, localDay()),
  ]);

  return (
    <RecordConsole
      courseId={courseId}
      initialSessions={sessions ?? []}
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
