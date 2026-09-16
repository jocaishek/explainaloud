import { NextResponse } from "next/server";
import { extractText } from "~/lib/ai/sources";
import { claimApiCall, RATE_LIMITED_MESSAGE } from "~/lib/rate-limit";
import { declaredLengthWithin } from "~/lib/request-size";
import { createClient } from "~/lib/supabase/server";
import {
  FREE_SOURCES_PER_COURSE,
  MAX_SOURCE_BYTES,
  sourceLimitFor,
} from "~/lib/uploads";

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

  // A 5 MB PDF parse is the most CPU a single request here can
  // ask for, and this function is billed by active CPU.
  if (!(await claimApiCall(supabase, "upload"))) {
    return NextResponse.json({ error: RATE_LIMITED_MESSAGE }, { status: 429 });
  }

  const { data: course } = await supabase
    .from("courses")
    .select("id")
    .eq("id", courseId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!course) {
    return NextResponse.json({ error: "Topic not found." }, { status: 404 });
  }

  const { count } = await supabase
    .from("course_sources")
    .select("id", { count: "exact", head: true })
    .eq("course_id", courseId)
    .eq("user_id", user.id);

  // Admins are exempt. The check is here rather than only in the picker because
  // the client limit is a courtesy — this is the one that actually holds.
  const { data: isAdmin } = await supabase.rpc("is_explainaloud_admin");
  const limit = sourceLimitFor(isAdmin === true);

  if ((count ?? 0) >= limit) {
    return NextResponse.json(
      {
        error: `A topic can hold ${FREE_SOURCES_PER_COURSE} sources. Delete one to add another.`,
      },
      { status: 422 },
    );
  }

  /* Declined before the bytes are read, where that is possible.
   *
   * The `file.size` check below is the real ceiling and stays, but it runs
   * after `formData()` has buffered the whole upload — so without this, a
   * request twenty times over the limit is paid for in full and then refused.
   * See `declaredLengthWithin`: the header is a courtesy, not a guarantee, and
   * both checks are kept for that reason. */
  const declared = declaredLengthWithin(request, MAX_SOURCE_BYTES);
  if (!declared.ok) {
    return NextResponse.json(
      { error: "That file is over the 5 MB limit." },
      { status: 413 },
    );
  }

  const form = await request.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file received." }, { status: 400 });
  }
  if (file.size > MAX_SOURCE_BYTES) {
    return NextResponse.json(
      { error: "That file is over the 5 MB limit." },
      { status: 413 },
    );
  }

  const extracted = await extractText(file);
  if (!extracted.ok) {
    return NextResponse.json({ error: extracted.reason }, { status: 415 });
  }

  const { data, error } = await supabase
    .from("course_sources")
    .insert({
      course_id: courseId,
      user_id: user.id,
      filename: file.name,
      mime_type: file.type || "text/plain",
      byte_size: file.size,
      content: extracted.text,
    })
    .select("id, filename, byte_size, created_at")
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Couldn't save that source." },
      { status: 500 },
    );
  }

  return NextResponse.json({ source: data });
}

export async function DELETE(
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

  const sourceId = new URL(request.url).searchParams.get("id");
  if (!sourceId) {
    return NextResponse.json({ error: "Missing id." }, { status: 400 });
  }

  const { error } = await supabase
    .from("course_sources")
    .delete()
    .eq("id", sourceId)
    .eq("course_id", courseId)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: "Couldn't remove it." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

/** Returns the extracted text of one source, for the preview panel. */
export async function GET(
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

  const sourceId = new URL(request.url).searchParams.get("id");
  if (!sourceId) {
    return NextResponse.json({ error: "Missing id." }, { status: 400 });
  }

  const { data } = await supabase
    .from("course_sources")
    .select("filename, content")
    .eq("id", sourceId)
    .eq("course_id", courseId)
    .eq("user_id", user.id)
    .maybeSingle<{ filename: string; content: string }>();

  if (!data) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  // Preview only — the full document can be enormous, and the point here is
  // "did the right text come out of my file", which the opening is enough for.
  return NextResponse.json({
    filename: data.filename,
    preview: data.content.slice(0, 4000),
    truncated: data.content.length > 4000,
    characters: data.content.length,
  });
}
