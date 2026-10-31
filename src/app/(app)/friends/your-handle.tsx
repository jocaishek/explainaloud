"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import type { You } from "./types";

/** How long the button says "Copied" before going back to offering to copy. */
const COPIED_MS = 1600;

/**
 * Your handle, and a way to hand it to somebody.
 *
 * This card exists because of a question the feature could not answer: a
 * person adds friends by username, and had no way to find out what their own
 * one was, let alone hand it to somebody. Your streak and topic count live in
 * the ranked list now, in your own row, beside everybody else's.
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
    <section aria-labelledby="invite-heading">
      <Card className="gap-0 p-6">
        <h2
          id="invite-heading"
          className="font-medium text-lg text-strong leading-6"
        >
          Invite a friend
        </h2>
        <p className="mt-1 text-sm text-subtle leading-5">
          Friends find you by your username. Send them the link and
          they&rsquo;ll land on your profile
        </p>

        <div className="mt-4 flex items-center justify-between gap-3 rounded-control border border-border bg-background py-2 pr-2 pl-3.5">
          <code className="min-w-0 truncate font-mono text-sm text-strong">
            {you.username ? `@${you.username}` : "—"}
          </code>
          {you.username && (
            <Button
              size="sm"
              onClick={copy}
              aria-label={`Copy a link to your profile, @${you.username}`}
            >
              {copied ? (
                <Check aria-hidden className="size-3.5" />
              ) : (
                <Copy aria-hidden className="size-3.5" />
              )}
              {copied ? "Copied" : "Copy link"}
            </Button>
          )}
          {/* Announced rather than only drawn, because the label swap is the
              entire feedback and a screen reader cannot see it. */}
          <span aria-live="polite" className="sr-only">
            {copied ? "Link copied" : ""}
          </span>
        </div>
      </Card>
    </section>
  );
}
