import { BookOpenText, Mic2, ScanSearch } from "lucide-react";
import { OnboardingForm } from "./onboarding-form";

const LEARNING_LOOP = [
  {
    icon: BookOpenText,
    title: "Build a focused course",
    body: "Start from a question, topic, or your own sources.",
  },
  {
    icon: Mic2,
    title: "Explain it out loud",
    body: "Turn recall into something you can see and improve.",
  },
  {
    icon: ScanSearch,
    title: "Find the missing pieces",
    body: "Get a short gap report and a precise re-teach path.",
  },
] as const;

export function OnboardingExperience({ email }: { email: string }) {
  return (
    <main className="min-h-screen bg-background px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
        <header className="flex items-center justify-between px-1">
          <span className="text-base font-semibold tracking-tight text-strong">
            Explainaloud
          </span>
          <span className="text-sm text-subtle">Account setup</span>
        </header>

        <div className="grid overflow-hidden rounded-2xl border border-border bg-card lg:grid-cols-[0.82fr_1.18fr]">
          <aside className="flex flex-col justify-between gap-10 bg-primary p-7 text-primary-foreground sm:p-9 lg:min-h-[620px]">
            <div>
              <span className="inline-flex rounded-full bg-primary-foreground/10 px-3 py-1 text-xs font-medium">
                About one minute
              </span>
              <h1 className="mt-6 max-w-sm text-3xl leading-tight font-semibold tracking-tight text-balance">
                Built around what you can explain.
              </h1>
              <p className="mt-3 max-w-sm text-sm leading-6 text-primary-foreground/70">
                A few details help Explainaloud shape the learning experience
                around you. Then you can start your first topic.
              </p>

              <ol className="mt-9 flex flex-col gap-5">
                {LEARNING_LOOP.map(({ icon: Icon, title, body }) => (
                  <li key={title} className="flex gap-3.5">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/10">
                      <Icon className="size-4 text-brand" />
                    </span>
                    <span>
                      <span className="block text-sm font-medium">{title}</span>
                      <span className="mt-0.5 block max-w-xs text-xs leading-5 text-primary-foreground/60">
                        {body}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            <p className="text-xs leading-5 text-primary-foreground/55">
              You can change these details later in Settings.
            </p>
          </aside>

          <section className="flex min-h-[520px] items-center p-6 sm:min-h-[560px] sm:p-10 lg:min-h-[620px] lg:p-12">
            <OnboardingForm email={email} />
          </section>
        </div>
      </div>
    </main>
  );
}
