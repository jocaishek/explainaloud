"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Mic, Square } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "~/components/ui/button";
import { requestJson } from "~/lib/api-client";
import { audioExtension, preferredRecorderMimeType } from "~/lib/audio";
import { MIN_SPEAKING_SECONDS } from "~/lib/speech-metrics";
import { cn } from "~/lib/utils";

const EASE = [0.23, 1, 0.32, 1] as const;

/**
 * Hard stop for the warm-up.
 *
 * Ten seconds, down from thirty. This sits between someone and the product
 * they just signed up for, and the cost of it being long is not that it is
 * tedious — it is that people abandon onboarding. Ten seconds is roughly
 * 20-25 words: fewer windows than thirty gave, so the median is noisier, but
 * a slightly noisier baseline that everyone actually records beats a precise
 * one that half of them quit halfway through.
 */
const MAX_MS = 10_000;

/**
 * The warm-up question.
 *
 * It has one job — get someone talking naturally for ten seconds — so it has
 * to be something anyone can answer without preparation, that nobody can
 * answer in three words, and that nobody feels tested by. "Why is sleep
 * important?" invites reasons, which is what produces connected speech; the
 * measurement wants a normal speaking rhythm, and a question answerable with
 * a list of facts produces the wrong one.
 */
export const WARMUP_QUESTION = "Why is sleep important?";

type Stage = "idle" | "recording" | "uploading" | "done" | "error";

export type WarmupResult = {
  medianWpm: number;
  speakingSeconds: number;
};

/**
 * The onboarding voice warm-up.
 *
 * Two jobs, and the second one matters more than it looks. The stated job is to
 * capture how this person sounds when they are explaining something they
 * definitely know, so that later hesitation can be measured against them rather
 * than against a population average — which would systematically misread
 * deliberate speakers and speakers of English as a second language.
 *
 * The unstated job is that talking out loud to a computer is socially awkward
 * the first time, and this is a much better place to discover that than
 * mid-way through trying to remember the Krebs cycle. The question cannot be
 * failed, which is the point.
 *
 * Entirely optional. Nothing downstream requires a baseline; without one the
 * app compares a recording against its own better stretches instead.
 */
