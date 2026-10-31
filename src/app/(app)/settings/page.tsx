import { AvatarPicker } from "~/app/(app)/profile/avatar-picker";
import { SignOutButton } from "~/components/sign-out-button";
import { StreakFlame } from "~/components/streak-flame";
import { ThemeSwitcher } from "~/components/theme-switcher";
import { Card } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { ownStreak } from "~/lib/own-streak";
import { PLAN_FEATURES } from "~/lib/plans";
import { ageFrom } from "~/lib/profile";
import { streakLabel } from "~/lib/streak";
import { requireProfile } from "~/lib/supabase/server";
import { cn } from "~/lib/utils";
import { ProfileForm } from "./profile-form";
import { SettingsNav, type SettingsSection } from "./settings-nav";
import { VoiceBaselinePanel } from "./voice-baseline-panel";

export const metadata = { title: "Settings · Explainaloud" };

const SECTIONS: SettingsSection[] = [
  { id: "profile", label: "Profile" },
  { id: "voice", label: "Your voice" },
  { id: "appearance", label: "Appearance" },
  { id: "plan", label: "Plan" },
  { id: "account", label: "Account" },
];

/** `yyyy-mm-dd` read as a plain date, not as UTC midnight in another zone. */
function formatDateOfBirth(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return "—";
  const [, y, m, d] = match;
  return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString(
    undefined,
    { year: "numeric", month: "long", day: "numeric" },
  );
}

/**
 * Who you are, and the few things the app knows about you.
 *
 * This used to be two screens — a profile behind your name and settings behind
 * the gear — and the split was a question nobody was asking. `/profile` now
 * redirects to the first card here.
 */
