"use client";

import { Check, Clock, Loader2, Search, UserPlus, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { PersonAvatar } from "~/components/person-avatar";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { createClient } from "~/lib/supabase/client";
import { respondToRequest, sendFriendRequest } from "./actions";
import type { PersonStatus, SearchResult } from "./types";

/** Long enough that typing a username is one request, not nine. */
const DEBOUNCE_MS = 300;
/** The database refuses to answer below this, and says so here first. */
const MIN_QUERY = 2;

/**
 * Somebody typing an address into this box, which everybody tries once.
 *
 * Worth answering directly rather than with "nobody by that name", because
 * that reply is true and completely misleading: the person almost certainly
 * does have an account. You cannot find them this way by design, and saying so
 * is both the accurate answer and the one that explains why.
 */
function looksLikeEmail(value: string) {
  return /\S+@\S+/.test(value);
}

/**
 * Finding somebody, by their username or by their name.
 *
 * Both, in one field, because a person looking for a friend does not know
 * which of the two they are about to type — and a screen that makes them
 * choose a mode first is a screen that has moved its own problem onto them.
 * The database sorts an exact username hit above a prefix above a name match,
 * so typing a full username puts that person first even when four people share
 * a first name with them.
 *
 * Every result says where it already stands with you. A list where every row
 * offers "Add", including the people you are already friends with, produces a
 * duplicate-key error as its answer to a perfectly reasonable click.
 */
export function FriendSearch({
  onChanged,
  inputRef,
}: {
  onChanged: () => void;
  /* Held by the screen above, so the empty state's one action can put the
     caret in this field. A button that says "find someone" and then leaves
     somebody to locate the box themselves has done half a job. */
  inputRef?: React.RefObject<HTMLInputElement | null>;
}) {
  const id = useId();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [failed, setFailed] = useState(false);
  /* Which request is current. A slow answer for "obi" must not overwrite a
     fast one for "obiwan". */
  const latest = useRef(0);

  const emailTyped = looksLikeEmail(query);

  useEffect(() => {
    const term = query.trim();
    /* An address can never match: a username cannot contain `@`, and the name
       columns hold names. Skipping the round trip means the answer is instant
       and the server is not asked a question with a known answer. */
    if (looksLikeEmail(term) || term.length < MIN_QUERY) {
      setResults(null);
      setSearching(false);
      setFailed(false);
      return;
    }

    setSearching(true);
    setFailed(false);
    const ticket = ++latest.current;

    const timer = setTimeout(async () => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("search_people", {
        query: term,
      });
      if (ticket !== latest.current) return;
      setSearching(false);
      if (error) {
        console.error("Searching for people failed:", error);
        setFailed(true);
        setResults(null);
        return;
      }
      setResults((data ?? []) as SearchResult[]);
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query]);

  /* Applied on top of whatever the last search returned, so a row that has
     just been added says so without a second round trip to find out. */
  function restate(userId: string, status: PersonStatus) {
    setResults((previous) =>
      previous
        ? previous.map((row) =>
            row.user_id === userId ? { ...row, status } : row,
          )
        : previous,
    );
  }

  return (
    <section
      aria-labelledby={`${id}-heading`}
      className="overflow-hidden rounded-card border border-border bg-card shadow-rest"
    >
      <div className="border-border border-b px-6 py-5">
        <h2
          id={`${id}-heading`}
          className="font-semibold text-[1.1rem] text-strong tracking-[-0.015em]"
        >
          Find someone
        </h2>
        <p className="mt-1.5 text-[0.92rem] text-subtle leading-relaxed">
          Their username, or the name they signed up with.
        </p>

        <div className="relative mt-4">
          <Search
            aria-hidden
            className="-translate-y-1/2 absolute top-1/2 left-3.5 size-4 text-subtle"
          />
          <Input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            aria-label="Search for someone"
            placeholder="obiwankanobi, or Obi-Wan Kenobi"
            className="h-11 bg-surface pr-10 pl-10 text-base placeholder:text-subtle"
          />
          {searching && (
            <Loader2
              aria-hidden
              className="-translate-y-1/2 absolute top-1/2 right-3.5 size-4 animate-spin text-subtle"
            />
          )}
          {!searching && query.length > 0 && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear the search"
              className="press -translate-y-1/2 absolute top-1/2 right-2.5 flex size-7 items-center justify-center rounded-control text-subtle transition-colors hover:bg-muted hover:text-strong"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      <div aria-live="polite">
        {emailTyped && (
          <p className="px-6 py-5 text-[0.9rem] text-subtle leading-relaxed">
            People are not searchable by email address, so that nobody can work
            out who holds one. Ask them for their username instead.
          </p>
        )}

        {!emailTyped && failed && (
          <p className="px-6 py-5 text-[0.9rem] text-subtle">
            Couldn&rsquo;t search just now. Try again in a moment.
          </p>
        )}

        {!emailTyped && !failed && results?.length === 0 && (
          <p className="px-6 py-5 text-[0.9rem] text-subtle">
            Nobody by that name. Usernames are exact, so it is worth checking
            the spelling.
          </p>
        )}

        {!emailTyped && !failed && results && results.length > 0 && (
          <ul className="divide-y divide-border">
            {results.map((person) => (
              <li key={person.user_id}>
                <ResultRow
                  person={person}
                  onChanged={onChanged}
                  onStatus={(status) => restate(person.user_id, status)}
                />
              </li>
            ))}
          </ul>
        )}

        {!emailTyped &&
          !failed &&
          !results &&
          query.trim().length > 0 &&
          query.trim().length < MIN_QUERY && (
            <p className="px-6 py-5 text-[0.9rem] text-subtle">
              Two letters or more.
            </p>
          )}
      </div>
    </section>
  );
}

function ResultRow({
  person,
  onChanged,
  onStatus,
}: {
  person: SearchResult;
  onChanged: () => void;
  onStatus: (status: PersonStatus) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState<string | null>(null);

  function add() {
    startTransition(async () => {
      const result = await sendFriendRequest(person.user_id);
      setNote(result.ok ? null : result.message);
      if (result.ok) {
        /* Adding somebody who had already asked *you* accepts instead, so the
           row can come back as either. The action says which. */
        onStatus(result.status ?? "outgoing");
        onChanged();
      }
    });
  }

  function accept() {
    const requestId = person.request_id;
    if (!requestId) return;
    startTransition(async () => {
      const result = await respondToRequest(requestId, true);
      setNote(result.ok ? null : result.message);
      if (result.ok) {
        onStatus("friends");
        onChanged();
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-6 py-4">
      {/* Straight to their page. Deciding whether to add somebody from one
          line of a result list is deciding on a name and a handle, which for
          two people with the same name is not a decision at all. */}
      <Link
        href={`/profiles/${person.username}`}
        className="press flex min-w-0 flex-1 items-center gap-3 rounded-control transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[color:var(--accent-ring)]"
      >
        <PersonAvatar
          firstName={person.first_name}
          lastName={person.last_name}
          avatarUrl={person.avatar_url}
          size={44}
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium text-[0.92rem] text-strong">
            {person.first_name} {person.last_name}
          </span>
          <span className="block truncate font-mono text-[0.72rem] text-subtle">
            @{person.username}
          </span>
        </span>
      </Link>
      {note && (
        <p role="alert" className="text-[0.78rem] text-destructive">
          {note}
        </p>
      )}

      {person.status === "none" && (
        <Button size="sm" onClick={add} disabled={pending} className="gap-1.5">
          {pending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <UserPlus className="size-3.5" />
          )}
          Add
        </Button>
      )}

      {person.status === "incoming" && (
        <Button
          size="sm"
          onClick={accept}
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
      )}

      {person.status === "outgoing" && (
        <span className="flex items-center gap-1.5 whitespace-nowrap text-[0.8rem] text-subtle">
          <Clock aria-hidden className="size-3.5" />
          Asked
        </span>
      )}

      {person.status === "friends" && (
        <span className="flex items-center gap-1.5 whitespace-nowrap text-[0.8rem] text-subtle">
          <Check aria-hidden className="size-3.5" />
          Friends
        </span>
      )}
    </div>
  );
}
