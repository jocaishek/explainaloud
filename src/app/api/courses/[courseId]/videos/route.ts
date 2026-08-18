import { NextResponse } from "next/server";
import { courseSchema } from "~/lib/ai/schemas";
import { createClient } from "~/lib/supabase/server";
import {
  discoverCourseResources,
  discoverCourseVideos,
} from "~/lib/video-search";

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
  const directResources = generated.resources.filter(
    (resource) => resource.url,
  );
  const resourceConcepts = generated.sections.flatMap(
    (section) => section.key_points,
  );
  if (generated.videos.length > 0 && directResources.length > 0 && !refresh) {
    return NextResponse.json({
      videos: generated.videos,
      resources: directResources,
      cached: true,
    });
  }

  const [videoDiscovery, resourceDiscovery] = await Promise.all([
    discoverCourseVideos(course.topic, generated.video_searches),
    discoverCourseResources(course.topic, resourceConcepts),
  ]);
  if (!videoDiscovery.searched && !resourceDiscovery.searched) {
    return NextResponse.json(
      { error: "Direct learning-link search is not configured." },
      { status: 503 },
    );
  }
  const videos =
    videoDiscovery.videos.length > 0 ? videoDiscovery.videos : generated.videos;
  const resources =
    resourceDiscovery.resources.length > 0
      ? resourceDiscovery.resources
      : generated.resources.length > 0
        ? generated.resources
        : resourceConcepts.slice(0, 4).map((label) => ({
            label,
            why: `A direct resource for studying ${course.topic}.`,
          }));
  /* Recorded whether or not anything was found, and saved either way.
   *
   * A search that ran and came back empty used to return 404 and write
   * nothing, so the course still said "no videos yet" and the screen still
   * offered the same button — the credit was spent and the only trace of it
   * was a toast that disappeared. Stamping the attempt is what lets the panel
   * say "searched, nothing usable" instead of pretending it never happened. */
  const now = new Date().toISOString();
  const searched_at = {
    ...generated.searched_at,
    ...(videoDiscovery.searched ? { videos: now } : {}),
    ...(resourceDiscovery.searched ? { resources: now } : {}),
  };

  const enriched = { ...generated, videos, resources, searched_at };
  const { error: saveError } = await supabase
    .from("courses")
    .update({ generated: enriched, updated_at: new Date().toISOString() })
    .eq("id", courseId)
    .eq("user_id", user.id);

  if (saveError) {
    return NextResponse.json(
      { error: "Found learning links but couldn't save them." },
      { status: 500 },
    );
  }

  return NextResponse.json({ videos, resources, searched_at, cached: false });
}
