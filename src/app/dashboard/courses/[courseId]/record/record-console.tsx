"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Mic, Square } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "~/components/ui/button";
import { DAILY_LIMITS, localDay } from "~/lib/limits";
import { createClient } from "~/lib/supabase/client";
import { cn } from "~/lib/utils";

type Session = {
  id: string;
  transcript: string | null;
  started_at: string;
  ended_at: string | null;
  score: number | null;
};

type Span = {
  text: string;
  status: "correct" | "gap" | "neutral";
  issue: string | null;
};

type Report = {
  score: number;
  verdict: string;
  gaps: Array<{
    phrase: string;
    category: string;
    explanation: string;
    quiz: string;
  }>;
  strengths: string[];
  next_focus: string;
};

type Status =
  | "checking"
  | "unsupported"
  | "awaiting-mic"
  | "idle"
  | "recording"
  | "saving"
  | "analyzing";

/** How long the student must pause before we re-grade what they've said. */
const LIVE_DEBOUNCE_MS = 2200;

/**
 * Hard cap on one explanation. Five minutes is well past the point where a
 * teach-back stops being recall and starts being reading aloud, and it keeps
 * a single transcript inside one model context comfortably.
 */
const MAX_RECORDING_MS = 5 * 60_000;

/** Warn when this much time is left, so the ending isn't a surprise. */
const WARN_AT_MS = 30_000;

/**
 * Only these end a session. Every other SpeechRecognition error is transient
 * and must be recovered from, not surfaced as a failure.
 */
const FATAL_SPEECH_ERRORS = new Set(["not-allowed", "service-not-allowed"]);

/**
 * How many silent restarts to tolerate before giving up. Chrome ends a
 * continuous session about once a minute, so a five-minute recording needs
 * several — but an endless run means the mic is never producing audio.
 */
const MAX_RESTARTS = 8;

