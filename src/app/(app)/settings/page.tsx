import { ThemeSwitcher } from "~/components/theme-switcher";
import { PLAN_FEATURES } from "~/lib/plans";
import { USE_TYPE_LABELS } from "~/lib/profile";
import { requireProfile } from "~/lib/supabase/server";
import { ProfileForm } from "./profile-form";
import { VoiceBaselinePanel } from "./voice-baseline-panel";

export const metadata = { title: "Settings · Explainaloud" };

export default async function SettingsPage() {
  const { supabase, user, profile } = await requireProfile();

  const { data: baseline } = await supabase
    .from("speech_baselines")
    .select("capable_wpm, median_wpm")
    .eq("user_id", user.id)
    .maybeSingle<{ capable_wpm: number; median_wpm: number }>();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-stack px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-strong">
          Settings
        </h1>
        <p className="mt-2 text-subtle">
          Your account details and how Explainaloud looks.
        </p>
      </div>

      {/* No plan picker: there is one plan and it is free. A panel offering an
          upgrade nobody can buy is worse than no panel. */}
      <Section
        title="What's included"
        description="Everything Explainaloud does, at no cost."
      >
        <ul className="divide-y divide-border overflow-hidden rounded-card border border-border bg-card shadow-rest">
          {PLAN_FEATURES.map((feature) => (
            <li
              key={feature.label}
              className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
            >
              <span className="text-subtle">{feature.label}</span>
              <span className="font-medium text-strong">
                {typeof feature.free === "string" ? feature.free : "Included"}
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <Section
        title="Your speaking pace"
        description="So we can tell hesitation apart from how you normally talk."
      >
        <VoiceBaselinePanel existingWpm={baseline?.median_wpm ?? null} />
      </Section>

      <Section title="Appearance" description="Applies across your dashboard.">
        <ThemeSwitcher />
      </Section>

      <Section
        title="Your details"
        description="Change these any time. The dashboard greets you by your first name."
      >
        <ProfileForm profile={profile} />
      </Section>

      <Section title="Account" description="Details tied to your login.">
        <dl className="divide-y divide-border overflow-hidden rounded-card border border-border bg-card shadow-rest">
          <Row label="Email" value={user.email ?? "—"} />
          <Row
            label="Using it for"
            value={USE_TYPE_LABELS[profile.use_type].title}
          />
          <Row
            label="Member since"
            value={new Date(profile.created_at).toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          />
        </dl>
      </Section>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="font-mono text-[11px] tracking-[0.18em] text-brand-ink uppercase">
          {title}
        </h2>
        <p className="mt-1.5 text-sm text-subtle">{description}</p>
      </div>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 bg-surface px-4 py-3">
      <dt className="text-sm text-subtle">{label}</dt>
      <dd className="truncate text-sm font-medium text-strong">{value}</dd>
    </div>
  );
}
