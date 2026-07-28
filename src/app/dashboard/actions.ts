"use server";

import { revalidatePath } from "next/cache";
import { folderNameError, isFolderColor, topicNameError } from "~/lib/folders";
import { looksLikeHomework } from "~/lib/homework";
import { claimQuota, localDay } from "~/lib/limits";
import { requireUser } from "~/lib/supabase/server";
import { isTopicTooBroad } from "~/lib/topic-scope";

export type CreateCourseResult =
  | { ok: true; courseId: string }
  | {
      ok: false;
      error:
        | "missing_topic"
        | "topic_too_broad"
        | "topic_is_homework"
        | "topic_limit"
        | "create_failed";
    };

export async function createCourse(
  formData: FormData,
): Promise<CreateCourseResult> {
  const { supabase, user } = await requireUser();
  const topic = String(formData.get("topic") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const folderId = String(formData.get("folderId") ?? "").trim();
  // The browser sends its own calendar date so the cap resets at the
  // student's midnight, not the server's.
  const day = String(formData.get("day") ?? "") || localDay();

  if (!topic) {
    return { ok: false, error: "missing_topic" };
  }

  if (isTopicTooBroad(topic)) {
    return { ok: false, error: "topic_too_broad" };
  }

  // Checked against the notes too: the topic can read innocently while the
  // pasted notes are the actual problem set.
  if (looksLikeHomework(topic) || looksLikeHomework(notes)) {
    return { ok: false, error: "topic_is_homework" };
  }

  const quota = await claimQuota(supabase, "topic", day);
  if (!quota.ok) {
    return { ok: false, error: "topic_limit" };
  }

  const { data, error } = await supabase
    .from("courses")
    .insert({
      user_id: user.id,
      topic,
      input_notes: notes || null,
      folder_id: folderId || null,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, error: "create_failed" };
  }

  revalidatePath("/dashboard");
  return { ok: true, courseId: data.id };
}

export type MutationState = { error: string | null };

const OK: MutationState = { error: null };

export async function createFolder(
  _prev: MutationState,
  formData: FormData,
): Promise<MutationState> {
  const { supabase, user } = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const color = String(formData.get("color") ?? "default");

  const problem = folderNameError(name);
  if (problem) return { error: problem };
  if (!isFolderColor(color)) return { error: "Pick a colour." };

  const { error } = await supabase
    .from("folders")
    .insert({ user_id: user.id, name, color });

  if (error) return { error: "We couldn't create that folder. Try again." };

  revalidatePath("/dashboard");
  return OK;
}

export async function renameFolder(
  _prev: MutationState,
  formData: FormData,
): Promise<MutationState> {
  const { supabase, user } = await requireUser();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const color = String(formData.get("color") ?? "default");

  const problem = folderNameError(name);
  if (problem) return { error: problem };
  if (!isFolderColor(color)) return { error: "Pick a colour." };

  // RLS already scopes this to the owner; the explicit user_id filter means a
  // mismatched id fails as "no rows" rather than silently succeeding.
  const { error } = await supabase
    .from("folders")
    .update({ name, color, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: "We couldn't save that. Try again." };

  revalidatePath("/dashboard");
  return OK;
}

export async function deleteFolder(
  _prev: MutationState,
  formData: FormData,
): Promise<MutationState> {
  const { supabase, user } = await requireUser();
  const id = String(formData.get("id") ?? "");

  // `on delete set null` on courses.folder_id — deleting a folder releases its
  // topics back to Loose topics rather than destroying them.
  const { error } = await supabase
    .from("folders")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: "We couldn't delete that folder. Try again." };

  revalidatePath("/dashboard");
  return OK;
}

export async function renameCourse(
  _prev: MutationState,
  formData: FormData,
): Promise<MutationState> {
  const { supabase, user } = await requireUser();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();

  const problem = topicNameError(name);
  if (problem) return { error: problem };

  const { error } = await supabase
    .from("courses")
    .update({ name, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: "We couldn't save that. Try again." };

  revalidatePath("/dashboard");
  return OK;
}

/** Moves a topic into a folder, or out of one when folderId is empty. */
export async function moveCourse(
  _prev: MutationState,
  formData: FormData,
): Promise<MutationState> {
  const { supabase, user } = await requireUser();
  const id = String(formData.get("id") ?? "");
  const folderId = String(formData.get("folderId") ?? "").trim();

  const { error } = await supabase
    .from("courses")
    .update({
      folder_id: folderId || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: "We couldn't move that topic. Try again." };

  revalidatePath("/dashboard");
  return OK;
}

/**
 * Deletes a topic and everything hanging off it.
 *
 * `course_sources`, `course_sessions` and (through sessions) `gaps` all
 * cascade on the foreign key, so this one row removal takes the recordings
 * and uploads with it. That is destructive and irreversible — the UI asks for
 * a second click before calling this.
 */
export async function deleteCourse(
  _prev: MutationState,
  formData: FormData,
): Promise<MutationState> {
  const { supabase, user } = await requireUser();
  const id = String(formData.get("id") ?? "");

  const { error } = await supabase
    .from("courses")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: "We couldn't delete that topic. Try again." };

  revalidatePath("/dashboard");
  return OK;
}
