import { NextResponse } from "next/server";
import { courseSchema } from "~/lib/ai/schemas";
import { createClient } from "~/lib/supabase/server";
import { discoverCourseVideos } from "~/lib/video-search";

export const maxDuration = 30;

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
    .select("topic, generated")
    .eq("id", courseId)
    .eq("user_id", user.id)
    .maybeSingle<{ topic: string; generated: unknown }>();

  const parsed = course?.generated
    ? courseSchema.safeParse(course.generated)
    : null;
  if (!course || !parsed?.success) {
    return NextResponse.json(
      { error: "Build the course first." },
      { status: 422 },
    );
  }
  const generated = parsed.data;
  const refresh = new URL(request.url).searchParams.get("refresh") === "1";
  if (generated.videos.length > 0 && !refresh) {
    return NextResponse.json({ videos: generated.videos, cached: true });
  }

  const discovery = await discoverCourseVideos(
    course.topic,
    generated.video_searches,
  );
  if (!discovery.searched) {
    return NextResponse.json(
      { error: "Direct video search is not configured." },
      { status: 503 },
    );
  }
  if (discovery.videos.length === 0) {
    return NextResponse.json(
      { error: "No reliable direct videos were found." },
      { status: 404 },
    );
  }

  const enriched = { ...generated, videos: discovery.videos };
  const { error: saveError } = await supabase
    .from("courses")
    .update({ generated: enriched, updated_at: new Date().toISOString() })
    .eq("id", courseId)
    .eq("user_id", user.id);

  if (saveError) {
    return NextResponse.json(
      { error: "Found videos but couldn't save them." },
      { status: 500 },
    );
  }

  return NextResponse.json({ videos: discovery.videos, cached: false });
}
