"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  AudioLines,
  CalendarDays,
  Check,
  CheckCircle2,
  CircleUserRound,
  Compass,
  GraduationCap,
  Presentation,
  SlidersHorizontal,
} from "lucide-react";
import { useActionState, useId, useState } from "react";
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
import { cn } from "~/lib/utils";
import { type OnboardingState, saveProfile } from "./actions";
import { VoiceWarmup, type WarmupResult } from "./voice-warmup";

const EASE = [0.23, 1, 0.32, 1] as const;
const STEPS = [
  "Your name",
  "Date of birth",
  "How you'll use it",
  "Voice warm-up",
] as const;
const STEP_ICONS = [
  CircleUserRound,
  CalendarDays,
  SlidersHorizontal,
  AudioLines,
] as const;
const USE_TYPE_ICONS = {
  school: GraduationCap,
  teacher: Presentation,
  personal: Compass,
} as const;

export function OnboardingForm({ email }: { email: string }) {
  const shouldReduceMotion = useReducedMotion();
  const firstNameId = useId();
  const lastNameId = useId();
  const dobId = useId();
  const errorId = useId();

  const [step, setStep] = useState(0);
  // Direction drives which way the panel slides, so going Back visibly
  // reverses rather than replaying the forward animation.
  const [direction, setDirection] = useState<1 | -1>(1);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
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
    if (index === 1) return dateOfBirthError(dateOfBirth);
    if (index === 2) {
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
    setDirection(1);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function back() {
    setLocalError(null);
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 0));
  }

  function goToCompletedStep(index: number) {
    if (index >= step) return;
    setLocalError(null);
    setDirection(-1);
    setStep(index);
  }

  function clearCurrentError() {
    if (localError?.step === step) setLocalError(null);
  }

  const slide = shouldReduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, x: direction * 32, filter: "blur(4px)" },
        animate: { opacity: 1, x: 0, filter: "blur(0px)" },
        exit: { opacity: 0, x: direction * -32, filter: "blur(4px)" },
      };

  const error =
    (localError?.step === step ? localError.message : null) ?? state.error;
  const isLastStep = step === STEPS.length - 1;

  return (
    <form
      action={formAction}
      onKeyDown={(event) => {
        if (
          event.key === "Enter" &&
          !isLastStep &&
          event.target instanceof HTMLInputElement
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
      className="flex w-full flex-col gap-7"
    >
      {/* Every value travels with the form even while its step is unmounted. */}
      <input type="hidden" name="firstName" value={firstName} />
      <input type="hidden" name="lastName" value={lastName} />
      <input type="hidden" name="dateOfBirth" value={dateOfBirth} />
      <input type="hidden" name="useType" value={useType ?? ""} />

      <StepIndicator
        step={step}
        onStepSelect={goToCompletedStep}
        reduceMotion={!!shouldReduceMotion}
      />

      <div className="min-h-[19rem]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            initial={slide.initial}
            animate={slide.animate}
            exit={slide.exit}
            transition={{
              duration: shouldReduceMotion ? 0.1 : 0.22,
              ease: EASE,
            }}
            className="flex flex-col gap-5"
          >
            <div>
              <p className="mb-2 text-sm font-medium text-brand-ink">
                Step {step + 1} of {STEPS.length}
              </p>
              <h2 className="text-3xl font-semibold tracking-tight text-strong text-balance">
                {step === 0 && "What should we call you?"}
                {step === 1 && "When were you born?"}
                {step === 2 && "How will you use Explainaloud?"}
                {step === 3 && "Let's hear your voice"}
              </h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-subtle">
                {step === 0 &&
                  "This is how your dashboard and progress reports will greet you."}
                {step === 1 &&
                  "We use this to confirm you're old enough for your own account."}
                {step === 2 && "This shapes what we put in front of you first."}
                {step === 3 &&
                  "Thirty seconds explaining something you already know. It teaches us your normal speaking pace, which is what makes the gap-finding work."}
              </p>
            </div>

            {step === 0 && (
              <div className="flex flex-col gap-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor={firstNameId} className="sr-only">
                      First name
                    </Label>
                    <Input
                      id={firstNameId}
                      autoFocus
                      autoComplete="given-name"
                      placeholder="First name"
                      value={firstName}
                      aria-invalid={!!error}
                      aria-describedby={error ? errorId : undefined}
                      onChange={(event) => {
                        setFirstName(event.target.value);
                        clearCurrentError();
                      }}
                      className="h-12 bg-surface px-4 text-base placeholder:text-subtle"
                    />
                  </div>
                  <div>
                    <Label htmlFor={lastNameId} className="sr-only">
                      Last name
                    </Label>
                    <Input
                      id={lastNameId}
                      autoComplete="family-name"
                      placeholder="Last name"
                      value={lastName}
                      aria-invalid={!!error}
                      aria-describedby={error ? errorId : undefined}
                      onChange={(event) => {
                        setLastName(event.target.value);
                        clearCurrentError();
                      }}
                      className="h-12 bg-surface px-4 text-base placeholder:text-subtle"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-subtle">
                  <CheckCircle2 className="size-4 text-brand-ink" />
                  <span className="truncate">{email} verified</span>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="flex max-w-sm flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor={dobId}>Date of birth</Label>
                  <Input
                    id={dobId}
                    type="date"
                    autoFocus
                    autoComplete="bday"
                    value={dateOfBirth}
                    max={new Date().toISOString().slice(0, 10)}
                    aria-invalid={!!error}
                    aria-describedby={error ? errorId : undefined}
                    onChange={(event) => {
                      setDateOfBirth(event.target.value);
                      clearCurrentError();
                    }}
                    className="h-12 bg-surface px-4 text-base"
                  />
                </div>
                <div className="rounded-xl bg-surface px-4 py-3">
                  <p className="text-xs leading-5 text-subtle">
                    Explainaloud requires users to be at least 13. Your birth
                    date is only used for account eligibility.
                  </p>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="flex flex-col gap-3">
                {USE_TYPES.map((option) => (
                  <UseTypeOption
                    key={option}
                    option={option}
                    selected={useType === option}
                    reduceMotion={!!shouldReduceMotion}
                    onSelect={() => {
                      setUseType(option);
                      setLocalError(null);
                    }}
                  />
                ))}
              </div>
            )}

            {step === 3 && (
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
          </motion.div>
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {error && (
          <motion.p
            initial={shouldReduceMotion ? false : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? undefined : { opacity: 0 }}
            transition={{
              duration: shouldReduceMotion ? 0 : 0.2,
              ease: EASE,
            }}
            role="alert"
            id={errorId}
            className="text-sm text-destructive"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="ghost"
          onClick={back}
          disabled={step === 0 || pending}
          className={cn(
            "gap-1.5 rounded-full motion-reduce:transition-none",
            // `invisible`, not `opacity-0`: the Button variant's
            // `disabled:opacity-50` is generated after plain opacity
            // utilities and would win the moment this button is disabled.
            step === 0 && "invisible",
          )}
        >
          <ArrowLeft className="size-4" />
          Back
        </Button>

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
            className="shine group h-11 gap-1.5 rounded-full bg-brand-deep px-6 font-semibold text-white shadow-[0_0_30px_-8px_var(--color-brand-deep)] transition-[transform,box-shadow] duration-200 ease-out hover:bg-brand-deep/90 active:scale-[0.97] motion-reduce:transition-none"
          >
            {pending ? "Setting up…" : "Finish setup"}
            {!pending && <Check className="size-4" />}
          </Button>
        ) : (
          <Button
            key="continue"
            type="button"
            onClick={next}
            className="shine group h-11 gap-1.5 rounded-full bg-brand-deep px-6 font-semibold text-white shadow-[0_0_30px_-8px_var(--color-brand-deep)] transition-[transform,box-shadow] duration-200 ease-out hover:bg-brand-deep/90 active:scale-[0.97] motion-reduce:transition-none"
          >
            Continue
            <ArrowRight className="size-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5 motion-reduce:transform-none motion-reduce:transition-none" />
          </Button>
        )}
      </div>
    </form>
  );
}

function StepIndicator({
  step,
  onStepSelect,
  reduceMotion,
}: {
  step: number;
  onStepSelect: (step: number) => void;
  reduceMotion: boolean;
}) {
  return (
    <ol className="grid grid-cols-4 gap-1 rounded-xl bg-surface p-1">
      {STEPS.map((label, index) => {
        const Icon = STEP_ICONS[index];
        const complete = index < step;
        const active = index === step;

        return (
          <li key={label}>
            <button
              type="button"
              disabled={index > step}
              aria-current={active ? "step" : undefined}
              onClick={() => onStepSelect(index)}
              className={cn(
                "relative flex w-full items-center justify-center gap-2 rounded-lg px-2 py-2.5 text-left text-xs font-medium transition-colors duration-200 sm:justify-start sm:px-3 motion-reduce:transition-none",
                active
                  ? "text-strong"
                  : complete
                    ? "text-brand-ink hover:text-strong"
                    : "text-subtle",
              )}
            >
              {active && (
                <motion.span
                  layoutId="onboarding-active-step"
                  className="absolute inset-0 rounded-lg bg-card shadow-xs"
                  transition={{ duration: reduceMotion ? 0 : 0.25, ease: EASE }}
                />
              )}
              <span className="relative flex size-5 shrink-0 items-center justify-center">
                {complete ? (
                  <Check className="size-4" />
                ) : Icon ? (
                  <Icon className="size-4" />
                ) : null}
              </span>
              <span className="relative hidden truncate sm:inline">
                {label}
              </span>
              <span className="sr-only sm:hidden">{label}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function UseTypeOption({
  option,
  selected,
  reduceMotion,
  onSelect,
}: {
  option: UseType;
  selected: boolean;
  reduceMotion: boolean;
  onSelect: () => void;
}) {
  const { title, description } = USE_TYPE_LABELS[option];
  const Icon = USE_TYPE_ICONS[option];

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`${title}: ${description}`}
      className={cn(
        "group flex items-center gap-4 rounded-xl border p-4 text-left transition-[border-color,background-color,transform] duration-200 ease-out active:scale-[0.99] motion-reduce:transition-none motion-reduce:active:scale-100",
        selected
          ? "border-brand bg-brand/10"
          : "border-border bg-surface hover:border-brand/40 hover:bg-brand/[0.04]",
      )}
    >
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-lg transition-colors duration-200 motion-reduce:transition-none",
          selected
            ? "bg-brand-deep text-white"
            : "bg-card text-subtle group-hover:text-brand-ink",
        )}
      >
        <Icon className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium text-strong">{title}</span>
        <span className="mt-0.5 block text-sm leading-5 text-subtle">
          {description}
        </span>
      </span>
      <span
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors duration-200 motion-reduce:transition-none",
          selected ? "border-brand bg-brand" : "border-border",
        )}
      >
        <AnimatePresence>
          {selected && (
            <motion.span
              initial={reduceMotion ? false : { scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={reduceMotion ? undefined : { scale: 0.5, opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.18, ease: EASE }}
            >
              <Check className="size-3 text-white" />
            </motion.span>
          )}
        </AnimatePresence>
      </span>
    </button>
  );
}
