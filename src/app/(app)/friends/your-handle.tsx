"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { PersonAvatar } from "~/components/person-avatar";
import { StreakFlame } from "~/components/streak-flame";
import { streakLabel } from "~/lib/streak";
import { cn } from "~/lib/utils";
import type { You } from "./types";

/** How long the button says "Copied" before going back to offering to copy. */
const COPIED_MS = 1600;

/**
 * You, at the top of your own friends screen.
 *
 * This card exists because of a question the feature could not answer: a
 * person adds friends by username, and had no way to find out what their own
 * one was, let alone hand it to somebody. The answer was buried on the profile
 * page, one navigation away from the only screen where it is needed.
 *
 * It shows the same two numbers a friend sees, and that is the second reason
 * it is here. A screen that displays other people's streaks and topic counts
 * while showing you something different is a screen where you cannot tell what
 * you are sharing. What you see here is what they see.
 */
export function YourHandle({ you }: { you: You }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  async function copy() {
    if (!you.username) return;
    /* The link, not the bare handle. A handle is what you say out loud; a URL
       is what you paste into a message, and it lands the other person on a
       page with an Add button rather than in a search box they have to find.
       `window.location.origin` rather than a configured site URL, because on a
       preview deployment those disagree and the wrong one is unusable. */
    const handle = `${window.location.origin}/profiles/${you.username}`;
    try {
      /* Guarded rather than assumed. The Clipboard API is undefined on an
         insecure origin, and an unhandled rejection here would take the whole
         page down over a convenience. */
      if (!navigator.clipboard?.writeText) return;
      await navigator.clipboard.writeText(handle);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), COPIED_MS);
    } catch {
      // Refused by the browser, usually because the document was not focused.
      // The handle is on screen and selectable, so nothing is lost.
    }
  }

  return (
    <section
      aria-label="Your profile"
      className="flex flex-col gap-5 rounded-card border border-border bg-card p-6 shadow-rest sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex min-w-0 items-center gap-3.5">
        <PersonAvatar
          firstName={you.firstName}
          lastName={you.lastName}
          avatarUrl={you.avatarUrl}
          size={52}
        />
        <div className="min-w-0">
          <p className="truncate font-medium text-[1.05rem] text-strong">
            {you.firstName} {you.lastName}
          </p>
          {you.username ? (
            <button
              type="button"
              onClick={copy}
              aria-label={`Copy a link to your profile, @${you.username}`}
              className={cn(
                "press -mx-1 mt-0.5 flex items-center gap-1.5 rounded-control px-1 py-0.5 transition-colors",
                "hover:bg-muted focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[color:var(--accent-ring)]",
              )}
            >
              <span className="truncate font-mono text-[0.76rem] text-subtle">
                @{you.username}
              </span>
              {copied ? (
                <Check
                  aria-hidden
                  className="size-3.5 shrink-0 text-[color:var(--ok)]"
                />
              ) : (
                <Copy aria-hidden className="size-3.5 shrink-0 text-subtle" />
              )}
              <span className="whitespace-nowrap text-[0.72rem] text-subtle">
                {copied ? "Link copied" : "Copy link"}
              </span>
              {/* Announced rather than only drawn, because the icon swap is
                  the entire feedback and a screen reader cannot see it. */}
              <span aria-live="polite" className="sr-only">
                {copied ? "Link copied" : ""}
              </span>
            </button>
          ) : (
            <p className="mt-0.5 text-[0.8rem] text-subtle">No username yet</p>
          )}
        </div>
      </div>

      {/* Said, not labelled. This is exactly what a friend sees on your card,
          so it is written the same way there and here: a number and the word
          for what it counts, in the body face, at a size somebody reads. */}
      <p className="flex flex-wrap items-center gap-x-5 gap-y-1 border-border border-t pt-4 text-[0.95rem] sm:border-t-0 sm:pt-0">
        <span className="flex items-center gap-2">
          {you.streak > 0 && <StreakFlame size="sm" />}
          {you.streak > 0 ? (
            <span>
              <span className="font-semibold text-strong tabular-nums">
                {you.streak}
              </span>
              <span className="text-subtle"> day streak</span>
            </span>
          ) : (
            <span className="text-subtle">{streakLabel(you.streak)}</span>
          )}
        </span>
        <span>
          <span className="font-semibold text-strong tabular-nums">
            {you.topics}
          </span>
          <span className="text-subtle">
            {you.topics === 1 ? " topic" : " topics"}
          </span>
        </span>
      </p>
    </section>
  );
}
