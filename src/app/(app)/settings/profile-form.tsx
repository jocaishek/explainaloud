"use client";

import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { Check } from "lucide-react";
import { useActionState, useEffect, useId, useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { USE_TYPE_LABELS, USE_TYPES } from "~/lib/profile";
import type { Profile } from "~/lib/supabase/server";
import { cn } from "~/lib/utils";
import { type ProfileFormState, updateProfile } from "./actions";

const EASE = [0.22, 1, 0.36, 1] as const;

export function ProfileForm({ profile }: { profile: Profile }) {
  const firstNameId = useId();
  const lastNameId = useId();
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
    <MotionConfig reducedMotion="user">
      <form action={formAction} className="flex flex-col gap-6">
        <input type="hidden" name="useType" value={useType} />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor={firstNameId}>First name</Label>
            <Input
              id={firstNameId}
              name="firstName"
              autoComplete="given-name"
              defaultValue={profile.first_name}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={lastNameId}>Last name</Label>
            <Input
              id={lastNameId}
              name="lastName"
              autoComplete="family-name"
              defaultValue={profile.last_name}
            />
          </div>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 font-medium text-sm text-strong">
            Using it for
          </legend>
          <div className="inline-flex w-fit flex-wrap gap-0.5 rounded-control bg-muted p-0.5">
            {USE_TYPES.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={useType === option}
                onClick={() => setUseType(option)}
                className={cn(
                  "h-8 rounded-[calc(var(--r-control)-2px)] px-3.5 font-medium text-sm transition-colors duration-150 ease-[cubic-bezier(0.22,1,0.36,1)]",
                  "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[color:var(--accent-ring)]",
                  useType === option
                    ? "bg-card text-strong shadow-rest ring-1 ring-border"
                    : "text-subtle hover:text-strong",
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

        <div className="flex items-center justify-end gap-4 border-border border-t pt-5">
          <AnimatePresence>
            {showSaved && (
              <motion.span
                initial={{ opacity: 0, scale: 0.95, x: -4 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.25, ease: EASE }}
                role="status"
                className="flex items-center gap-1.5 text-sm text-subtle"
              >
                <Check aria-hidden className="size-4" />
                Saved
              </motion.span>
            )}
          </AnimatePresence>

          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
    </MotionConfig>
  );
}
