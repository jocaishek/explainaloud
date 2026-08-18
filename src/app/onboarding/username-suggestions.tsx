"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "~/lib/supabase/client";
import { usernameSuggestions } from "~/lib/username";

/**
 * Two or three handles built from the person's own name, filtered to the ones
 * that are actually free.
 *
 * The checking is the point. A suggestion that turns out to be taken the
 * moment you take it is worse than no suggestion, because it costs a click and
 * teaches you not to trust the next one — so nothing is offered until the
 * database has said it is available. Everything unavailable is dropped
 * silently rather than shown struck through: a list of names you cannot have
 * is not help.
 *
 * It disappears once the field has something in it. These are a way past an
 * empty box, and an empty box is the only problem they solve.
 */
export function UsernameSuggestions({
  firstName,
  lastName,
  onPick,
}: {
  firstName: string;
  lastName: string;
  onPick: (username: string) => void;
}) {
  const [free, setFree] = useState<string[]>([]);
  /* Which round of checking is current, so a slow answer for a name built from
     a half-typed first name cannot land after the real one. */
  const latest = useRef(0);

  useEffect(() => {
    const candidates = usernameSuggestions(firstName, lastName);
    if (candidates.length === 0) {
      setFree([]);
      return;
    }

    const ticket = ++latest.current;
    let cancelled = false;

    (async () => {
      const supabase = createClient();
      const answers = await Promise.all(
        candidates.map(async (candidate) => {
          const { data, error } = await supabase.rpc("username_available", {
            candidate,
          });
          // An unanswered check is not an available name. Offering it would be
          // the exact failure this component exists to avoid.
          return error ? null : data === true ? candidate : null;
        }),
      );
      if (cancelled || ticket !== latest.current) return;
      setFree(answers.filter((name): name is string => name !== null));
    })();

    return () => {
      cancelled = true;
    };
  }, [firstName, lastName]);

  if (free.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[0.8rem] text-subtle">Free right now:</span>
      {free.map((name) => (
        <button
          key={name}
          type="button"
          onClick={() => onPick(name)}
          className="press rounded-pill border border-border bg-surface px-2.5 py-1 font-mono text-[0.75rem] text-strong transition-colors hover:border-[color:var(--accent-ring)] hover:bg-muted focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[color:var(--accent-ring)]"
        >
          @{name}
        </button>
      ))}
    </div>
  );
}
