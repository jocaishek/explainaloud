import { Settings } from "lucide-react";
import Link from "next/link";
import { ProfileForm } from "~/app/(app)/settings/profile-form";
import { StreakFlame } from "~/components/streak-flame";
import { ageFrom, USE_TYPE_LABELS } from "~/lib/profile";
import { streakLabel } from "~/lib/streak";
import { requireProfile } from "~/lib/supabase/server";
import { AvatarPicker } from "./avatar-picker";

export const metadata = { title: "Your profile · Explainaloud" };

/**
 * Who you are, as distinct from how the app behaves.
 *
 * Settings answers "how should this work" — appearance, speaking pace, plan.
 * This answers "who is signed in", which is why it is what the name and the
 * picture in the rail lead to, and why the gear beside them leads somewhere
 * else. They were one screen and that was the confusion: clicking your own
 * face landed on a page about theme preferences.
 */
export default async function ProfilePage() {
  const { supabase, user, profile } = await requireProfile();

  const { data: streak } = await supabase.rpc("own_streak", {
    zone: profile.timezone ?? "UTC",
  });
  const currentStreak = typeof streak === "number" ? streak : 0;

  const age = ageFrom(profile.date_of_birth);
  const initials =
    `${profile.first_name.at(0) ?? ""}${profile.last_name.at(0) ?? ""}`.toUpperCase() ||
    "?";

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-stack px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-semibold text-3xl text-strong tracking-tight">
            {profile.first_name} {profile.last_name}
          </h1>
          {/* The handle, directly under the name, because on this page they
              are the same fact said two ways: one is what people call you and
              the other is what they type to find you. */}
          {profile.username && (
            <p className="mt-1.5 font-mono text-[0.8rem] text-subtle">
              @{profile.username}
            </p>
          )}
          <p className="mt-2 text-subtle">
            Your picture, your details, and the account they belong to.
          </p>
        </div>
        <Link
          href="/settings"
          aria-label="Settings"
          title="Settings"
          className="press mt-1 flex size-9 shrink-0 items-center justify-center rounded-control border border-border text-subtle transition-colors hover:bg-muted hover:text-strong"
        >
          <Settings className="size-4" />
        </Link>
      </div>

      <Section
        title="Picture"
        description="Shown beside your name in the sidebar."
      >
        <div className="rounded-card border border-border bg-card p-5 shadow-rest">
          <AvatarPicker
            url={profile.avatar_url}
            initials={initials}
            userId={profile.user_id}
          />
        </div>
      </Section>

      <Section title="You" description="What the app knows about you.">
        <dl className="divide-y divide-border overflow-hidden rounded-card border border-border bg-card shadow-rest">
          <Row label="Age" value={age === null ? "—" : `${age}`} />
          <Row
            label="Username"
            value={profile.username ? `@${profile.username}` : "Not set"}
            note={
              profile.username
                ? "Permanent. Friends find you by this."
                : "Pick one on the Friends screen so people can find you."
            }
          />
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-3 text-sm">
            <dt className="text-subtle">Streak</dt>
            <dd className="flex items-center gap-2 text-right">
              {currentStreak > 0 && <StreakFlame size="sm" />}
              <span className="font-medium text-strong">
                {streakLabel(currentStreak)}
              </span>
            </dd>
          </div>
          <Row
            label="Using it for"
            value={USE_TYPE_LABELS[profile.use_type].title}
            note={USE_TYPE_LABELS[profile.use_type].description}
          />
        </dl>
      </Section>

      <Section title="Account" description="Details tied to your login.">
        <dl className="divide-y divide-border overflow-hidden rounded-card border border-border bg-card shadow-rest">
          <Row label="Email" value={user.email ?? "—"} />
          <Row label="Plan" value={profile.plan === "pro" ? "Pro" : "Free"} />
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

      <Section
        title="Your details"
        description="Change these any time. The dashboard greets you by your first name."
      >
        <ProfileForm profile={profile} />
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
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="font-semibold text-[0.95rem] text-strong tracking-[-0.01em]">
          {title}
        </h2>
        <p className="mt-1 text-[0.85rem] text-subtle">{description}</p>
      </div>
      {children}
    </section>
  );
}

function Row({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-3 text-sm">
      <dt className="text-subtle">{label}</dt>
      <dd className="text-right">
        <span className="font-medium text-strong">{value}</span>
        {note && (
          <span className="mt-0.5 block text-[0.78rem] text-subtle">
            {note}
          </span>
        )}
      </dd>
    </div>
  );
}
