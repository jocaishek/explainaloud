"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";
import {
  type KeyboardEvent,
  useActionState,
  useEffect,
  useId,
  useState,
} from "react";
import { DateOfBirthField } from "~/components/date-of-birth-field";
import { ExplainaloudMark } from "~/components/explainaloud-mark";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  dateOfBirthError,
  nameError,
  USE_TYPE_LABELS,
  USE_TYPES,
  type UseType,
} from "~/lib/profile";
import { usernameError } from "~/lib/username";
import { cn } from "~/lib/utils";
import { type OnboardingState, saveProfile } from "./actions";
import { UsernameField } from "./username-field";
import { UsernameSuggestions } from "./username-suggestions";
import { VoiceWarmup, type WarmupResult } from "./voice-warmup";

const EASE = [0.22, 1, 0.36, 1] as const;
const STEPS = [
  "Your name",
  "Username",
  "Date of birth",
  "How you'll use it",
  "Voice warm-up",
] as const;

/** The question each step asks, and the one line under it. */
const COPY = [
  {
    title: "What's your name?",
    help: "This is how your home page and progress reports will greet you",
  },
  {
    title: "Pick a username",
    help: "Friends find you by it. It can't be changed later, so pick one you like",
  },
  {
    title: "When's your birthday?",
    help: "We only use it to check you're old enough for your own account. It can't be changed later",
  },
  {
    title: "How will you use Explainaloud?",
    help: "This shapes what we put in front of you first. You can change it in settings",
  },
  {
    title: "Let's hear your voice",
    help: "Ten seconds explaining something you already know, so we learn your normal pace",
  },
] as const;

const FIELD_CLASS = "h-12 px-3.5 text-base md:text-base";

