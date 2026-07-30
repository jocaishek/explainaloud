import { NextResponse } from "next/server";
import {
  AiUnavailableError,
  NoSpeechDetectedError,
  transcribeAudio,
} from "~/lib/ai/provider";
import { MIN_SPEAKING_SECONDS, speechMetrics } from "~/lib/speech-metrics";
import { createClient } from "~/lib/supabase/server";

export const maxDuration = 60;

/**
 * A warm-up is 30 seconds. This is a generous ceiling for that, sized to reject
 * a mis-aimed file rather than to police the recorder.
 */
const MAX_AUDIO_BYTES = 5 * 1024 * 1024;

const SUPPORTED_AUDIO_TYPES = new Set([
  "audio/flac",
  "audio/mp4",
  "audio/mpeg",
  "audio/ogg",
  "audio/wav",
  "audio/webm",
  "video/webm",
]);

/**
 * Records a speaker's confident-speech baseline from the onboarding warm-up.
 *
 * Everything the caller sends is thrown away except the derived statistics —
 * the audio is never stored, and neither is the transcript. What survives is a
 * handful of numbers describing pace and hesitation, which is all that later
 * comparisons need.
 *
 * Deliberately forgiving about failure. A baseline is an optimisation, not a
 * prerequisite: onboarding must finish whether or not this route succeeds, so
 * every error path returns a shape the client can shrug off.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  }

  const audio = formData.get("audio");
  if (!(audio instanceof File) || audio.size === 0) {
    return NextResponse.json({ error: "No audio received." }, { status: 400 });
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

  let words: Awaited<ReturnType<typeof transcribeAudio>>["words"];
  let segments: Awaited<ReturnType<typeof transcribeAudio>>["segments"];
  try {
    ({ words, segments } = await transcribeAudio(audio));
  } catch (error) {
    if (error instanceof NoSpeechDetectedError) {
      return NextResponse.json(
        { error: "We couldn't hear anything. Check your mic and try again." },
        { status: 422 },
      );
    }
    if (error instanceof AiUnavailableError) {
      return NextResponse.json(
        { error: "Couldn't process that just now. You can skip this step." },
        { status: 503 },
      );
    }
    console.error("Speech baseline transcription failed:", error);
    return NextResponse.json(
      { error: "Couldn't process that recording." },
      { status: 503 },
    );
  }

  const metrics = speechMetrics(words, segments);
  if (!metrics) {
    return NextResponse.json(
      { error: "We couldn't hear enough to measure. Try again." },
      { status: 422 },
    );
  }

  // Short of the floor there are too few windows for a median to describe
  // anything, and a baseline built from noise is worse than none: every later
  // recording would be compared against a number that means nothing. Say so
  // rather than storing it.
  if (!metrics.reliable) {
    return NextResponse.json(
      {
        error: `We need about ${MIN_SPEAKING_SECONDS} seconds of talking. Give it another go, or skip.`,
        tooShort: true,
      },
      { status: 422 },
    );
  }

  const { error: writeError } = await supabase.from("speech_baselines").upsert(
    {
      user_id: user.id,
      source: "calibration",
      median_wpm: metrics.medianWpm,
      capable_wpm: metrics.capableWpm,
      pause_p90_ms: metrics.pauses.p90Ms,
      filler_per_100: metrics.fillerPer100,
      word_count: metrics.wordCount,
      speaking_seconds: metrics.speakingSeconds,
      sample_count: 1,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (writeError) {
    console.error("Failed to save speech baseline", {
      code: writeError.code,
      message: writeError.message,
    });
    return NextResponse.json(
      { error: "Couldn't save that. You can skip this step." },
      { status: 503 },
    );
  }

  // The client shows these back as confirmation that something real was
  // measured — a warm-up that reports nothing feels like a dead end.
  return NextResponse.json({
    saved: true,
    medianWpm: metrics.medianWpm,
    speakingSeconds: metrics.speakingSeconds,
    wordCount: metrics.wordCount,
  });
}