export function VoiceWarmup({
  onComplete,
  onSkip,
  skipped,
  result,
  allowSkip = true,
}: {
  onComplete: (result: WarmupResult) => void;
  onSkip: () => void;
  skipped: boolean;
  /**
   * Whether skipping is offered. False in Settings, where the skip message
   * ("you can do this later from settings") would be pointing at the page the
   * reader is already on.
   */
  allowSkip?: boolean;
  result: WarmupResult | null;
}) {
  const shouldReduceMotion = useReducedMotion();
  const [stage, setStage] = useState<Stage>(result ? "done" : "idle");
  const [error, setError] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Set when the component goes away mid-recording, so the upload that was
  // already in flight does not call back into an unmounted parent.
  const abandonedRef = useRef(false);

  const releaseHardware = useCallback(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    tickRef.current = null;
    stopTimerRef.current = null;
    for (const track of streamRef.current?.getTracks() ?? []) track.stop();
    streamRef.current = null;
    recorderRef.current = null;
  }, []);

  // Releasing the microphone is not optional housekeeping: leaving a track live
  // keeps the browser's recording indicator lit after the user has moved on,
  // which reads as the app still listening to them.
  useEffect(() => {
    return () => {
      abandonedRef.current = true;
      releaseHardware();
    };
  }, [releaseHardware]);

  const upload = useCallback(
    async (blob: Blob, mimeType: string) => {
      const body = new FormData();
      body.set(
        "audio",
        new File([blob], `warmup.${audioExtension(mimeType)}`, {
          type: mimeType || "audio/webm",
        }),
      );

      const result = await requestJson<{
        saved?: boolean;
        medianWpm?: number;
        speakingSeconds?: number;
      }>("/api/speech/baseline", { method: "POST", body });
      if (abandonedRef.current) return;

      if (!result.ok || !result.data.saved) {
        setStage("error");
        setError(
          `${result.ok ? "Couldn't process that." : result.error} You can skip this step.`,
        );
        return;
      }

      setStage("done");
      onComplete({
        medianWpm: Number(result.data.medianWpm) || 0,
        speakingSeconds: Number(result.data.speakingSeconds) || 0,
      });
    },
    [onComplete],
  );

  const stop = useCallback(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    tickRef.current = null;
    stopTimerRef.current = null;
    // `stop()` fires onstop asynchronously; the upload happens there so that
    // the final data chunk is included.
    recorderRef.current?.state === "recording" && recorderRef.current.stop();
  }, []);

  const start = useCallback(async () => {
    setError(null);
    chunksRef.current = [];
    setElapsedMs(0);

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setStage("error");
      // Permission denial and absent hardware are indistinguishable here
      // without inspecting a non-standard error name, and the remedy the user
      // needs is the same either way.
      setError(
        "We couldn't reach your microphone. Allow access in your browser, or skip this step.",
      );
      return;
    }

    streamRef.current = stream;
    const mimeType = preferredRecorderMimeType();
    const recorder = new MediaRecorder(
      stream,
      mimeType ? { mimeType } : undefined,
    );
    recorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onstop = () => {
      const type = recorder.mimeType || "audio/webm";
      const blob = new Blob(chunksRef.current, { type });
      releaseHardware();
      if (abandonedRef.current) return;
      if (blob.size === 0) {
        setStage("error");
        setError("That recording came through empty. Try again.");
        return;
      }
      setStage("uploading");
      void upload(blob, type);
    };

    recorder.start();
    setStage("recording");

    const startedAt = performance.now();
    tickRef.current = setInterval(() => {
      setElapsedMs(Math.min(MAX_MS, performance.now() - startedAt));
    }, 100);
    // Belt and braces alongside the interval: a backgrounded tab throttles
    // timers, and the cap should hold even if the tick stops firing.
    stopTimerRef.current = setTimeout(stop, MAX_MS);
  }, [releaseHardware, stop, upload]);

  const secondsLeft = Math.ceil((MAX_MS - elapsedMs) / 1000);
  const progress = elapsedMs / MAX_MS;
  const longEnough = elapsedMs >= MIN_SPEAKING_SECONDS * 1000;

  return (
    <div className="flex flex-col gap-5">
      {/* The reason comes before the ask.
          A step that opens with "record yourself" and explains itself only
          afterwards is a step people skip, and the explanation then never gets
          read at all. What this buys them has to be legible before they decide. */}
      {stage !== "done" && (
        <div className="rounded-xl border border-brand/25 bg-brand/[0.05] p-5">
          <p className="text-sm leading-6 text-subtle">
            <span className="font-medium text-strong">
              Everyone talks at a different speed.
            </span>{" "}
            Some people are just careful, and there is no &ldquo;normal&rdquo;
            pace we could measure you against. So we learn yours first.
          </p>
          <p className="mt-3 text-sm leading-6 text-subtle">
            Once we know how you sound explaining something you genuinely know,
            we can tell the difference between{" "}
            <span className="font-medium text-strong">thinking carefully</span>{" "}
            and{" "}
            <span className="font-medium text-strong">
              not actually knowing it yet
            </span>
            . That is what lets us point at the exact sentence you got shaky on,
            instead of just handing you a score.
          </p>
          <p className="mt-3 text-xs leading-5 text-subtle">
            Takes ten seconds, once. Skip it and we work your pace out from your
            first few real sessions instead, which takes longer to get right.
          </p>
        </div>
      )}

      <div className="rounded-xl border border-border bg-surface p-5">
        <p className="text-xs font-medium tracking-[0.14em] text-subtle uppercase">
          Read this, then talk
        </p>
        <p className="mt-2 text-lg leading-snug font-semibold text-strong">
          {WARMUP_QUESTION}
        </p>
        <p className="mt-2 text-sm leading-6 text-subtle">
          Explain it like you&apos;re talking to a seven-year-old. There is no
          right answer and nothing here is graded. This is only so we know how
          fast you normally talk. Ten seconds is plenty.
        </p>
      </div>

      {stage === "recording" && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 font-medium text-strong">
              <span
                className={cn(
                  "size-2 rounded-full bg-destructive",
                  !shouldReduceMotion && "animate-pulse",
                )}
              />
              Recording
            </span>
            <span className="font-mono tabular-nums text-subtle">
              {secondsLeft}s left
            </span>
          </div>
          {/* Drains rather than fills. The number beside it counts down, and a
              bar growing while a number shrinks makes the reader do arithmetic
              to answer "how much have I got left" — which is the only question
              anyone asks of a bar during a ten-second recording. */}
          <div
            className="h-2 overflow-hidden rounded-full bg-card"
            role="progressbar"
            aria-label="Time left in the warm-up"
            aria-valuemin={0}
            aria-valuemax={Math.round(MAX_MS / 1000)}
            aria-valuenow={secondsLeft}
          >
            <div
              className={cn(
                "h-full rounded-full transition-[width,background-color] duration-100 ease-linear motion-reduce:transition-none",
                longEnough ? "bg-green-500" : "bg-brand",
              )}
              style={{ width: `${Math.max(0, 1 - progress) * 100}%` }}
            />
          </div>
          <p className="text-xs text-subtle">
            {longEnough
              ? "That's enough to work with. Stop whenever you like."
              : `Keep going for at least ${MIN_SPEAKING_SECONDS} seconds.`}
          </p>
        </div>
      )}

      <AnimatePresence mode="wait" initial={false}>
        {stage === "done" && result && (
          <motion.div
            key="done"
            initial={shouldReduceMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.24, ease: EASE }}
            className="rounded-xl border border-brand/30 bg-brand/[0.06] p-5"
          >
            <p className="flex items-center gap-2 text-sm font-semibold text-strong">
              <Check className="size-4 text-brand" />
              Got it. You speak at about {Math.round(result.medianWpm)} words a
              minute.
            </p>
            <p className="mt-3 text-sm leading-6 text-subtle">
              That is your baseline. From now on, when you slow down or hesitate
              part-way through explaining something, we can tell it apart from
              how you normally talk, and show you the exact spot.
            </p>
            <p className="mt-3 text-sm leading-6 text-subtle">
              We kept the numbers, not the recording. Your audio was deleted the
              moment it was measured.
            </p>
          </motion.div>
        )}

        {skipped && stage !== "done" && (
          <motion.p
            key="skipped"
            initial={shouldReduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-xl bg-surface px-4 py-3 text-xs leading-5 text-subtle"
          >
            Skipped, that&apos;s fine. We&apos;ll work your usual pace out from
            your first few real sessions instead. You can do this later from
            settings.
          </motion.p>
        )}
      </AnimatePresence>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {stage === "recording" ? (
          <Button
            type="button"
            onClick={stop}
            className="h-11 gap-2 rounded-full bg-destructive px-5 font-semibold text-white transition-transform duration-200 ease-out active:scale-[0.97] motion-reduce:transition-none"
          >
            <Square className="size-4" />
            Stop
          </Button>
        ) : (
          <Button
            type="button"
            onClick={start}
            disabled={stage === "uploading"}
            variant={stage === "done" ? "outline" : "default"}
            className={cn(
              "h-11 gap-2 rounded-full px-5 font-semibold transition-transform duration-200 ease-out active:scale-[0.97] motion-reduce:transition-none",
              stage === "done"
                ? "border-border bg-surface text-strong"
                : "bg-brand text-white shadow-[0_0_30px_-8px_var(--color-brand)] hover:bg-brand/90",
            )}
          >
            <Mic className="size-4" />
            {stage === "uploading"
              ? "Measuring…"
              : stage === "done"
                ? "Record again"
                : stage === "error"
                  ? "Try again"
                  : "Start recording"}
          </Button>
        )}

        {allowSkip && stage !== "done" && stage !== "recording" && (
          <button
            type="button"
            onClick={onSkip}
            className="text-sm font-medium text-subtle underline underline-offset-2 transition-colors hover:text-strong"
          >
            Skip this
          </button>
        )}
      </div>
    </div>
  );
}
