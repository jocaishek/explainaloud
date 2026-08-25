import { ExplainaloudMark } from "~/components/explainaloud-mark";
import { OnboardingForm } from "./onboarding-form";

/**
 * The loop, in the order you run it.
 *
 * Numerals rather than icons in rounded squares. Three glyphs in three tinted
 * chips beside three interchangeable grey paragraphs is the most reliable tell
 * that nobody chose anything — it is the shape a generated page reaches for
 * every time, and the app's own dashboard already rejected it for the same
 * reason. The numeral does the icon's job better,
 * because these are steps rather than features: reading 01, 02, 03 alone gives
 * you the product.
 */
const LOOP = [
  {
    n: "01",
    title: "Build a focused course",
    body: "From a question, a topic, or your own notes.",
  },
  {
    n: "02",
    title: "Explain it out loud",
    body: "Three minutes, no notes. Claims are marked as you speak.",
  },
  {
    n: "03",
    title: "Read back the gaps",
    body: "What held up, what was vague, what you never reached.",
  },
] as const;

export function OnboardingExperience({ email }: { email: string }) {
  return (
    /* `register-app`, because this is the last screen before the app and not
       the last screen of the marketing site. The radii, the elevation and the
       density all come from the product somebody is about to be standing in,
       so setup does not read as a different piece of software from the thing
       it sets up. */
    <main className="register-app min-h-screen bg-background px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
        <header className="flex items-center justify-between px-1">
          <span className="flex items-center gap-2.5 text-strong">
            <ExplainaloudMark className="size-6 text-[color:var(--accent-solid)]" />
            <span className="font-semibold text-[0.92rem] uppercase tracking-[0.04em]">
              Explainaloud
            </span>
          </span>
          <span className="text-subtle text-sm">Account setup</span>
        </header>

        <div className="grid overflow-hidden rounded-card border border-border bg-card shadow-rest lg:grid-cols-[0.82fr_1.18fr]">
          <aside className="flex flex-col justify-between gap-10 bg-[color:var(--panel-deep)] p-7 text-[color:var(--brand-foreground)] sm:p-9 lg:min-h-[640px]">
            <div>
              <span className="font-mono text-[0.6rem] uppercase tracking-[0.14em] opacity-60">
                About one minute
              </span>
              <h1 className="mt-5 max-w-sm text-balance font-display text-[clamp(1.6rem,2.6vw,2.1rem)] leading-[1.08] tracking-[-0.035em]">
                Built around what you can explain.
              </h1>
              <p className="mt-3 max-w-sm text-[0.9rem] leading-6 opacity-70">
                Five short questions, then your first topic.
              </p>

              <ol className="mt-10 flex flex-col divide-y divide-white/10 border-white/10 border-t">
                {LOOP.map((step) => (
                  <li key={step.n} className="flex gap-4 py-4">
                    <span className="pt-0.5 font-mono text-[0.66rem] tabular-nums opacity-50">
                      {step.n}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-medium text-[0.92rem]">
                        {step.title}
                      </span>
                      <span className="mt-1 block max-w-xs text-[0.8rem] leading-5 opacity-60">
                        {step.body}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            {/* It used to say every detail could be changed later in Settings,
                and two of them cannot: the username is how other people find
                you and the date of birth is what the age check reads, so both
                are set once. Saying otherwise in the moment somebody is
                choosing them is the worst possible place to be wrong. */}
            <p className="text-[0.78rem] leading-5 opacity-55">
              Your username and date of birth are permanent. Everything else you
              can change later in Settings.
            </p>
          </aside>

          <section className="flex min-h-[520px] items-center p-6 sm:min-h-[560px] sm:p-10 lg:min-h-[640px] lg:p-12">
            <OnboardingForm email={email} />
          </section>
        </div>
      </div>
    </main>
  );
}
