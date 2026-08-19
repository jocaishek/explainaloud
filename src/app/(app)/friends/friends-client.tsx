"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, Check, Loader2, Search, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState, useTransition } from "react";
import { UsernameField } from "~/app/onboarding/username-field";
import { PersonAvatar } from "~/components/person-avatar";
import { StreakFlame } from "~/components/streak-flame";
import { Button } from "~/components/ui/button";
import { streakLabel } from "~/lib/streak";
import { cn } from "~/lib/utils";
import { claimUsername, removeFriendship, respondToRequest } from "./actions";
import { FriendSearch } from "./friend-search";
import type { Friend, PendingRequest, You } from "./types";
import { YourHandle } from "./your-handle";

const EASE = [0.23, 1, 0.32, 1] as const;

/**
 * The friends screen.
 *
 * Four regions, in the order somebody needs them: who you are and how to be
 * found, who is waiting on an answer, the search that adds more, then the list
 * itself. Requests come before search because they are the only part of this
 * page with a deadline attached; everything else is still there tomorrow.
 *
 * What a friend shows is two facts and no more: how many topics they have
 * built, and how many days in a row they have recorded. That is the whole of
 * what somebody agreed to share by accepting, and it is enforced in the
 * database rather than by this file choosing not to render the rest — see
 * `friend_overview`.
 *
 * **Written in words, not in field labels.** An earlier version set every
 * figure under tracked uppercase mono — STREAK, TOPICS, YOUR STREAK — and the
 * page read as a database admin screen about people rather than a page for
 * them. `design.md` reserves that voice for metadata and timecodes and
 * specifically forbids it for naming a region somebody is reading. So a number
 * is said the way a person would say it: nine day streak, twelve topics.
 */
