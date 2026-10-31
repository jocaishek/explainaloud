"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, Loader2, Search, UserMinus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState, useTransition } from "react";
import { PersonAvatar } from "~/components/person-avatar";
import { StreakFlame } from "~/components/streak-flame";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { cn } from "~/lib/utils";
import { removeFriendship, respondToRequest } from "./actions";
import { FriendSearch } from "./friend-search";
import type { Friend, PendingRequest, You } from "./types";
import { YourHandle } from "./your-handle";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * The friends screen.
 *
 * The list is the page: a ranked column twice the width of the one beside it,
 * with you placed in it by the same rule as everybody else. Requests and the
 * invite sit in the narrower column because they are things you visit, and the
 * search lives in the header because it is the way more people get onto the
 * list rather than a region of its own.
 *
 * What a friend shows is two facts and no more: how many topics they have
 * built, and how many days in a row they have recorded. That is the whole of
 * what somebody agreed to share by accepting, and it is enforced in the
 * database rather than by this file choosing not to render the rest — see
 * `friend_overview`. Your own row shows the same two, so what you see is what
 * they see.
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

  /* Longest run first, you included. Sorted here rather than in SQL because
     ordering by the streak there means computing every friend's streak twice,
     once to rank the rows and once to return them. */
  const ranked: Ranked[] = [
    ...friends.map((friend) => ({ kind: "friend" as const, friend })),
    { kind: "you" as const },
  ].sort((a, b) => {
    const streakA = a.kind === "you" ? you.streak : a.friend.streak;
    const streakB = b.kind === "you" ? you.streak : b.friend.streak;
    const nameA = a.kind === "you" ? you.firstName : a.friend.first_name;
    const nameB = b.kind === "you" ? you.firstName : b.friend.first_name;
    return streakB - streakA || nameA.localeCompare(nameB);
  });

  return (
    <div className="mx-auto w-full max-w-[90rem] px-4 pt-8 pb-32 sm:px-8">
      <header
        data-rise=""
        className="flex flex-wrap items-end justify-between gap-6"
      >
        <div className="min-w-0">
          <h1 className="font-normal text-[2rem] text-strong leading-10 tracking-[-0.03em] md:text-[2.5rem] md:leading-[3rem]">
            Friends
          </h1>
          <p className="mt-1 text-base text-subtle">
            Who else is showing up, and how long they&rsquo;ve kept it going
          </p>
        </div>
        <FriendSearch
          friends={friends}
          requests={requests}
          onChanged={refresh}
          inputRef={searchRef}
        />
      </header>

      {loadFailed && (
        <div
          role="alert"
          data-rise=""
          className="mt-8 flex items-start gap-3 rounded-card border border-border bg-card p-6 shadow-rest"
        >
          <AlertTriangle
            aria-hidden
            className="mt-0.5 size-4 shrink-0 text-destructive"
          />
          <div>
            <p className="font-medium text-[0.95rem] text-strong">
              Couldn&rsquo;t load your friends
            </p>
            <p className="mt-1 max-w-[52ch] text-sm text-subtle leading-relaxed">
              This is a problem at our end rather than an empty list. Reload the
              page, and if it keeps happening the list is still there.
            </p>
          </div>
        </div>
      )}

      <div
        data-rise=""
        className="mt-8 grid items-start gap-4 min-[75rem]:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]"
      >
        <section aria-labelledby="friend-list-heading">
          <Card className="gap-0 p-6">
            <div className="flex items-baseline justify-between gap-3">
              <h2
                id="friend-list-heading"
                className="font-medium text-lg text-strong leading-6"
              >
                Your friends
              </h2>
              {friends.length > 0 && (
                <span className="text-sm text-subtle tabular-nums">
                  {friends.length}
                </span>
              )}
            </div>

            {friends.length === 0 ? (
              <EmptyState you={you} onFind={focusSearch} />
            ) : (
              <>
                <ol className="mt-3">
                  {ranked.map((entry, index) => (
                    <li
                      key={entry.kind === "you" ? "you" : entry.friend.user_id}
                      className="border-border border-t first:border-t-0 data-you:border-t-transparent [[data-you]+&]:border-t-transparent"
                      data-you={entry.kind === "you" ? "" : undefined}
                    >
                      {entry.kind === "you" ? (
                        <YouRow rank={index + 1} you={you} />
                      ) : (
                        <FriendRow
                          rank={index + 1}
                          friend={entry.friend}
                          onChanged={refresh}
                        />
                      )}
                    </li>
                  ))}
                </ol>
                <p className="mt-3 text-[0.8125rem] text-subtle">
                  Ranked by streak. Only friends see each other here
                </p>
              </>
            )}
          </Card>
        </section>

        <aside className="flex flex-col gap-4">
          {(incoming.length > 0 || outgoing.length > 0) && (
            <section aria-labelledby="friend-requests-heading">
              <Card className="gap-0 p-6">
                <div className="flex items-baseline justify-between gap-3">
                  <h2
                    id="friend-requests-heading"
                    className="font-medium text-lg text-strong leading-6"
                  >
                    Requests
                  </h2>
                  {incoming.length > 0 && (
                    <span className="rounded-pill bg-accent-wash px-2.5 py-0.5 font-medium text-brand-ink text-xs tabular-nums">
                      {incoming.length}
                    </span>
                  )}
                </div>

                {incoming.length > 0 && (
                  <>
                    <p className="mt-4 text-[0.8125rem] text-subtle">
                      Waiting on you
                    </p>
                    <ul>
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
                  </>
                )}

                {outgoing.length > 0 && (
                  <>
                    <p className="mt-4 text-[0.8125rem] text-subtle">
                      You asked
                    </p>
                    <ul>
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
              </Card>
            </section>
          )}

          <YourHandle you={you} />
        </aside>
      </div>
    </div>
  );
}

type Ranked = { kind: "you" } | { kind: "friend"; friend: Friend };

/* Not a dashed box with an icon and a grey sentence in it. An empty list is
   the one moment with nothing competing for the space, so it can afford the
   page's actual argument. */
function EmptyState({ you, onFind }: { you: You; onFind: () => void }) {
  return (
    <div className="mt-4 max-w-[32rem] pb-2">
      <p className="font-medium text-[1.375rem] text-strong leading-7 tracking-[-0.02em]">
        Study alone, or <span className="text-brand-ink">not alone</span>.
      </p>
      <p className="mt-3 text-[0.95rem] text-subtle leading-relaxed">
        Add somebody by their username and you will each see two things about
        the other: topics built, and days in a row. Not your recordings, not
        your scores, and nothing you have said.
      </p>
      <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
        <Button onClick={onFind} className="gap-1.5">
          <Search className="size-4" />
          Find someone
        </Button>
        {you.username && (
          <p className="text-sm text-subtle">
            Or give them yours:{" "}
            <span className="font-mono text-strong">@{you.username}</span>
          </p>
        )}
      </div>
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
      <span className={cn("flex min-w-0 items-center gap-3", className)}>
        {children}
      </span>
    );
  }
  return (
    <Link
      href={`/profiles/${username}`}
      className={cn(
        "press flex min-w-0 items-center gap-3 rounded-control transition-opacity duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] hover:opacity-80",
        "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[color:var(--accent-ring)]",
        className,
      )}
    >
      {children}
    </Link>
  );
}

