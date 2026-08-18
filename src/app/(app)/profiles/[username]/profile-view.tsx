"use client";

import {
  ArrowLeft,
  Check,
  Clock,
  Loader2,
  Lock,
  UserMinus,
  UserPlus,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  removeFriendship,
  respondToRequest,
  sendFriendRequest,
} from "~/app/(app)/friends/actions";
import type { PublicProfile } from "~/app/(app)/friends/types";
import { PersonAvatar } from "~/components/person-avatar";
import { StreakFlame } from "~/components/streak-flame";
import { Button } from "~/components/ui/button";
import { streakLabel } from "~/lib/streak";

/**
 * A person, and the one decision this page exists to offer.
 *
 * Identity at the top, the choice under it, and the two numbers below that —
 * or, for a stranger, an honest account of why the numbers are not there. The
 * order matters: somebody arriving from a link wants to know who this is
 * before they are asked to decide anything about them.
 *
 * **The locked state is not a tease.** It says exactly which two figures are
 * behind the friendship and that nothing else is, because the useful thing to
 * tell somebody deciding whether to send a request is what accepting one
 * actually shares. A blurred-out number with a padlock over it would imply
 * there is something worth prying at.
 */
export function ProfileView({ profile }: { profile: PublicProfile }) {
  const router = useRouter();
  /* Read straight from the prop rather than copied into state.
   *
   * `useState(profile.status)` initialises once and then ignores the prop for
   * the life of the component, so after `router.refresh()` the page would have
   * fresh data and a stale button — "Add" still offered to somebody who is now
   * a friend. The server is the authority here, and the render should say so. */
  const status = profile.status;
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  const name = `${profile.first_name} ${profile.last_name}`;
  const isSelf = status === "self";
  const isFriend = status === "friends";

  function run(action: () => Promise<{ ok: boolean; message: string }>) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setError(null);
      setConfirmingRemove(false);
      /* The server is the authority on what happened — asking somebody who
         had already asked you accepts instead of sending — so the page is
         re-rendered from it rather than guessing locally. */
      router.refresh();
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-stack px-4 py-8 pb-14 sm:px-6 lg:px-10 lg:py-10">
      <Link
        href="/friends"
        className="press inline-flex w-fit items-center gap-1.5 text-[0.85rem] text-subtle transition-colors hover:text-strong"
      >
        <ArrowLeft aria-hidden className="size-3.5" />
        Friends
      </Link>

      <section
        data-rise=""
        className="rounded-card border border-border bg-card p-6 shadow-rest sm:p-8"
      >
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <PersonAvatar
              firstName={profile.first_name}
              lastName={profile.last_name}
              avatarUrl={profile.avatar_url}
              size={64}
            />
            <div className="min-w-0">
              <h1 className="truncate font-display text-[clamp(1.4rem,3vw,1.9rem)] text-strong leading-tight tracking-[-0.03em]">
                {name}
              </h1>
              <p className="mt-1 truncate font-mono text-[0.8rem] text-subtle">
                @{profile.username}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
            {isSelf && (
              <Button asChild variant="outline" size="sm">
                <Link href="/profile">Edit your profile</Link>
              </Button>
            )}

            {status === "none" && (
              <Button
                onClick={() => run(() => sendFriendRequest(profile.user_id))}
                disabled={pending}
                className="gap-1.5"
              >
                {pending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <UserPlus className="size-4" />
                )}
                Add {profile.first_name}
              </Button>
            )}

            {status === "incoming" && profile.request_id && (
              <div className="flex items-center gap-2">
                <Button
                  onClick={() =>
                    run(() =>
                      respondToRequest(profile.request_id as string, true),
                    )
                  }
                  disabled={pending}
                  className="gap-1.5"
                >
                  {pending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Check className="size-4" />
                  )}
                  Accept
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Decline ${profile.first_name}`}
                  title="Decline"
                  onClick={() =>
                    run(() =>
                      respondToRequest(profile.request_id as string, false),
                    )
                  }
                  disabled={pending}
                >
                  <X className="size-4" />
                </Button>
              </div>
            )}

            {status === "outgoing" && profile.request_id && (
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 whitespace-nowrap text-[0.85rem] text-subtle">
                  <Clock aria-hidden className="size-3.5" />
                  Asked
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-subtle"
                  onClick={() =>
                    run(() => removeFriendship(profile.request_id as string))
                  }
                  disabled={pending}
                >
                  Cancel
                </Button>
              </div>
            )}

            {isFriend &&
              profile.request_id &&
              (confirmingRemove ? (
                <div className="flex items-center gap-2">
                  <span className="text-[0.8rem] text-subtle">
                    Remove them?
                  </span>
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => setConfirmingRemove(false)}
                    disabled={pending}
                  >
                    No
                  </Button>
                  <Button
                    size="xs"
                    variant="destructive"
                    onClick={() =>
                      run(() => removeFriendship(profile.request_id as string))
                    }
                    disabled={pending}
                  >
                    {pending ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      "Remove"
                    )}
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => setConfirmingRemove(true)}
                >
                  <UserMinus className="size-3.5" />
                  Friends
                </Button>
              ))}
          </div>
        </div>

        {error && (
          <p role="alert" className="mt-4 text-[0.82rem] text-destructive">
            {error}
          </p>
        )}

        {/* The two numbers, or the reason they are not here. */}
        {profile.topics !== null && profile.streak !== null ? (
          <div className="mt-7 flex flex-wrap items-center gap-x-10 gap-y-4 border-border border-t pt-6">
            <p className="flex items-center gap-2.5">
              {profile.streak > 0 && <StreakFlame size="lg" />}
              {profile.streak > 0 ? (
                <span className="text-[1.05rem]">
                  <span className="font-display text-[1.9rem] text-strong leading-none tracking-[-0.035em] tabular-nums">
                    {profile.streak}
                  </span>
                  <span className="ml-2 text-subtle">
                    {profile.streak === 1 ? "day in a row" : "days in a row"}
                  </span>
                </span>
              ) : (
                <span className="text-[1.05rem] text-subtle">
                  {streakLabel(profile.streak)}
                </span>
              )}
            </p>
            <p className="text-[1.05rem]">
              <span className="font-display text-[1.9rem] text-strong leading-none tracking-[-0.035em] tabular-nums">
                {profile.topics}
              </span>
              <span className="ml-2 text-subtle">
                {profile.topics === 1 ? "topic" : "topics"}
              </span>
            </p>
          </div>
        ) : (
          <div className="mt-7 flex items-start gap-3 border-border border-t pt-6">
            <Lock aria-hidden className="mt-0.5 size-4 shrink-0 text-subtle" />
            <p className="max-w-[52ch] text-[0.88rem] text-subtle leading-relaxed">
              Once you are friends you will each see two things about the other:
              how many topics they have built, and how many days in a row they
              have recorded. Not the topics, not the recordings, and nothing
              either of you has said.
            </p>
          </div>
        )}
      </section>

      <p className="text-[0.8rem] text-subtle">
        On Explainaloud since{" "}
        {new Date(profile.member_since).toLocaleDateString(undefined, {
          year: "numeric",
          month: "long",
        })}
        .
      </p>
    </div>
  );
}
