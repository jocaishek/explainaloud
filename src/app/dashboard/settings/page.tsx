import { ThemeSwitcher } from "~/components/theme-switcher";
import { USE_TYPE_LABELS } from "~/lib/profile";
import { requireProfile } from "~/lib/supabase/server";
import { ProfileForm } from "./profile-form";

export const metadata = { title: "Settings · TeachItBack" };

export default async function SettingsPage() {
  const { user, profile } = await requireProfile();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-10 px-6 py-16">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-strong">
          Settings
        </h1>
        <p className="mt-2 text-subtle">
          Your account details and how TeachItBack looks.
        </p>
      </div>

      <Section title="Appearance" description="Applies across your dashboard.">
        <ThemeSwitcher />
      </Section>

      <Section
        title="Your details"
        description="Change these any time — the dashboard greets you by your first name."
      >
        <ProfileForm profile={profile} />
      </Section>

      <Section title="Account" description="Details tied to your login.">
        <dl className="divide-y divide-border overflow-hidden rounded-xl border border-border">
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
        <h2 className="font-mono text-[11px] tracking-[0.18em] text-brand uppercase">
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
