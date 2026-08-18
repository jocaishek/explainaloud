"use server";

import { revalidatePath } from "next/cache";
import { isUseType, nameError } from "~/lib/profile";
import { requireUser } from "~/lib/supabase/server";

export type ProfileFormState = { error: string | null; saved: boolean };

/* Neither the username nor the date of birth is read from this form any more.
   They are set once at onboarding and a trigger on `profiles` refuses to
   change either, so accepting them here would be accepting values that the
   write is going to reject anyway — and quietly dropping them would be worse,
   because the form would appear to save something it did not. */

/** Same validation as onboarding — this is the trust boundary, not the form. */
export async function updateProfile(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const { supabase, user } = await requireUser();

  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();

  const useType = String(formData.get("useType") ?? "");

  const problem =
    nameError(firstName, "first name") ?? nameError(lastName, "last name");

  if (problem) return { error: problem, saved: false };
  if (!isUseType(useType)) {
    return { error: "Pick how you'll be using Explainaloud.", saved: false };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: firstName,
      last_name: lastName,
      use_type: useType,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);

  if (error)
    return { error: "We couldn't save that. Try again.", saved: false };

  // The header and the home-screen greeting both read the first name.
  revalidatePath("/home", "layout");
  return { error: null, saved: true };
}
