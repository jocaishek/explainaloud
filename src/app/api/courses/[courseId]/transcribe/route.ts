import { NextResponse } from "next/server";
import { transcribeAudio } from "~/lib/ai/provider";
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
    const transcript = await transcribeAudio(audio, course.topic);
    return NextResponse.json({ transcript });
  } catch (error) {
    console.error("Audio transcription failed:", error);
    return NextResponse.json(
      { error: "Couldn't transcribe that recording. Try again." },
      { status: 503 },
    );
  }
}