function Identity({ name, handle }: { name: string; handle: string | null }) {
  return (
    <span className="min-w-0">
      <span className="block truncate font-medium text-[0.9375rem] text-strong leading-5">
        {name}
      </span>
      <span className="block truncate font-mono text-subtle text-xs leading-5">
        {handle ? `@${handle}` : "—"}
      </span>
    </span>
  );
}

/** The two numbers, as a friend sees them. */
function Stats({ streak, topics }: { streak: number; topics: number }) {
  return (
    <span className="flex shrink-0 items-center gap-4 text-sm">
      <span
        className="flex w-12 items-center justify-end gap-1 tabular-nums"
        title={streak > 0 ? `${streak} day streak` : "No streak running"}
      >
        {streak > 0 ? (
          <>
            <StreakFlame size="sm" className="size-4" />
            <span className="font-medium text-strong">{streak}</span>
          </>
        ) : (
          <span className="text-subtle">0</span>
        )}
        <span className="sr-only"> day streak</span>
      </span>
      <span className="hidden w-20 text-right sm:block">
        <span className="font-medium text-strong tabular-nums">{topics}</span>
        <span className="text-subtle">
          {topics === 1 ? " topic" : " topics"}
        </span>
      </span>
    </span>
  );
}

function Rank({ n }: { n: number }) {
  return (
    <span className="w-6 shrink-0 text-right font-mono text-subtle text-xs tabular-nums">
      {n}
    </span>
  );
}

