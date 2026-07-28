import { redirect } from "next/navigation";
import { requireUser } from "~/lib/supabase/server";
import { OnboardingExperience } from "./onboarding-experience";

export const metadata = { title: "Finish setting up · Ropes" };

export default async function OnboardingPage() {
  const { supabase, user } = await requireUser();

  // Already onboarded — nothing to collect, so don't make them look at a form.
  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profile) redirect("/dashboard");

  return <OnboardingExperience email={user.email ?? ""} />;
}
