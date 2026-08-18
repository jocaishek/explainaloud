"use server";

import { redirect } from "next/navigation";
import { dateOfBirthError, isUseType, nameError } from "~/lib/profile";
import { createClient } from "~/lib/supabase/server";
import { normaliseUsername, usernameError } from "~/lib/username";

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
  const username = normaliseUsername(String(formData.get("username") ?? ""));
  const timezone = String(formData.get("timezone") ?? "")
    .trim()
    .slice(0, 64);

  const problem =
    nameError(firstName, "first name") ??
    nameError(lastName, "last name") ??
    usernameError(username) ??
    dateOfBirthError(dateOfBirth);

  if (problem) return { error: problem };
  if (!isUseType(useType)) {
    return { error: "Pick how you'll be using Explainaloud." };
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
      username,
      /* The zone the browser reported, which is what a streak is counted in.
         Whether a recording landed on Tuesday or Wednesday cannot be answered
         without knowing where the person was standing. */
      timezone: timezone || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  /* The name was taken between the form checking and this write.
   *
   * 23505 is the unique index doing its job, and it is the only thing in this
   * feature that actually guarantees uniqueness — the live check in the field
   * is a courtesy that two people can both pass in the same second. Named here
   * so the person is asked for another name rather than shown "we couldn't
   * save that", which is what a bare constraint violation would produce. */
  if (error?.code === "23505") {
    return { error: "That username was just taken. Pick another." };
  }

  if (error) {
    console.error("Failed to save onboarding profile", {
      code: error.code,
      message: error.message,
    });
    return { error: "We couldn't save that. Try again." };
  }

  redirect("/home");
}