function YouRow({ rank, you }: { rank: number; you: You }) {
  return (
    <div className="-mx-3 flex items-center gap-4 rounded-control bg-muted px-3 py-3">
      <Rank n={rank} />
      <PersonLink username={you.username} className="flex-1">
        <PersonAvatar
          firstName={you.firstName}
          lastName={you.lastName}
          avatarUrl={you.avatarUrl}
          size={36}
        />
        <Identity name="You" handle={you.username} />
      </PersonLink>
      <Stats streak={you.streak} topics={you.topics} />
      {/* Holds the column the remove control takes on every other row. */}
      <span aria-hidden className="size-8 shrink-0" />
    </div>
  );
}

function FriendRow({
  rank,
  friend,
  onChanged,
}: {
  rank: number;
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
    <div className="py-3">
      <div className="flex items-center gap-4">
        <Rank n={rank} />
        <PersonLink username={friend.username} className="flex-1">
          <PersonAvatar
            firstName={friend.first_name}
            lastName={friend.last_name}
            avatarUrl={friend.avatar_url}
            size={36}
          />
          <Identity
            name={`${friend.first_name} ${friend.last_name}`}
            handle={friend.username}
          />
        </PersonLink>
        <Stats streak={friend.streak} topics={friend.topics} />
        {/* Quiet, and last. Removing a friend is a thing the row has to offer
            and the last thing it should suggest. */}
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={() => setConfirming(true)}
          disabled={confirming}
          aria-label={`Remove ${friend.first_name} ${friend.last_name}`}
          title="Remove friend"
          className="text-subtle hover:text-strong"
        >
          <UserMinus className="size-4" />
        </Button>
      </div>

      {confirming && (
        <div className="mt-2 flex flex-wrap items-center justify-end gap-2 pl-10">
          <span className="text-[0.8125rem] text-subtle">
            Remove {friend.first_name} from your friends?
          </span>
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
      )}

      {error && (
        <p role="alert" className="mt-2 pl-10 text-destructive text-xs">
          {error}
        </p>
      )}
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
      exit={reduced ? { opacity: 0 } : { opacity: 0, x: 8 }}
      transition={{ duration: reduced ? 0.1 : 0.3, ease: EASE }}
      className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-border border-t py-3 first:border-t-0"
    >
      {/* The whole identity block is the link: a request from somebody you do
          not recognise is exactly when you want to look at them first. */}
      <PersonLink username={request.username} className="flex-1">
        <PersonAvatar
          firstName={request.first_name}
          lastName={request.last_name}
          avatarUrl={request.avatar_url}
          size={36}
        />
        <Identity
          name={`${request.first_name} ${request.last_name}`}
          handle={request.username}
        />
      </PersonLink>

      {request.direction === "incoming" ? (
        <div className="flex shrink-0 items-center gap-2">
          <Button size="sm" onClick={() => answer(true)} disabled={pending}>
            {pending && <Loader2 className="size-3.5 animate-spin" />}
            Accept
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => answer(false)}
            disabled={pending}
            aria-label={`Decline ${request.first_name}`}
          >
            Decline
          </Button>
        </div>
      ) : (
        <Button
          size="sm"
          variant="outline"
          onClick={cancel}
          disabled={pending}
          className="shrink-0"
        >
          Cancel
        </Button>
      )}

      {error && (
        <p role="alert" className="w-full text-destructive text-xs">
          {error}
        </p>
      )}
    </motion.li>
  );
}
