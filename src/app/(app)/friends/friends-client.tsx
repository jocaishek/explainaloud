"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Loader2, UserMinus, Users, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { UsernameField } from "~/app/onboarding/username-field";
import { PersonAvatar } from "~/components/person-avatar";
import { StreakFlame } from "~/components/streak-flame";
import { Button } from "~/components/ui/button";
import { streakLabel } from "~/lib/streak";
import { claimUsername, removeFriendship, respondToRequest } from "./actions";
import { FriendSearch } from "./friend-search";
import type { Friend, PendingRequest } from "./types";

const EASE = [0.23, 1, 0.32, 1] as const;

/**
 * The friends screen.
 *
 * Three regions, in the order somebody needs them: the people waiting on an
 * answer, the search that adds more, then the list itself. Requests go first
 * because they are the only part of this page with a deadline attached —
 * everything else is still there tomorrow.
 *
 * What a friend shows is two numbers and no more: how many topics they have
 * built, and how many days in a row they have recorded. That is the whole of
 * what somebody agreed to share by accepting, and it is enforced in the
 * database rather than by this file choosing not to render the rest — see
 * `friend_overview`.
 */
export function FriendsClient({
  friends,
  requests,
  needsUsername,
}: {
  friends: Friend[];
  requests: PendingRequest[];
  /** True for accounts created before usernames existed. */
  needsUsername: boolean;
}) {
  const router = useRouter();
  const refresh = useCallback(() => router.refresh(), [router]);

  const incoming = requests.filter((row) => row.direction === "incoming");
  const outgoing = requests.filter((row) => row.direction === "outgoing");

  /* Longest run first. Sorted here rather than in SQL because ordering by the
     streak there means computing every friend's streak twice, once to rank the
     rows and once to return them. */
  const ranked = [...friends].sort(
    (a, b) => b.streak - a.streak || a.first_name.localeCompare(b.first_name),
  );

  return (
    <div className="mx-auto flex w-full max-w-[var(--measure)] flex-col gap-stack px-4 py-8 pb-14 sm:px-6 lg:px-10 lg:py-10 lg:pb-16">
      <header data-rise="">
        <h1 className="font-display text-[clamp(1.7rem,3.2vw,2.4rem)] text-strong leading-[1.05] tracking-[-0.035em]">
          Friends
        </h1>
        <p className="mt-2 max-w-[52ch] text-subtle leading-relaxed">
          {friends.length === 0
            ? "Add somebody and you will both see how many topics the other has built, and how long their run of recording days is."
            : "How many topics they have built, and how many days in a row they have explained something out loud."}
        </p>
      </header>

      {needsUsername && (
        <div data-rise="">
          <ClaimUsername onClaimed={refresh} />
        </div>
      )}

      {incoming.length > 0 && (
        <section data-rise="" aria-labelledby="friend-requests-heading">
          <div className="overflow-hidden rounded-card border border-border bg-card shadow-rest">
            <div className="flex items-center gap-2 border-border border-b p-5">
              <h2
                id="friend-requests-heading"
                className="font-semibold text-[1.05rem] text-strong tracking-[-0.015em]"
              >
                Waiting on you
              </h2>
              <span className="rounded-pill bg-accent-wash px-2 py-0.5 font-medium text-[0.72rem] text-brand-ink tabular-nums">
                {incoming.length}
              </span>
            </div>
            <ul className="divide-y divide-border">
              <AnimatePresence initial={false}>
                {incoming.map((request) => (
                  <RequestRow
                    key={request.id}
                    request={request}
                    onChanged={refresh}
                  />
                ))}
              </AnimatePresence>
            </ul>
          </div>
        </section>
      )}

      <div data-rise="">
        <FriendSearch onChanged={refresh} />
      </div>

      {outgoing.length > 0 && (
        <section data-rise="" aria-labelledby="friend-sent-heading">
          <div className="overflow-hidden rounded-card border border-border bg-card shadow-rest">
            <div className="border-border border-b p-5">
              <h2
                id="friend-sent-heading"
                className="font-semibold text-[1.05rem] text-strong tracking-[-0.015em]"
              >
                Asked, not answered
              </h2>
              <p className="mt-1 text-[0.85rem] text-subtle leading-relaxed">
                They will show up below once they accept.
              </p>
            </div>
            <ul className="divide-y divide-border">
              <AnimatePresence initial={false}>
                {outgoing.map((request) => (
                  <RequestRow
                    key={request.id}
                    request={request}
                    onChanged={refresh}
                  />
                ))}
              </AnimatePresence>
            </ul>
          </div>
        </section>
      )}

      <section data-rise="" aria-labelledby="friend-list-heading">
        <h2
          id="friend-list-heading"
          className="mb-4 font-semibold text-[1.05rem] text-strong tracking-[-0.015em]"
        >
          {friends.length > 0
            ? `Your friends (${friends.length})`
            : "Your friends"}
        </h2>

        {ranked.length === 0 ? (
          <div className="flex flex-col items-start gap-3 rounded-card border border-border border-dashed bg-card p-8">
            <Users aria-hidden className="size-5 text-subtle" />
            <p className="max-w-[46ch] text-[0.9rem] text-subtle leading-relaxed">
              Nobody yet. Search above for a username, or for the name somebody
              signed up with, and they will appear here once they accept.
            </p>
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {ranked.map((friend) => (
              <li key={friend.user_id}>
                <FriendCard friend={friend} onChanged={refresh} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function RequestRow({
  request,
  onChanged,
}: {
  request: PendingRequest;
  onChanged: () => void;
}) {
  const reduced = useReducedMotion();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function answer(accept: boolean) {
    startTransition(async () => {
      const result = await respondToRequest(request.id, accept);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      onChanged();
    });
  }

  function cancel() {
    startTransition(async () => {
      const result = await removeFriendship(request.id);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      onChanged();
    });
  }

  return (
    <motion.li
      layout={!reduced}
      exit={reduced ? { opacity: 0 } : { opacity: 0, x: -12 }}
      transition={{ duration: reduced ? 0.1 : 0.22, ease: EASE }}
      className="flex items-center gap-3 px-5 py-3.5"
    >
      <PersonAvatar
        firstName={request.first_name}
        lastName={request.last_name}
        avatarUrl={request.avatar_url}
        size={38}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-[0.92rem] text-strong">
          {request.first_name} {request.last_name}
        </p>
        <p className="truncate font-mono text-[0.72rem] text-subtle">
          @{request.username}
        </p>
        {error && (
          <p role="alert" className="mt-1 text-[0.78rem] text-destructive">
            {error}
          </p>
        )}
      </div>

      {request.direction === "incoming" ? (
        <div className="flex shrink-0 items-center gap-2">
          <Button
            size="sm"
            onClick={() => answer(true)}
            disabled={pending}
            className="gap-1.5"
          >
            {pending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Check className="size-3.5" />
            )}
            Accept
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => answer(false)}
            disabled={pending}
            aria-label={`Decline ${request.first_name}`}
            title="Decline"
          >
            <X className="size-4" />
          </Button>
        </div>
      ) : (
        <Button
          size="sm"
          variant="ghost"
          onClick={cancel}
          disabled={pending}
          className="shrink-0 text-subtle"
        >
          Cancel
        </Button>
      )}
    </motion.li>
  );
}

function FriendCard({
  friend,
  onChanged,
}: {
  friend: Friend;
  onChanged: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function remove() {
    startTransition(async () => {
      const result = await removeFriendship(friend.friendship_id);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setConfirming(false);
      onChanged();
    });
  }

  return (
    <article className="flex h-full flex-col rounded-card border border-border bg-card p-5 shadow-rest">
      <div className="flex items-center gap-3">
        <PersonAvatar
          firstName={friend.first_name}
          lastName={friend.last_name}
          avatarUrl={friend.avatar_url}
          size={44}
        />
        <div className="min-w-0">
          <p className="truncate font-medium text-[0.95rem] text-strong">
            {friend.first_name} {friend.last_name}
          </p>
          <p className="truncate font-mono text-[0.72rem] text-subtle">
            @{friend.username}
          </p>
        </div>
      </div>

      {/* Two numbers, ruled apart rather than boxed. The whole card is already
          a box; a second one inside it for two figures is drawing for the sake
          of drawing. */}
      <dl className="mt-5 grid grid-cols-2 gap-4 border-border border-t pt-4">
        <div>
          <dt className="font-mono text-[0.6rem] text-subtle uppercase tracking-[0.14em]">
            Streak
          </dt>
          <dd className="mt-1.5 flex items-center gap-1.5">
            {friend.streak > 0 && <StreakFlame size="sm" />}
            <span className="font-medium text-[1.05rem] text-strong tabular-nums">
              {streakLabel(friend.streak)}
            </span>
          </dd>
        </div>
        <div>
          <dt className="font-mono text-[0.6rem] text-subtle uppercase tracking-[0.14em]">
            Topics
          </dt>
          <dd className="mt-1.5 font-medium text-[1.05rem] text-strong tabular-nums">
            {friend.topics}
          </dd>
        </div>
      </dl>

      {error && (
        <p role="alert" className="mt-3 text-[0.78rem] text-destructive">
          {error}
        </p>
      )}

      <div className="mt-4 flex items-center justify-end">
        {confirming ? (
          <div className="flex items-center gap-2">
            <span className="text-[0.78rem] text-subtle">Remove them?</span>
            <Button
              size="xs"
              variant="ghost"
              onClick={() => setConfirming(false)}
              disabled={pending}
            >
              No
            </Button>
            <Button
              size="xs"
              variant="destructive"
              onClick={remove}
              disabled={pending}
            >
              {pending ? <Loader2 className="size-3 animate-spin" /> : "Remove"}
            </Button>
          </div>
        ) : (
          <Button
            size="xs"
            variant="ghost"
            onClick={() => setConfirming(true)}
            className="gap-1.5 text-subtle"
          >
            <UserMinus className="size-3" />
            Remove
          </Button>
        )}
      </div>
    </article>
  );
}

/**
 * For an account that predates usernames.
 *
 * Not a settings row, because this is the thing standing between somebody and
 * the page they are looking at: without a username they cannot be searched for
 * and they cannot search, and no amount of explaining that in the empty state
 * would let them fix it from there.
 */
function ClaimUsername({ onClaimed }: { onClaimed: () => void }) {
  const [username, setUsername] = useState("");
  const [free, setFree] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function claim() {
    startTransition(async () => {
      const result = await claimUsername(username);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setError(null);
      onClaimed();
    });
  }

  return (
    <section className="rounded-card border border-border bg-card p-5 shadow-rest">
      <h2 className="font-semibold text-[1.05rem] text-strong tracking-[-0.015em]">
        Pick your username
      </h2>
      <p className="mt-1 max-w-[54ch] text-[0.85rem] text-subtle leading-relaxed">
        Your account was made before usernames existed, so you have not got one
        yet. It is how friends find you, and it is permanent once set.
      </p>
      <div className="mt-4 flex max-w-md flex-col gap-3">
        <UsernameField
          autoFocus={false}
          value={username}
          onChange={(next) => {
            setUsername(next);
            setError(null);
          }}
          onAvailability={setFree}
        />
        {error && (
          <p role="alert" className="text-[0.82rem] text-destructive">
            {error}
          </p>
        )}
        <Button
          onClick={claim}
          disabled={pending || !free}
          className="self-start gap-1.5"
        >
          {pending && <Loader2 className="size-4 animate-spin" />}
          {pending ? "Saving…" : "Take it"}
        </Button>
      </div>
    </section>
  );
}
