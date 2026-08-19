"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";
import { useActionState, useEffect, useId, useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { USE_TYPE_LABELS, USE_TYPES } from "~/lib/profile";
import type { Profile } from "~/lib/supabase/server";
import { cn } from "~/lib/utils";
import { type ProfileFormState, updateProfile } from "./actions";

const EASE = [0.23, 1, 0.32, 1] as const;

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

export function ProfileForm({ profile }: { profile: Profile }) {
  const firstNameId = useId();
  const lastNameId = useId();
  const dobId = useId();
  const usernameId = useId();
  const [useType, setUseType] = useState(profile.use_type);

  const [state, formAction, pending] = useActionState<
    ProfileFormState,
    FormData
  >(updateProfile, { error: null, saved: false });

  // "Saved" is an acknowledgement, not a state — it should fade on its own
  // rather than sit there until the next submit.
  const [showSaved, setShowSaved] = useState(false);
  useEffect(() => {
    if (!state.saved) return;
    setShowSaved(true);
    const id = setTimeout(() => setShowSaved(false), 2600);
    return () => clearTimeout(id);
  }, [state.saved]);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="useType" value={useType} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor={firstNameId}>First name</Label>
          <Input
            id={firstNameId}
            name="firstName"
            autoComplete="given-name"
            defaultValue={profile.first_name}
            className="h-11"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={lastNameId}>Last name</Label>
          <Input
            id={lastNameId}
            name="lastName"
            autoComplete="family-name"
            defaultValue={profile.last_name}
            className="h-11"
          />
        </div>
      </div>

      {/* Shown, not editable, and the same is true of the username above it.
       *
       * Both are set once during onboarding. A username is how other people
       * find and recognise you, so one that can be swapped later is a way of
       * becoming somebody else after the friend list has already learned who
       * you are. A date of birth is what gates the account at thirteen, and
       * a field anybody can rewrite is not something an age check can lean
       * on.
       *
       * Removing the inputs is the smaller half of this. The database
       * refuses the write as well, because an update goes through PostgREST
       * with the caller's own token and the policy quite correctly lets
       * somebody write their own row — so a field that is only absent from a
       * form is a field anybody can still set from a console. */}
      <dl className="flex max-w-md flex-col gap-4">
        <div className="flex flex-col gap-1">
          <dt id={usernameId} className="font-medium text-sm text-strong">
            Username
          </dt>
          <dd className="flex items-baseline gap-2">
            <span className="text-[1rem] text-strong">
              @{profile.username ?? "—"}
            </span>
            <span className="text-[0.78rem] text-subtle">
              Permanent. Friends find you by this.
            </span>
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt id={dobId} className="font-medium text-sm text-strong">
            Date of birth
          </dt>
          <dd className="flex items-baseline gap-2">
            <span className="text-[1rem] text-strong">
              {formatDateOfBirth(profile.date_of_birth)}
            </span>
            <span className="text-[0.78rem] text-subtle">Permanent.</span>
          </dd>
        </div>
      </dl>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium text-strong">
          Using it for
        </legend>
        <div className="flex flex-wrap gap-2">
          {USE_TYPES.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={useType === option}
              onClick={() => setUseType(option)}
              className={cn(
                "rounded-control border px-4 py-2 text-sm font-medium transition-[border-color,background-color,color,transform] duration-200 ease-out active:scale-[0.97]",
                useType === option
                  ? "border-brand bg-brand/10 text-strong"
                  : "border-border bg-surface text-subtle hover:border-brand/40 hover:text-strong",
              )}
            >
              {USE_TYPE_LABELS[option].title}
            </button>
          ))}
        </div>
      </fieldset>

      <AnimatePresence>
        {state.error && (
          <motion.p
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: EASE }}
            role="alert"
            className="text-sm text-destructive"
          >
            {state.error}
          </motion.p>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-3">
        <Button
          type="submit"
          disabled={pending}
          className="h-10 rounded-control bg-accent-solid px-5 font-semibold text-accent-contrast transition-transform duration-200 ease-out hover:bg-accent-solid-hover active:scale-[0.97]"
        >
          {pending ? "Saving…" : "Save changes"}
        </Button>

        <AnimatePresence>
          {showSaved && (
            <motion.span
              initial={{ opacity: 0, scale: 0.95, x: -4 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.25, ease: EASE }}
              className="flex items-center gap-1.5 text-sm font-medium text-brand-ink"
            >
              <Check className="size-4" />
              Saved
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </form>
  );
}
