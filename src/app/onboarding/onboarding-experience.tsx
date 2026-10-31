import { OnboardingForm } from "./onboarding-form";

/**
 * The setup screen: one question at a time, in a single column.
 *
 * It used to be a two-column card with a dark panel describing the product
 * beside the form. That panel was the machine describing itself to somebody
 * who had not used it yet, and it halved the width of the only thing on the
 * screen they could act on. What is left is the question, the fields that
 * answer it, and a way forward — the same page, field and button the app
 * itself uses, so setup does not read as different software from the thing it
 * sets up.
 *
 * The top bar and the progress line live in the form, because they read the
 * step it owns.
 */
export function OnboardingExperience({ email }: { email: string }) {
  return (
    <main className="min-h-svh bg-background text-foreground">
      <OnboardingForm email={email} />
    </main>
  );
}