export function OnboardingForm({ email }: { email: string }) {
  const shouldReduceMotion = useReducedMotion();
  const firstNameId = useId();
  const lastNameId = useId();
  const headingId = useId();
  const errorId = useId();

  const [step, setStep] = useState(0);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  /* What the availability check last said. `false` while a request is in
     flight, so Continue is not a race against the answer. */
  const [usernameFree, setUsernameFree] = useState(false);
  /* Resolved once on mount. Reading it during render would differ between the
     server pass and the browser one, which is a hydration mismatch over a
     string neither of them shows. */
  const [timezone, setTimezone] = useState("");
  useEffect(() => {
    try {
      setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone ?? "");
    } catch {
      setTimezone("");
    }
  }, []);
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [useType, setUseType] = useState<UseType | null>(null);
  // The warm-up writes its own row server-side, so these only drive what the
  // step shows back. Neither is submitted with the profile.
  const [warmupResult, setWarmupResult] = useState<WarmupResult | null>(null);
  const [warmupSkipped, setWarmupSkipped] = useState(false);
  // Tagged with the step it came from, so an error raised on one step can
  // never leak onto the next one the user hasn't attempted yet.
  const [localError, setLocalError] = useState<{
    step: number;
    message: string;
  } | null>(null);

  const [state, formAction, pending] = useActionState<
    OnboardingState,
    FormData
  >(saveProfile, { error: null });

  function stepError(index: number): string | null {
    if (index === 0) {
      return (
        nameError(firstName, "first name") ?? nameError(lastName, "last name")
      );
    }
    if (index === 1) {
      /* Shape first, then availability. Saying "that one is taken" about a
         name with a space in it is answering a question nobody asked. */
      return (
        usernameError(username) ??
        (usernameFree ? null : "Pick a username that's free.")
      );
    }
    if (index === 2) return dateOfBirthError(dateOfBirth);
    if (index === 3) {
      return useType ? null : "Pick how you'll be using Explainaloud.";
    }
    // The warm-up is optional by design — nothing downstream needs a baseline,
    // and gating setup on microphone access would lock out anyone who declines
    // it or has no working mic.
    return null;
  }

  function next() {
    const problem = stepError(step);
    if (problem) {
      setLocalError({ step, message: problem });
      return;
    }
    setLocalError(null);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function back() {
    setLocalError(null);
    setStep((s) => Math.max(s - 1, 0));
  }

  function clearCurrentError() {
    if (localError?.step === step) setLocalError(null);
  }

  // A new question starts at the top of the page, not wherever the last
  // one's button left the scroll.
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs per step on purpose
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [step]);

  const error =
    (localError?.step === step ? localError.message : null) ?? state.error;
  const isLastStep = step === STEPS.length - 1;
  /* Continue looks unavailable until the step is answerable, but stays
     clickable: pressing it is how somebody finds out *why* it is not ready,
     and a truly disabled button would swallow that question silently. */
  const stepReady = stepError(step) === null;
  const copy = COPY[step] ?? COPY[0];

  return (
    <>
      <header className="sticky top-0 z-10 bg-background">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6 max-sm:px-4">
          <span className="flex items-center gap-2 text-foreground">
            <ExplainaloudMark disc className="size-5 shrink-0 text-strong" />
            <span className="font-medium text-base tracking-[-0.02em]">
              explainaloud
            </span>
          </span>
          <span
            className="text-muted-foreground text-sm tabular-nums"
            aria-live="polite"
          >
            Step {step + 1} of {STEPS.length}
          </span>
        </div>
        <div
          className="h-0.5 bg-border"
          role="progressbar"
          aria-label="Setup progress"
          aria-valuemin={1}
          aria-valuemax={STEPS.length}
          aria-valuenow={step + 1}
          aria-valuetext={`${STEPS[step]}, step ${step + 1} of ${STEPS.length}`}
        >
          <span
            className="block h-full origin-left bg-foreground transition-transform duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
            style={{ transform: `scaleX(${(step + 1) / STEPS.length})` }}
          />
        </div>
      </header>

      <form
        action={formAction}
        onKeyDown={(event) => {
          if (
            event.key === "Enter" &&
            !isLastStep &&
            (event.target instanceof HTMLInputElement ||
              event.target instanceof HTMLSelectElement)
          ) {
            event.preventDefault();
            next();
          }
        }}
        onSubmit={(event) => {
          if (!isLastStep) {
            event.preventDefault();
            next();
            return;
          }
          const problem = stepError(STEPS.length - 1);
          if (problem) {
            event.preventDefault();
            setLocalError({ step: STEPS.length - 1, message: problem });
          }
        }}
        className="mx-auto flex w-full max-w-[560px] flex-col px-6 pt-20 pb-24 max-sm:px-4 max-sm:pt-10 max-sm:pb-16"
      >
        {/* Every value travels with the form even while its step is unmounted. */}
        <input type="hidden" name="firstName" value={firstName} />
        <input type="hidden" name="lastName" value={lastName} />
        <input type="hidden" name="dateOfBirth" value={dateOfBirth} />
        <input type="hidden" name="useType" value={useType ?? ""} />
        <input type="hidden" name="username" value={username} />
        {/* Read from the browser rather than guessed from an IP, because a VPN
            moves the IP and not the person. Streaks are counted in it. */}
        <input type="hidden" name="timezone" value={timezone} />

        <AnimatePresence mode="wait" initial={false}>
          <motion.section
            key={step}
            aria-labelledby={headingId}
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: shouldReduceMotion ? 0.1 : 0.24,
              ease: EASE,
            }}
          >
            <h1
              id={headingId}
              className="text-balance font-normal text-[2rem] text-foreground leading-10 tracking-[-0.02em] max-sm:text-[1.75rem] max-sm:leading-9"
            >
              {copy.title}
            </h1>
            <p className="mt-2 text-base text-muted-foreground leading-6">
              {copy.help}
            </p>

            <div className="mt-8 flex flex-col gap-4">
              {step === 0 && (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor={firstNameId} className="text-foreground">
                        First name
                      </Label>
                      <Input
                        id={firstNameId}
                        autoFocus
                        autoComplete="given-name"
                        value={firstName}
                        aria-invalid={!!error}
                        aria-describedby={error ? errorId : undefined}
                        onChange={(event) => {
                          setFirstName(event.target.value);
                          clearCurrentError();
                        }}
                        className={FIELD_CLASS}
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor={lastNameId} className="text-foreground">
                        Last name
                      </Label>
                      <Input
                        id={lastNameId}
                        autoComplete="family-name"
                        value={lastName}
                        aria-invalid={!!error}
                        aria-describedby={error ? errorId : undefined}
                        onChange={(event) => {
                          setLastName(event.target.value);
                          clearCurrentError();
                        }}
                        className={FIELD_CLASS}
                      />
                    </div>
                  </div>

                  <p className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Check aria-hidden className="size-4 shrink-0" />
                    <span className="truncate">{email} verified</span>
                  </p>
                </>
              )}

              {step === 1 && (
                <>
                  <UsernameField
                    value={username}
                    onChange={(next) => {
                      setUsername(next);
                      clearCurrentError();
                    }}
                    onAvailability={setUsernameFree}
                  />
                  {/* Only in front of an empty field. Once somebody is typing
                      their own idea, a row of alternatives is an interruption. */}
                  {username.length === 0 && (
                    <UsernameSuggestions
                      firstName={firstName}
                      lastName={lastName}
                      onPick={(picked) => {
                        setUsername(picked);
                        clearCurrentError();
                      }}
                    />
                  )}
                </>
              )}

              {step === 2 && (
                <>
                  <DateOfBirthField
                    /* Remounted when somebody steps back to this question,
                       so it has to be told what they already picked. */
                    defaultValue={dateOfBirth}
                    invalid={!!error}
                    describedBy={error ? errorId : headingId}
                    onChange={(value) => {
                      setDateOfBirth(value);
                      clearCurrentError();
                    }}
                  />
                  <p className="text-muted-foreground text-sm leading-5">
                    You need to be at least 13 to have your own account. Your
                    birthday is never shown to anyone
                  </p>
                </>
              )}

              {step === 3 && (
                <UseTypeChoices
                  labelledBy={headingId}
                  value={useType}
                  onChange={(option) => {
                    setUseType(option);
                    setLocalError(null);
                  }}
                />
              )}

              {step === 4 && (
                <VoiceWarmup
                  result={warmupResult}
                  skipped={warmupSkipped}
                  onComplete={(next) => {
                    setWarmupResult(next);
                    setWarmupSkipped(false);
                  }}
                  onSkip={() => setWarmupSkipped(true)}
                />
              )}
            </div>
          </motion.section>
        </AnimatePresence>

        <AnimatePresence>
          {error && (
            <motion.p
              initial={shouldReduceMotion ? false : { opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={shouldReduceMotion ? undefined : { opacity: 0 }}
              transition={{
                duration: shouldReduceMotion ? 0 : 0.2,
                ease: EASE,
              }}
              role="alert"
              id={errorId}
              className="mt-6 text-destructive text-sm"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        <div className="mt-8 grid gap-3">
          {/* Distinct keys are load-bearing. Without them React reuses one DOM
              node for both buttons and only swaps `type`; the click that
              advances to the last step then finds a node that has become
              type="submit" by the time the browser runs the default action,
              and submits the form before the user has picked anything. */}
          {isLastStep ? (
            <Button
              key="finish"
              type="submit"
              disabled={pending}
              className="h-12 w-full text-base"
            >
              {pending ? "Setting up…" : "Finish setup"}
            </Button>
          ) : (
            <Button
              key="continue"
              type="button"
              onClick={next}
              aria-disabled={!stepReady}
              className="h-12 w-full text-base aria-disabled:opacity-50"
            >
              Continue
            </Button>
          )}

          {step > 0 && (
            <button
              type="button"
              onClick={back}
              disabled={pending}
              className="h-9 justify-self-center rounded-control px-3 text-muted-foreground text-sm transition-colors duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[color:var(--accent-ring)] disabled:opacity-50 motion-reduce:transition-none"
            >
              Back
            </button>
          )}
        </div>
      </form>
    </>
  );
}

/**
 * One row per answer, the whole row is the control, and the radio dot sits on
 * the right where the eye ends the line. Arrow keys move the choice, as they
 * do in any native radio group.
 */
function UseTypeChoices({
  labelledBy,
  value,
  onChange,
}: {
  labelledBy: string;
  value: UseType | null;
  onChange: (option: UseType) => void;
}) {
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const forward = event.key === "ArrowDown" || event.key === "ArrowRight";
    const backward = event.key === "ArrowUp" || event.key === "ArrowLeft";
    if (!forward && !backward) return;
    event.preventDefault();
    const current = value ? USE_TYPES.indexOf(value) : -1;
    const length = USE_TYPES.length;
    const nextIndex = forward
      ? (current + 1) % length
      : (current - 1 + length) % length;
    const option = USE_TYPES[nextIndex];
    if (!option) return;
    onChange(option);
    event.currentTarget
      .querySelectorAll<HTMLButtonElement>('[role="radio"]')
      [nextIndex]?.focus();
  }

  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      onKeyDown={onKeyDown}
      className="grid gap-2"
    >
      {USE_TYPES.map((option, index) => {
        const { title, description } = USE_TYPE_LABELS[option];
        const selected = value === option;
        const focusable = value ? selected : index === 0;
        return (
          // biome-ignore lint/a11y/useSemanticElements: a native radio needs a `name`, which would post a stray key with the profile form; arrows and roving focus are handled above
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={focusable ? 0 : -1}
            onClick={() => onChange(option)}
            className={cn(
              "grid grid-cols-[1fr_auto] items-center gap-3 rounded-control border bg-card p-4 text-left transition-[border-color,box-shadow] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[color:var(--accent-ring)] motion-reduce:transition-none",
              selected
                ? "border-foreground shadow-[inset_0_0_0_0.5px_var(--foreground)]"
                : "border-input hover:border-foreground/30",
            )}
          >
            <span className="min-w-0">
              <span className="block font-medium text-base text-foreground">
                {title}
              </span>
              <span className="mt-0.5 block text-muted-foreground text-sm leading-5">
                {description}
              </span>
            </span>
            <span
              aria-hidden
              className={cn(
                "size-5 shrink-0 rounded-full transition-[border-width,border-color] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
                selected
                  ? "border-[6px] border-foreground"
                  : "border-[1.5px] border-input",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
