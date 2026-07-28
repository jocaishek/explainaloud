"use server";

import { revalidatePath } from "next/cache";
import { dateOfBirthError, isUseType, nameError } from "~/lib/profile";
import { requireUser } from "~/lib/supabase/server";

export type ProfileFormState = { error: string | null; saved: boolean };

/** Same validation as onboarding — this is the trust boundary, not the form. */
export async function updateProfile(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const { supabase, user } = await requireUser();

  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const dateOfBirth = String(formData.get("dateOfBirth") ?? "").trim();
  const useType = String(formData.get("useType") ?? "");

  const problem =
    nameError(firstName, "first name") ??
    nameError(lastName, "last name") ??
    dateOfBirthError(dateOfBirth);

  if (problem) return { error: problem, saved: false };
  if (!isUseType(useType)) {
    return { error: "Pick how you'll be using TeachItBack.", saved: false };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: firstName,
      last_name: lastName,
      date_of_birth: dateOfBirth,
      use_type: useType,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);

  if (error)
    return { error: "We couldn't save that. Try again.", saved: false };

  // The header and the home-screen greeting both read the first name.
  revalidatePath("/dashboard", "layout");
  return { error: null, saved: true };
}