export default async function SettingsPage() {
  const { supabase, user, profile } = await requireProfile();

  const [{ data: baseline }, currentStreak] = await Promise.all([
    supabase
      .from("speech_baselines")
      .select("capable_wpm, median_wpm")
      .eq("user_id", user.id)
      .maybeSingle<{ capable_wpm: number; median_wpm: number }>(),
    ownStreak(profile.timezone ?? "UTC"),
  ]);

  const age = ageFrom(profile.date_of_birth);
  const initials =
    `${profile.first_name.at(0) ?? ""}${profile.last_name.at(0) ?? ""}`.toUpperCase() ||
    "?";
  const isPro = profile.plan === "pro";
  const memberSince = new Date(profile.created_at).toLocaleDateString(
    undefined,
    { year: "numeric", month: "long" },
  );

  return (
    <div className="mx-auto w-full max-w-[90rem] px-4 pt-8 pb-32 sm:px-8">
      <h1
        data-rise=""
        className="font-normal text-[2rem] text-strong leading-10 tracking-[-0.03em] md:text-[2.5rem] md:leading-[3rem]"
      >
        Settings
      </h1>

      <div className="mt-6 grid gap-6 md:mt-8 md:grid-cols-[11rem_minmax(0,45rem)] md:gap-12">
        <SettingsNav sections={SECTIONS} />

        <div data-rise="" className="grid gap-4">
          <SettingsCard
            id="profile"
            title="Profile"
            description="How friends see you. Your username is how they find you"
          >
            <div className="mt-5">
              <AvatarPicker
                url={profile.avatar_url}
                initials={initials}
                userId={profile.user_id}
              />
            </div>

            <div className="mt-5 border-border border-t pt-5">
              <p className="font-medium text-[0.9375rem] text-strong">
                {profile.first_name} {profile.last_name}
              </p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-subtle">
                {profile.username && (
                  <span className="font-mono text-xs">@{profile.username}</span>
                )}
                {age !== null && <span>{age} years old</span>}
              </p>
              <p className="mt-2 flex items-center gap-1.5 text-sm text-subtle">
                {currentStreak > 0 && (
                  <StreakFlame size="sm" className="size-4" />
                )}
                {streakLabel(currentStreak)}
              </p>
            </div>

            {/* Shown, not editable, and both for a reason.
             *
             * Both are set once during onboarding. A username is how other
             * people find and recognise you, so one that can be swapped later
             * is a way of becoming somebody else after the friend list has
             * already learned who you are. A date of birth is what gates the
             * account at thirteen, and a field anybody can rewrite is not
             * something an age check can lean on.
             *
             * Read-only inputs are the smaller half of this. The database
             * refuses the write as well, because an update goes through
             * PostgREST with the caller's own token — so a field that is only
             * absent from a form is a field anybody can still set from a
             * console. */}
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="settings-username">Username</Label>
                <Input
                  id="settings-username"
                  readOnly
                  value={profile.username ? `@${profile.username}` : "—"}
                  aria-describedby="settings-username-note"
                  className="bg-background text-subtle"
                />
                <p
                  id="settings-username-note"
                  className="text-[0.8125rem] text-subtle"
                >
                  Can&rsquo;t be changed, so friends can always find you
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="settings-dob">Date of birth</Label>
                <Input
                  id="settings-dob"
                  readOnly
                  value={formatDateOfBirth(profile.date_of_birth)}
                  className="bg-background text-subtle"
                />
              </div>
            </div>

            <div className="mt-6">
              <ProfileForm profile={profile} />
            </div>
          </SettingsCard>

          <SettingsCard
            id="voice"
            title="Your voice"
            description="So we can tell hesitation apart from how you normally talk"
          >
            <div className="mt-4">
              <VoiceBaselinePanel existingWpm={baseline?.median_wpm ?? null} />
            </div>
          </SettingsCard>

          <SettingsCard id="appearance" title="Appearance">
            <Line title="Theme" note="System follows your device">
              <ThemeSwitcher />
            </Line>
          </SettingsCard>

          {/* What your plan includes. No plan picker: a panel offering an
              upgrade nobody can buy from here is worse than none. */}
          <SettingsCard
            id="plan"
            title="Plan"
            description={
              isPro
                ? "Pro. Here is what it includes"
                : "Free. Everything explainaloud does, at no cost"
            }
          >
            <ul className="mt-4">
              {PLAN_FEATURES.map((feature) => {
                const value = isPro ? feature.pro : feature.free;
                return (
                  <li
                    key={feature.label}
                    className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-border border-t py-3 text-sm last:pb-0"
                  >
                    <span className="text-subtle">{feature.label}</span>
                    <span className="font-medium text-strong">
                      {typeof value === "string"
                        ? value
                        : value
                          ? "Included"
                          : "Not included"}
                    </span>
                  </li>
                );
              })}
            </ul>
          </SettingsCard>

          <SettingsCard id="account" title="Account">
            <Line title="Email" note={user.email ?? "—"} />
            <Line title="Plan" note={isPro ? "Pro" : "Free"} />
            <Line title="Member since" note={memberSince} />
            <div className="flex items-center border-border border-t pt-4">
              <SignOutButton appearance="outline" />
            </div>
          </SettingsCard>
        </div>
      </div>
    </div>
  );
}

function SettingsCard({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="scroll-mt-8">
      <Card className="gap-0 p-6">
        <h2
          id={`${id}-heading`}
          className="font-medium text-lg text-strong leading-6"
        >
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-sm text-subtle leading-5">{description}</p>
        )}
        {children}
      </Card>
    </section>
  );
}

/** A labelled fact, or a labelled control, as one ruled line. */
function Line({
  title,
  note,
  children,
  className,
}: {
  title: string;
  note?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-4 border-border border-t py-4 first-of-type:mt-4",
        className,
      )}
    >
      <div className="min-w-0">
        <p className="font-medium text-[0.9375rem] text-strong">{title}</p>
        {note && (
          <p className="mt-0.5 break-words text-sm text-subtle">{note}</p>
        )}
      </div>
      {children}
    </div>
  );
}
