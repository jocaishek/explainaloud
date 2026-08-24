import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { ThemeSwitcher } from "~/components/theme-switcher";
import { PLAN_FEATURES } from "~/lib/plans";
import { requireProfile } from "~/lib/supabase/server";
import { VoiceBaselinePanel } from "./voice-baseline-panel";

export const metadata = { title: "Settings · explainaloud" };

export default async function SettingsPage() {
  const { supabase, user, profile } = await requireProfile();
  const initials =
    `${profile.first_name.at(0) ?? ""}${profile.last_name.at(0) ?? ""}`.toUpperCase() ||
    "?";

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
          Your account details and how explainaloud looks.
        </p>
      </div>

      {/* No plan picker: there is one plan and it is free. A panel offering an
          upgrade nobody can buy is worse than no panel. */}
      <Section
        title="What's included"
        description="Everything explainaloud does, at no cost."
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

      {/* Your name, age, use case, picture and login all moved to /profile.
          Settings is now only how the app behaves; who you are is a different
          question and it lives behind your own name in the sidebar. */}
      <Section
        title="You"
        description="Your picture, your details and the account they belong to."
      >
        <Link
          href="/profile"
          className="press flex items-center justify-between gap-4 rounded-card border border-border bg-card px-4 py-3.5 text-sm shadow-rest transition-colors hover:bg-muted"
        >
          <span className="flex min-w-0 items-center gap-3">
            <span
              aria-hidden
              className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent-wash font-medium text-[0.8rem] text-brand-ink"
            >
              {profile.avatar_url ? (
                // biome-ignore lint/performance/noImgElement: a 36px avatar; see profile/avatar-picker.tsx
                <img
                  src={profile.avatar_url}
                  alt=""
                  width={36}
                  height={36}
                  className="size-full object-cover"
                />
              ) : (
                initials
              )}
            </span>
            <span className="min-w-0">
              <span className="block truncate font-medium text-strong">
                {profile.first_name} {profile.last_name}
              </span>
              <span className="block truncate text-[0.8rem] text-subtle">
                {user.email ?? "—"}
              </span>
            </span>
          </span>
          <ChevronRight aria-hidden className="size-4 shrink-0 text-subtle" />
        </Link>
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
        <h2 className="font-semibold text-[1rem] text-strong tracking-[-0.01em]">
          {title}
        </h2>
        <p className="mt-1.5 text-sm text-subtle">{description}</p>
      </div>
      {children}
    </section>
  );
}
