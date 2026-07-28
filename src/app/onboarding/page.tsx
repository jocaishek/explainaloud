import { redirect } from "next/navigation";
import { requireUser } from "~/lib/supabase/server";
import { OnboardingForm } from "./onboarding-form";

export const metadata = { title: "Finish setting up · TeachItBack" };

export default async function OnboardingPage() {
  const { supabase, user } = await requireUser();

  // Already onboarded — nothing to collect, so don't make them look at a form.
  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profile) redirect("/dashboard");

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-16">
      <div className="w-full max-w-xl">
        <p className="mb-6 font-mono text-[11px] tracking-[0.18em] text-subtle uppercase">
          <span className="text-brand">02</span>
          <span className="mx-3 inline-block h-px w-6 align-middle bg-border" />
          Finish setting up
        </p>
        <OnboardingForm email={user.email ?? ""} />
      </div>
    </main>
  );
}
