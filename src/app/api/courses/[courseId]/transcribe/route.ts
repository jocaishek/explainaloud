import { NextResponse } from "next/server";
import { NoSpeechDetectedError, transcribeAudio } from "~/lib/ai/provider";
import { claimApiCall, RATE_LIMITED_MESSAGE } from "~/lib/rate-limit";
import { speechMetrics } from "~/lib/speech-metrics";
import { createClient } from "~/lib/supabase/server";

export const maxDuration = 120;

const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
const SUPPORTED_AUDIO_TYPES = new Set([
  "audio/flac",
  "audio/mp4",
  "audio/mpeg",
  "audio/ogg",
  "audio/wav",
  "audio/webm",
  "video/webm",
]);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  const { courseId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  // Before anything that costs money. Checked here rather than trusted from
  // the browser: the caption loop claims the plan's quota client-side, which
  // says nothing about a caller who simply never runs that code.
  if (!(await claimApiCall(supabase, "transcribe"))) {
    return NextResponse.json({ error: RATE_LIMITED_MESSAGE }, { status: 429 });
  }

  const { data: course } = await supabase
    .from("courses")
    .select("topic")
    .eq("id", courseId)
    .eq("user_id", user.id)
    .maybeSingle<{ topic: string }>();

  if (!course) {
    return NextResponse.json({ error: "Topic not found." }, { status: 404 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Invalid audio upload." },
      { status: 400 },
    );
  }

  const audio = formData.get("audio");
  if (!(audio instanceof File) || audio.size === 0) {
    return NextResponse.json(
      { error: "No audio was captured." },
      { status: 400 },
    );
  }
  if (audio.size > MAX_AUDIO_BYTES) {
    return NextResponse.json(
      { error: "That recording is too large." },
      { status: 413 },
    );
  }

  const baseType = audio.type.split(";")[0] ?? "";
  if (baseType && !SUPPORTED_AUDIO_TYPES.has(baseType)) {
    return NextResponse.json(
      { error: "That audio format isn't supported." },
      { status: 415 },
    );
  }

  try {
    const { transcript, words } = await transcribeAudio(audio, course.topic);
    // Metrics ride along with the transcript rather than in a second request:
    // the word timings only exist here, and re-deriving them would mean paying
    // for the same transcription twice.
    return NextResponse.json({ transcript, metrics: speechMetrics(words) });
  } catch (error) {
    if (error instanceof NoSpeechDetectedError) {
      return NextResponse.json(
        { error: "No speech was detected. Try recording again." },
        { status: 422 },
      );
    }
    console.error("Audio transcription failed:", error);
    return NextResponse.json(
      { error: "Couldn't transcribe that recording. Try again." },
      { status: 503 },
    );
  }
}
