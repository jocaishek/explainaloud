"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "~/lib/supabase/server";

export type AvatarState = { error: string | null; saved: boolean };

/**
 * Records a picture that the browser has already uploaded.
 *
 * The file goes straight from the browser to storage rather than through here.
 * A server action posts its body to the function, which has a request-size
 * ceiling and bills for the seconds spent receiving bytes it is only going to
 * forward — so the upload takes the direct path and this only writes the
 * resulting URL, having first checked that the path belongs to the caller.
 */
export async function saveAvatar(url: string): Promise<AvatarState> {
  const { supabase, user } = await requireUser();

  /* The client is not the trust boundary. Storage's own policy already stops
     anybody writing outside their own prefix, but this column is read back and
     rendered as a URL, so it is checked here too: it must be an absolute URL
     into this project's avatars bucket, under this user's folder. Otherwise a
     crafted call could point somebody's avatar at any address on the web. */
  const expected = `/storage/v1/object/public/avatars/${user.id}/`;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { error: "That isn't a picture we can use.", saved: false };
  }
  if (parsed.protocol !== "https:" || !parsed.pathname.startsWith(expected)) {
    return { error: "That isn't a picture we can use.", saved: false };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      avatar_url: parsed.toString(),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);

  if (error)
    return { error: "We couldn't save that. Try again.", saved: false };

  // The rail renders the avatar on every screen in the app.
  revalidatePath("/home", "layout");
  return { error: null, saved: true };
}

/** Back to initials. The file is left in storage; the next upload overwrites it. */
export async function removeAvatar(): Promise<AvatarState> {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: null, updated_at: new Date().toISOString() })
    .eq("user_id", user.id);

  if (error)
    return { error: "We couldn't save that. Try again.", saved: false };

  revalidatePath("/home", "layout");
  return { error: null, saved: true };
}