export function FriendsClient({
  you,
  friends,
  requests,
  loadFailed,
}: {
  you: You;
  friends: Friend[];
  requests: PendingRequest[];
  /** A read that failed, as distinct from a person with no friends. */
  loadFailed: boolean;
}) {
  const router = useRouter();
  const refresh = useCallback(() => router.refresh(), [router]);
  const needsUsername = !you.username;
  const searchRef = useRef<HTMLInputElement>(null);

  const focusSearch = useCallback(() => {
    const field = searchRef.current;
    if (!field) return;
    /* Scrolled to as well as focused. On a short window the search sits above
       the fold of the empty state that sent you to it, and a caret you cannot
       see is indistinguishable from a button that did nothing. */
    field.scrollIntoView({ block: "center", behavior: "smooth" });
    field.focus({ preventScroll: true });
  }, []);

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
        <h1 className="font-display text-[clamp(1.8rem,3.4vw,2.6rem)] text-strong leading-[1.05] tracking-[-0.035em]">
          Friends
        </h1>
        <p className="mt-2.5 max-w-[52ch] text-[1.02rem] text-subtle leading-relaxed">
          {friends.length === 0
            ? "Add somebody and you will each see two things about the other: how many topics they have built, and how long their run is. Nothing you have said."
            : "Who else is showing up, and how long they have kept it going."}
        </p>
      </header>

      {needsUsername ? (
        <div data-rise="">
          <ClaimUsername onClaimed={refresh} />
        </div>
      ) : (
        <div data-rise="">
          <YourHandle you={you} />
        </div>
      )}

      {loadFailed && (
        <div
          role="alert"
          data-rise=""
          className="flex items-start gap-3 rounded-card border border-border bg-card p-5 shadow-rest"
        >
          <AlertTriangle
            aria-hidden
            className="mt-0.5 size-4 shrink-0 text-[color:var(--miss)]"
          />
          <div>
            <p className="font-medium text-[0.95rem] text-strong">
              Couldn&rsquo;t load your friends
            </p>
            <p className="mt-1 max-w-[52ch] text-[0.88rem] text-subtle leading-relaxed">
              This is a problem at our end rather than an empty list. Reload the
              page, and if it keeps happening the list is still there.
            </p>
          </div>
        </div>
      )}

      {/* Both directions in one panel.
       *
       * They were two cards, and two cards a few pixels apart with near
       * identical headings is how a page starts feeling like a form. They are
       * the same thing seen from two ends — a request that has not been
       * answered — so they are one panel with the half that needs you at the
       * top of it. */}
      {(incoming.length > 0 || outgoing.length > 0) && (
        <section data-rise="" aria-labelledby="friend-requests-heading">
          <div className="overflow-hidden rounded-card border border-border bg-card shadow-rest">
            <div className="flex items-center gap-2.5 border-border border-b px-6 py-5">
              <h2
                id="friend-requests-heading"
                className="font-semibold text-[1.1rem] text-strong tracking-[-0.015em]"
              >
                {incoming.length > 0 ? "Waiting on you" : "You asked"}
              </h2>
              {incoming.length > 0 && (
                <span className="rounded-pill bg-accent-wash px-2.5 py-0.5 font-medium text-[0.78rem] text-brand-ink tabular-nums">
                  {incoming.length}
                </span>
              )}
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

            {outgoing.length > 0 && (
              <>
                {incoming.length > 0 && (
                  <p className="border-border border-t bg-surface px-6 py-2.5 text-[0.82rem] text-subtle">
                    You asked, and they have not answered yet
                  </p>
                )}
                <ul className="divide-y divide-border border-border border-t">
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
              </>
            )}
          </div>
        </section>
      )}

      <div data-rise="">
        <FriendSearch onChanged={refresh} inputRef={searchRef} />
      </div>

      <section data-rise="" aria-labelledby="friend-list-heading">
        <h2
          id="friend-list-heading"
          className="mb-4 font-semibold text-[1.1rem] text-strong tracking-[-0.015em]"
        >
          {friends.length > 0
            ? `Your friends (${friends.length})`
            : "Your friends"}
        </h2>

        {ranked.length === 0 ? (
          /* Not a dashed box with an icon and a grey sentence in it.
           *
           * That shape is the single most recognisable placeholder in software
           * and it says nothing: an outline of a thing that is not there, and
           * a line of help text at the size of a footnote. An empty screen is
           * the one screen with nothing competing for the space, so it can
           * afford the page's actual argument at the size an argument
           * deserves — one line, the emphasis carried by colour and weight
           * rather than by a second typeface, and exactly one thing to press. */
          <div className="rounded-card border border-border bg-card px-6 py-12 shadow-rest sm:px-10 sm:py-14">
            <div className="max-w-[34rem]">
              <h3 className="font-display text-[clamp(1.5rem,3.4vw,2.3rem)] text-strong leading-[1.08] tracking-[-0.035em]">
                Study alone, or{" "}
                <span className="text-brand-ink">not alone</span>.
              </h3>
              <p className="mt-4 text-[0.98rem] text-subtle leading-relaxed">
                Add somebody by their username and you will each see two things
                about the other: topics built, and days in a row. Not your
                recordings, not your scores, and nothing you have said.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3">
                <Button onClick={focusSearch} className="gap-1.5">
                  <Search className="size-4" />
                  Find someone
                </Button>
                {you.username && (
                  <p className="text-[0.88rem] text-subtle">
                    Or give them yours:{" "}
                    <span className="font-mono text-strong">
                      @{you.username}
                    </span>
                  </p>
                )}
              </div>
            </div>
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

/**
 * Somebody's name and face, as a way of getting to their page.
 *
 * A `span` inside rather than a `div`, because this is an anchor and an anchor
 * may not contain block content — the browser silently reparents a `div` out
 * of it and the layout falls apart on the one screen nobody checked.
 *
 * Renders as plain text for an account with no username, which every account
 * made before usernames existed still is. There is no page to send anybody to,
 * and a link that goes nowhere is worse than no link.
 */
function PersonLink({
  username,
  className,
  children,
}: {
  username: string | null;
  className?: string;
  children: React.ReactNode;
}) {
  if (!username) {
    return (
      <span className={cn("flex min-w-0 items-center gap-3.5", className)}>
        {children}
      </span>
    );
  }
  return (
    <Link
      href={`/profiles/${username}`}
      className={cn(
        "press flex min-w-0 items-center gap-3.5 rounded-control transition-opacity hover:opacity-80",
        "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[color:var(--accent-ring)]",
        className,
      )}
    >
      {children}
    </Link>
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
      className="flex flex-wrap items-center gap-x-4 gap-y-2 px-6 py-4"
    >
      {/* The whole identity block is the link, not the name alone: a request
          from somebody you do not recognise is exactly when you want to look
          at them before answering, and a four-word hit target inside a row is
          not an invitation to. */}
      <PersonLink username={request.username} className="min-w-0 flex-1">
        <PersonAvatar
          firstName={request.first_name}
          lastName={request.last_name}
          avatarUrl={request.avatar_url}
          size={44}
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium text-[0.98rem] text-strong">
            {request.first_name} {request.last_name}
          </span>
          <span className="block truncate font-mono text-[0.75rem] text-subtle">
            @{request.username}
          </span>
        </span>
      </PersonLink>

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

      {error && (
        <p role="alert" className="w-full text-[0.8rem] text-destructive">
          {error}
        </p>
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
      <PersonLink username={friend.username}>
        <PersonAvatar
          firstName={friend.first_name}
          lastName={friend.last_name}
          avatarUrl={friend.avatar_url}
          size={52}
        />
        <span className="min-w-0">
          <span className="block truncate font-medium text-[1rem] text-strong">
            {friend.first_name} {friend.last_name}
          </span>
          <span className="block truncate font-mono text-[0.75rem] text-subtle">
            @{friend.username}
          </span>
        </span>
      </PersonLink>

      {/* Two sentences, not two labelled fields. "9 day streak" is how a
          person says it; a column headed STREAK with a 9 under it is how a
          table says it, and this is a card about somebody you know. */}
      <div className="mt-5 flex flex-col gap-2 border-border border-t pt-4">
        <p className="flex items-center gap-2 text-[0.95rem]">
          {friend.streak > 0 ? (
            <>
              <StreakFlame size="sm" />
              <span>
                <span className="font-semibold text-strong tabular-nums">
                  {friend.streak}
                </span>
                <span className="text-subtle">
                  {friend.streak === 1 ? " day streak" : " day streak"}
                </span>
              </span>
            </>
          ) : (
            <span className="text-subtle">{streakLabel(friend.streak)}</span>
          )}
        </p>
        <p className="text-[0.95rem]">
          <span className="font-semibold text-strong tabular-nums">
            {friend.topics}
          </span>
          <span className="text-subtle">
            {friend.topics === 1 ? " topic" : " topics"}
          </span>
        </p>
      </div>

      {error && (
        <p role="alert" className="mt-3 text-[0.8rem] text-destructive">
          {error}
        </p>
      )}

      {/* Quiet, and at the bottom. Removing a friend is a thing the card has
          to offer and the last thing it should suggest, so it is plain text
          the weight of a footnote rather than a bordered button competing with
          the person's name. */}
      <div className="mt-auto flex items-center justify-end pt-4">
        {confirming ? (
          <div className="flex items-center gap-2">
            <span className="text-[0.8rem] text-subtle">Remove them?</span>
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
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="press rounded-control px-1 py-0.5 text-[0.78rem] text-subtle underline-offset-4 transition-colors hover:text-destructive hover:underline focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[color:var(--accent-ring)]"
          >
            Remove friend
          </button>
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
    <section className="rounded-card border border-border bg-card p-6 shadow-rest">
      <h2 className="font-semibold text-[1.1rem] text-strong tracking-[-0.015em]">
        Pick your username
      </h2>
      <p className="mt-1.5 max-w-[54ch] text-[0.92rem] text-subtle leading-relaxed">
        Your account was made before usernames existed, so you have not got one
        yet. It is how friends find you, and it is permanent once set.
      </p>
      <div className="mt-5 flex max-w-md flex-col gap-3">
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
          <p role="alert" className="text-[0.85rem] text-destructive">
            {error}
          </p>
        )}
        <Button
          onClick={claim}
          disabled={pending || !free}
          className="gap-1.5 self-start"
        >
          {pending && <Loader2 className="size-4 animate-spin" />}
          {pending ? "Saving…" : "Take it"}
        </Button>
      </div>
    </section>
  );
}
