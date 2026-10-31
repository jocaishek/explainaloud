import { redirect } from "next/navigation";

/**
 * Your profile lives in Settings now, as its first card.
 *
 * Kept as a route rather than deleted because the sidebar and anything
 * bookmarked still point here. The picture's upload and removal actions, the
 * picker and the cropper stay in this folder and are imported from there.
 */
export default function ProfilePage() {
  redirect("/settings#profile");
}
