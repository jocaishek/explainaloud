"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
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

const EASE = [0.23, 1, 0.32, 1] as const;
const STEPS = ["Your name", "Date of birth", "How you'll use it"] as const;

export function OnboardingForm({ email }: { email: string }) {
  const shouldReduceMotion = useReducedMotion();
  const firstNameId = useId();
  const lastNameId = useId();
  const dobId = useId();

  const [step, setStep] = useState(0);
  // Direction drives which way the panel slides, so going Back visibly
  // reverses rather than replaying the forward animation.
  const [direction, setDirection] = useState<1 | -1>(1);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [useType, setUseType] = useState<UseType | null>(null);
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
    return useType ? null : "Pick how you'll be using Ropes.";
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
      onSubmit={(event) => {
        const problem = stepError(STEPS.length - 1);
        if (problem) {
          event.preventDefault();
          setLocalError({ step: STEPS.length - 1, message: problem });
        }
      }}
      className="flex w-full flex-col gap-8"
    >
      {/* Every value travels with the form even while its step is unmounted. */}
      <input type="hidden" name="firstName" value={firstName} />
      <input type="hidden" name="lastName" value={lastName} />
      <input type="hidden" name="dateOfBirth" value={dateOfBirth} />
      <input type="hidden" name="useType" value={useType ?? ""} />

      <StepIndicator step={step} />

      <div className="min-h-64">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            initial={slide.initial}
            animate={slide.animate}
            exit={slide.exit}
            transition={{ duration: 0.35, ease: EASE }}
            className="flex flex-col gap-5"
          >
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-strong">
                {step === 0 && "What should we call you?"}
                {step === 1 && "When were you born?"}
                {step === 2 && "How will you use Ropes?"}
              </h2>
              <p className="mt-2 text-sm text-subtle">
                {step === 0 &&
                  `Setting up the account for ${email}. This is the name we'll greet you by.`}
                {step === 1 &&
                  "We use this to confirm you're old enough for your own account."}
                {step === 2 && "This shapes what we put in front of you first."}
              </p>
            </div>

            {step === 0 && (
              <div className="grid gap-4 sm:grid-cols-2">
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
                    onChange={(e) => setFirstName(e.target.value)}
                    className="h-11 placeholder:text-subtle"
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
                    onChange={(e) => setLastName(e.target.value)}
                    className="h-11 placeholder:text-subtle"
                  />
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="flex max-w-xs flex-col gap-2">
                <Label htmlFor={dobId}>Date of birth</Label>
                <Input
                  id={dobId}
                  type="date"
                  autoFocus
                  autoComplete="bday"
                  value={dateOfBirth}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="h-11"
                />
              </div>
            )}

            {step === 2 && (
              <div className="flex flex-col gap-3">
                {USE_TYPES.map((option) => (
                  <UseTypeOption
                    key={option}
                    option={option}
                    selected={useType === option}
                    onSelect={() => {
                      setUseType(option);
                      setLocalError(null);
                    }}
                  />
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: EASE }}
            role="alert"
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
            "gap-1.5 rounded-full",
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
            className="shine group h-11 gap-1.5 rounded-full bg-brand px-6 font-semibold text-white shadow-[0_0_30px_-8px_var(--color-brand)] transition-[transform,box-shadow] duration-200 ease-out hover:bg-brand/90 active:scale-[0.97]"
          >
            {pending ? "Setting up…" : "Finish setup"}
            {!pending && <Check className="size-4" />}
          </Button>
        ) : (
          <Button
            key="continue"
            type="button"
            onClick={next}
            className="shine group h-11 gap-1.5 rounded-full bg-brand px-6 font-semibold text-white shadow-[0_0_30px_-8px_var(--color-brand)] transition-[transform,box-shadow] duration-200 ease-out hover:bg-brand/90 active:scale-[0.97]"
          >
            Continue
            <ArrowRight className="size-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5" />
          </Button>
        )}
      </div>
    </form>
  );
}

function StepIndicator({ step }: { step: number }) {
  return (
    <ol className="flex items-center gap-3">
      {STEPS.map((label, i) => (
        <li key={label} className="flex flex-1 flex-col gap-2">
          <div className="h-1 overflow-hidden rounded-full bg-surface">
            <motion.div
              className="h-full rounded-full bg-brand"
              initial={false}
              animate={{ width: i <= step ? "100%" : "0%" }}
              transition={{ duration: 0.4, ease: EASE }}
            />
          </div>
          <span
            className={cn(
              "font-mono text-[10px] tracking-[0.14em] uppercase transition-colors duration-300",
              i <= step ? "text-brand" : "text-subtle",
            )}
          >
            {label}
          </span>
        </li>
      ))}
    </ol>
  );
}

function UseTypeOption({
  option,
  selected,
  onSelect,
}: {
  option: UseType;
  selected: boolean;
  onSelect: () => void;
}) {
  const { title, description } = USE_TYPE_LABELS[option];

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`${title} — ${description}`}
      className={cn(
        "flex items-center gap-4 rounded-xl border p-4 text-left transition-[border-color,background-color,transform] duration-200 ease-out active:scale-[0.99]",
        selected
          ? "border-brand bg-brand/10"
          : "border-border bg-surface hover:border-brand/40",
      )}
    >
      <span
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors duration-200",
          selected ? "border-brand bg-brand" : "border-border",
        )}
      >
        <AnimatePresence>
          {selected && (
            <motion.span
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.18, ease: EASE }}
            >
              <Check className="size-3 text-strong" />
            </motion.span>
          )}
        </AnimatePresence>
      </span>
      <span>
        <span className="block font-medium text-strong">{title}</span>
        <span className="mt-0.5 block text-sm text-subtle">{description}</span>
      </span>
    </button>
  );
}
