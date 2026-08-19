"use client";

import { Check, Loader2, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Input } from "~/components/ui/input";
import { createClient } from "~/lib/supabase/client";
import { USERNAME_MAX, usernameError } from "~/lib/username";
import { cn } from "~/lib/utils";

type Status =
  | { kind: "empty" }
  | { kind: "invalid"; message: string }
  | { kind: "checking" }
  | { kind: "free" }
  | { kind: "taken" }
  | { kind: "unknown" };

/** Long enough that a fast typist makes one request, not eleven. */
const DEBOUNCE_MS = 400;

/**
 * Choosing a name, and finding out it is free before submitting.
 *
 * The check is a courtesy, not the guarantee. Whatever this says, the unique
 * index decides — two people can pass this on the same name in the same second
 * and exactly one of them will get the row. What it buys is that the ordinary
 * case, where somebody picks a name that has been taken for two years, is
 * answered while they are still typing rather than after they submit a form
 * they have to fill in again.
 */
export function UsernameField({
  value,
  onChange,
  onAvailability,
  autoFocus = true,
}: {
  value: string;
  onChange: (next: string) => void;
  /** Lets the step disable Continue while a name is known to be unusable. */
  onAvailability?: (usable: boolean) => void;
  /* On by default, because in onboarding this field is the whole step. Off
     where it is one panel among several: a page that grabs the caret on load
     scrolls itself to wherever the field happens to be. */
  autoFocus?: boolean;
}) {
  const id = useId();
  const [status, setStatus] = useState<Status>({ kind: "empty" });
  /* Which request is current. A slow answer for "obi" must not overwrite a
     fast one for "obiwan" — without this the field tells you a name you are no
     longer typing is taken. */
  const latest = useRef(0);

  useEffect(() => {
    const name = value.trim().toLowerCase();
    if (!name) {
      setStatus({ kind: "empty" });
      onAvailability?.(false);
      return;
    }

    const problem = usernameError(name);
    if (problem) {
      setStatus({ kind: "invalid", message: problem });
      onAvailability?.(false);
      return;
    }

    setStatus({ kind: "checking" });
    onAvailability?.(false);
    const ticket = ++latest.current;

    const timer = setTimeout(async () => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("username_available", {
        candidate: name,
      });
      if (ticket !== latest.current) return;

      if (error) {
        /* Cannot tell. Not "taken", because a network blip must not read as
           somebody else owning the name — and not "free" either, because that
           promises something this component did not verify. The submit still
           runs, and the unique index still decides. */
        setStatus({ kind: "unknown" });
        onAvailability?.(true);
        return;
      }
      setStatus(data === true ? { kind: "free" } : { kind: "taken" });
      onAvailability?.(data === true);
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [value, onAvailability]);

  const message =
    status.kind === "invalid"
      ? status.message
      : status.kind === "taken"
        ? "That one is taken."
        : status.kind === "free"
          ? "Yours."
          : status.kind === "unknown"
            ? "Couldn't check just now. You can still continue."
            : null;

  const tone =
    status.kind === "free"
      ? "text-[color:var(--ok)]"
      : status.kind === "taken" || status.kind === "invalid"
        ? "text-destructive"
        : "text-subtle";

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        {/* The @ is part of the field rather than part of the value. Typing it
            yourself is the first thing everybody does and the first thing every
            form of this kind rejects.
            *
            * It sits tight against the text on purpose. With the old spacing
            * the sign and the example were far enough apart to read as two
            * separate things — a stray glyph, then a word — rather than as one
            * handle, which is the whole thing the prefix exists to show. */}
        <span
          aria-hidden
          className="-translate-y-1/2 absolute top-1/2 left-3.5 text-[1.05rem] text-subtle"
        >
          @
        </span>
        <Input
          id={id}
          autoFocus={autoFocus}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          autoComplete="off"
          maxLength={USERNAME_MAX}
          placeholder="jovannyshek"
          aria-label="Username"
          aria-invalid={status.kind === "invalid" || status.kind === "taken"}
          value={value}
          onChange={(event) => {
            /* Folded on the way in, so the field shows what will be stored.
               Anything the rules forbid is dropped rather than typed and then
               rejected — a name cannot be saved with a space in it, so there is
               nothing gained by letting one appear. */
            onChange(
              event.target.value
                .toLowerCase()
                .replace(/[^a-z0-9]/g, "")
                .slice(0, USERNAME_MAX),
            );
          }}
          className="h-12 bg-surface pr-11 pl-[1.85rem] text-base placeholder:text-subtle"
        />
        <span className="-translate-y-1/2 absolute top-1/2 right-4">
          {status.kind === "checking" && (
            <Loader2 aria-hidden className="size-4 animate-spin text-subtle" />
          )}
          {status.kind === "free" && (
            <Check aria-hidden className="size-4 text-[color:var(--ok)]" />
          )}
          {(status.kind === "taken" || status.kind === "invalid") && (
            <X aria-hidden className="size-4 text-destructive" />
          )}
        </span>
      </div>

      <p
        aria-live="polite"
        className={cn("min-h-[1.25rem] text-[0.82rem]", tone)}
      >
        {message ?? "Letters and numbers. Friends find you by this."}
      </p>
    </div>
  );
}