function formatClock(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

export function RecordConsole({
  courseId,
  initialSessions,
  courseReady,
  recordingsUsed,
}: {
  courseId: string;
  initialSessions: Session[];
  courseReady: boolean;
  recordingsUsed: number;
}) {
  const [status, setStatus] = useState<Status>("checking");
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [spans, setSpans] = useState<Span[]>([]);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [remainingMs, setRemainingMs] = useState(MAX_RECORDING_MS);
  const [sessions, setSessions] = useState(initialSessions);
  const [used, setUsed] = useState(recordingsUsed);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const transcriptRef = useRef("");
  const startedAtRef = useRef<string | null>(null);
  const manualStopRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const deadlineRef = useRef<number>(0);
  const restartsRef = useRef(0);
  // Guards against a slow live grade landing after a newer one and painting
  // stale colours over fresher speech.
  const liveSeqRef = useRef(0);

  useEffect(() => {
    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    setStatus(Ctor ? "idle" : "unsupported");
  }, []);

  // Unmounting mid-recording must not leave the mic open or timers running.
  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      if (tickRef.current) clearInterval(tickRef.current);
      manualStopRef.current = true;
      recognitionRef.current?.abort();
    },
    [],
  );

  const remaining = Math.max(0, DAILY_LIMITS.recording - used);

  /**
   * Live grading pass. Colours the transcript only — it never produces
   * teaching text, so it cannot interrupt the student mid-explanation.
   */
  const gradeLive = useCallback(
    async (text: string) => {
      const seq = ++liveSeqRef.current;
      try {
        const response = await fetch(`/api/courses/${courseId}/analyze`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ transcript: text, mode: "live" }),
        });
        if (!response.ok) return;
        const json = await response.json();
        if (seq !== liveSeqRef.current) return; // superseded
        if (Array.isArray(json.spans)) setSpans(json.spans);
      } catch {
        // Live colouring is an enhancement; a failed pass must never
        // interrupt the recording.
      }
    },
    [courseId],
  );

  function scheduleLiveGrade() {
    if (!courseReady) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const text = transcriptRef.current.trim();
      if (text.length > 24) void gradeLive(text);
    }, LIVE_DEBOUNCE_MS);
  }

  async function finish() {
    const text = transcriptRef.current.trim();
    setStatus("saving");

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setStatus("idle");
      return;
    }

    const { data, error: insertError } = await supabase
      .from("course_sessions")
      .insert({
        course_id: courseId,
        user_id: user.id,
        transcript: text || null,
        started_at: startedAtRef.current ?? new Date().toISOString(),
        ended_at: new Date().toISOString(),
      })
      .select("id, transcript, started_at, ended_at, score")
      .single<Session>();

    if (insertError || !data) {
      setStatus("idle");
      setError("Couldn't save that session. Try again.");
      return;
    }

    setSessions((prev) => [data, ...prev]);

    // Only now — after the student has stopped — do we ask for teaching.
    if (!courseReady || text.length < 24) {
      setStatus("idle");
      return;
    }

    setStatus("analyzing");
    try {
      const response = await fetch(`/api/courses/${courseId}/analyze`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          transcript: text,
          mode: "final",
          sessionId: data.id,
        }),
      });
      const json = await response.json();
      if (!response.ok) {
        setError(json.error ?? "Couldn't analyse that session.");
      } else {
        if (Array.isArray(json.spans)) setSpans(json.spans);
        if (json.report) {
          setReport(json.report);
          setSessions((prev) =>
            prev.map((s) =>
              s.id === data.id
                ? { ...s, score: Math.round(json.report.score) }
                : s,
            ),
          );
        }
      }
    } catch {
      setError("Couldn't reach the analyser.");
    }
    setStatus("idle");
  }

  async function startRecording() {
    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Ctor) return;

    setError(null);
    setNotice(null);

    // Ask for the microphone FIRST and wait for the user to answer the
    // browser prompt. Two reasons: a denied prompt must not burn one of the
    // day's five recordings, and SpeechRecognition started before the device
    // is actually granted just errors and retries in a loop.
    setStatus("awaiting-mic");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // We only needed the permission grant; SpeechRecognition opens its own
      // capture. Releasing this stops a second mic indicator appearing.
      for (const track of stream.getTracks()) track.stop();
    } catch {
      setStatus("idle");
      setError(
        "TeachItBack needs your microphone. Allow access in the browser prompt (or the padlock in the address bar) and try again.",
      );
      return;
    }

    const supabase = createClient();
    const { data: claimed, error: quotaError } = await supabase.rpc(
      "claim_daily_quota",
      {
        p_kind: "recording",
        p_day: localDay(),
        p_limit: DAILY_LIMITS.recording,
      },
    );

    if (quotaError) {
      setError("Couldn't check your daily limit. Try again.");
      return;
    }
    if (claimed !== true) {
      setError(
        `You've used all ${DAILY_LIMITS.recording} recordings for today. It resets at midnight your time.`,
      );
      setUsed(DAILY_LIMITS.recording);
      return;
    }
    setUsed((u) => u + 1);

    setTranscript("");
    setInterim("");
    setSpans([]);
    setReport(null);
    setNotice(null);
    transcriptRef.current = "";
    startedAtRef.current = new Date().toISOString();
    manualStopRef.current = false;
    restartsRef.current = 0;

    // Hard stop at the cap. The interval only drives the readout; the
    // deadline itself is a timestamp, so a throttled background tab can't
    // let a recording run past five minutes.
    deadlineRef.current = Date.now() + MAX_RECORDING_MS;
    setRemainingMs(MAX_RECORDING_MS);
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = setInterval(() => {
      const left = deadlineRef.current - Date.now();
      setRemainingMs(left);
      if (left <= 0) {
        if (tickRef.current) clearInterval(tickRef.current);
        setNotice("Five-minute limit reached — wrapping up.");
        stopRecording();
      }
    }, 250);

    // A previous instance left alive would fight this one for the device and
    // both would emit "aborted" forever.
    recognitionRef.current?.abort();

    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    // Audio actually flowing is the only reliable proof the mic is live.
    recognition.onaudiostart = () => {
      restartsRef.current = 0;
      setNotice(null);
    };

    recognition.onresult = (event) => {
      let finalChunk = "";
      let interimChunk = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (!result) continue;
        const text = result[0]?.transcript ?? "";
        if (result.isFinal) {
          finalChunk += text;
        } else {
          interimChunk += text;
        }
      }
      if (finalChunk) {
        transcriptRef.current = `${transcriptRef.current} ${finalChunk}`.trim();
        setTranscript(transcriptRef.current);
        scheduleLiveGrade();
      }
      setInterim(interimChunk);
    };

    recognition.onerror = (event) => {
      // Only permission failures are fatal. Chrome fires "network",
      // "aborted", "audio-capture" and "no-speech" routinely in the middle of
      // a healthy session — treating those as fatal was what made recordings
      // stop halfway and save themselves without the student asking.
      if (FATAL_SPEECH_ERRORS.has(event.error)) {
        manualStopRef.current = true;
        setError(
          "Microphone access was blocked. Allow it in your browser and try again.",
        );
        recognition.stop();
        return;
      }
      // Everything else is transient — let onend restart us. Stay silent for
      // the common ones; a notice on every hiccup reads as a broken app.
      if (event.error === "network") {
        setNotice("Speech recognition is having trouble reaching the network.");
      }
    };

    recognition.onend = () => {
      setInterim("");

      if (manualStopRef.current) {
        void finish();
        return;
      }

      // Recognition ended on its own — Chrome caps a continuous session at
      // roughly a minute, and any transient error lands here too. Restart on
      // a fresh tick: calling start() synchronously inside onend throws
      // InvalidStateError because the engine hasn't released yet.
      // Bail out rather than loop forever. Without a budget a mic that never
      // produces audio just cycles "reconnecting" while the student talks
      // into nothing.
      if (restartsRef.current >= MAX_RESTARTS) {
        manualStopRef.current = true;
        setError(
          "Lost the microphone. Check that no other app or tab is using it, then try again.",
        );
        void finish();
        return;
      }
      restartsRef.current += 1;

      restartTimerRef.current = setTimeout(() => {
        if (manualStopRef.current) return;
        try {
          recognition.start();
        } catch {
          manualStopRef.current = true;
          void finish();
        }
      }, 300);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setStatus("recording");
  }

  function stopRecording() {
    manualStopRef.current = true;
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    if (tickRef.current) clearInterval(tickRef.current);
    recognitionRef.current?.stop();
  }

  if (status === "checking") return null;

  if (status === "unsupported") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-surface px-6 py-12 text-center">
        <p className="text-sm font-medium text-strong">
          Live transcription needs Chrome or Edge
        </p>
        <p className="max-w-sm text-sm text-subtle">
          This browser doesn&apos;t support live speech recognition yet. Try
          again in Chrome or Edge.
        </p>
      </div>
    );
  }

  const busy =
    status === "saving" || status === "analyzing" || status === "awaiting-mic";
  const outOfQuota = remaining === 0 && status !== "recording";

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="flex flex-col items-center gap-4 text-center">
        <button
          type="button"
          aria-label={
            status === "recording" ? "Stop recording" : "Start recording"
          }
          onClick={status === "recording" ? stopRecording : startRecording}
          disabled={busy || outOfQuota}
          className={cn(
            "glass flex size-20 items-center justify-center rounded-full transition-transform active:scale-95 disabled:opacity-50",
            status === "recording" && "border-brand/40 bg-brand/10",
          )}
        >
          {status === "recording" ? (
            <Square className="size-7 fill-brand text-brand" />
          ) : (
            <Mic className="size-8 text-brand" />
          )}
        </button>

        <Button
          type="button"
          onClick={status === "recording" ? stopRecording : startRecording}
          disabled={busy || outOfQuota}
          className="h-11 rounded-full bg-brand px-6 font-semibold text-white shadow-[0_0_30px_-8px_var(--color-brand)] transition-transform hover:bg-brand/90 active:scale-[0.97]"
        >
          {status === "awaiting-mic"
            ? "Waiting for microphone…"
            : status === "saving"
              ? "Saving…"
              : status === "analyzing"
                ? "Reading it back…"
                : status === "recording"
                  ? "I'm done"
                  : "Start explaining"}
        </Button>

        {status === "recording" && (
          <p
            className={cn(
              "font-mono text-sm tabular-nums transition-colors duration-300",
              remainingMs <= WARN_AT_MS ? "text-destructive" : "text-subtle",
            )}
          >
            {formatClock(remainingMs)} left
          </p>
        )}

        <p className="font-mono text-[11px] tracking-[0.14em] text-subtle uppercase">
          {remaining} of {DAILY_LIMITS.recording} recordings left today · resets
          at midnight
        </p>

        {notice && <p className="text-xs text-subtle">{notice}</p>}

        {!courseReady && (
          <p className="max-w-sm text-xs text-subtle">
            Generate the course first and your words get graded live against it.
          </p>
        )}

        {error && (
          <p role="alert" className="max-w-sm text-sm text-destructive">
            {error}
          </p>
        )}
      </div>

      {(status === "recording" || transcript) && (
        <div className="w-full max-w-2xl rounded-xl border border-border bg-surface p-4">
          <div className="mb-3 flex items-center gap-4 font-mono text-[10px] tracking-[0.14em] text-subtle uppercase">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-green-500" /> On track
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-red-500" /> Gap
            </span>
            {status === "recording" && (
              <span className="ml-auto text-brand">
                Listening — nothing interrupts you
              </span>
            )}
          </div>

          <p className="min-h-16 text-sm leading-relaxed">
            <ColouredTranscript spans={spans} fallback={transcript} />
            {interim && <span className="text-subtle"> {interim}</span>}
            {status === "recording" && !transcript && !interim && (
              <span className="text-subtle">Listening…</span>
            )}
          </p>
        </div>
      )}

      <AnimatePresence>
        {report && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            className="flex w-full max-w-2xl flex-col gap-4"
          >
            <div className="flex items-center gap-4 rounded-xl border border-border bg-surface p-4">
              <span className="font-mono text-3xl font-semibold text-brand tabular-nums">
                {Math.round(report.score)}
              </span>
              <p className="text-sm text-foreground">{report.verdict}</p>
            </div>

            {report.gaps.map((gap) => (
              <div
                key={gap.phrase}
                className="rounded-xl border border-red-500/30 bg-red-500/[0.06] p-4"
              >
                <p className="font-mono text-[10px] tracking-[0.14em] text-red-500 uppercase">
                  {gap.category.replace("_", " ")}
                </p>
                <p className="mt-2 text-sm text-strong">
                  &ldquo;{gap.phrase}&rdquo;
                </p>
                <p className="mt-2 text-sm whitespace-pre-wrap text-foreground">
                  {gap.explanation}
                </p>
                <p className="mt-3 text-sm font-medium text-brand">
                  {gap.quiz}
                </p>
              </div>
            ))}

            {report.next_focus && (
              <p className="text-sm text-subtle">
                <span className="font-medium text-strong">Next: </span>
                {report.next_focus}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {sessions.length > 0 && (
        <div className="flex w-full max-w-2xl flex-col gap-2">
          <h2 className="text-sm font-medium text-subtle">Past sessions</h2>
          {sessions.map((session) => (
            <div
              key={session.id}
              className="flex items-start gap-3 rounded-lg border border-border bg-surface p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-xs text-subtle">
                  {new Date(session.started_at).toLocaleString()}
                </p>
                <p className="mt-1 line-clamp-2 text-sm text-foreground">
                  {session.transcript || "No speech captured."}
                </p>
              </div>
              {session.score !== null && (
                <span className="font-mono text-sm font-medium text-brand tabular-nums">
                  {session.score}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Renders the transcript with per-span colour. Before the first grade lands
 * there are no spans, so the raw text shows in the neutral colour — the
 * student always sees their words immediately, colour catches up after.
 */
function ColouredTranscript({
  spans,
  fallback,
}: {
  spans: Span[];
  fallback: string;
}) {
  if (spans.length === 0) {
    return <span className="text-foreground">{fallback}</span>;
  }

  return (
    <>
      {spans.map((span, i) => (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: spans are positional
          key={`${i}-${span.text.slice(0, 12)}`}
          title={span.issue ?? undefined}
          className={cn(
            "transition-colors duration-500",
            span.status === "correct" && "text-green-500",
            span.status === "gap" &&
              "rounded bg-red-500/10 font-medium text-red-500 underline decoration-red-500/40 decoration-wavy underline-offset-4",
            span.status === "neutral" && "text-subtle",
          )}
        >
          {span.text}
        </span>
      ))}
    </>
  );
}
