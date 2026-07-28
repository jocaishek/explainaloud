"use server";

import { redirect } from "next/navigation";
import { dateOfBirthError, isUseType, nameError } from "~/lib/profile";
import { createClient } from "~/lib/supabase/server";

export type OnboardingState = { error: string | null };

/**
 * Saves the onboarding profile. Everything the client checked is re-checked
 * here — the client form is for feedback, this is the trust boundary.
 */
export async function saveProfile(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const supabase = await createClient();
  // This write references auth.users, so verify the account still exists
  // rather than trusting a locally valid JWT from a deleted/stale session.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    await supabase.auth.signOut({ scope: "local" });
    redirect("/?authError=session-expired#signup");
  }

  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const dateOfBirth = String(formData.get("dateOfBirth") ?? "").trim();
  const useType = String(formData.get("useType") ?? "");

  const problem =
    nameError(firstName, "first name") ??
    nameError(lastName, "last name") ??
    dateOfBirthError(dateOfBirth);

  if (problem) return { error: problem };
  if (!isUseType(useType)) {
    return { error: "Pick how you'll be using Ropes." };
  }

  // Upsert rather than insert: a half-finished onboarding that got interrupted
  // should be completable, not a duplicate-key error.
  const { error } = await supabase.from("profiles").upsert(
    {
      user_id: user.id,
      first_name: firstName,
      last_name: lastName,
      date_of_birth: dateOfBirth,
      use_type: useType,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    console.error("Failed to save onboarding profile", {
      code: error.code,
      message: error.message,
    });
    return { error: "We couldn't save that. Try again." };
  }

  redirect("/dashboard");
}
