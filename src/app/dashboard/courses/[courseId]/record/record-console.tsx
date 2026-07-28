"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Mic, Square } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { AgentOrchestration } from "~/components/agent-orchestration";
import { ScrollToTargetLink } from "~/components/scroll-to-target-link";
import { Button } from "~/components/ui/button";
import { conciseTeachingText } from "~/lib/ai/presentation";
import type { AgentRun } from "~/lib/ai/schemas";
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
/** Server caption fallback cadence; stays below the transcription RPM limit. */
const LIVE_TRANSCRIBE_MS = 8000;

/**
 * Hard cap on one explanation. Five minutes is well past the point where a
 * teach-back stops being recall and starts being reading aloud, and it keeps
 * a single transcript inside one model context comfortably.
 */
const MAX_RECORDING_MS = 5 * 60_000;

/** Warn when this much time is left, so the ending isn't a surprise. */
const WARN_AT_MS = 30_000;

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

function audioExtension(type: string) {
  if (type.includes("mp4")) return "m4a";
  if (type.includes("ogg")) return "ogg";
  if (type.includes("wav")) return "wav";
  return "webm";
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
  const [agentRun, setAgentRun] = useState<AgentRun | null>(null);
  const [displayedSessionId, setDisplayedSessionId] = useState<string | null>(
    null,
  );
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [failedAnalysis, setFailedAnalysis] = useState<{
    sessionId: string;
    transcript: string;
  } | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioReadyRef = useRef<Promise<Blob | null> | null>(null);
  const transcriptRef = useRef("");
  const startedAtRef = useRef<string | null>(null);
  const manualStopRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const liveTranscribeTimerRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const liveTranscribeBusyRef = useRef(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const deadlineRef = useRef<number>(0);
  const restartsRef = useRef(0);
  const liveCaptionsDisabledRef = useRef(false);
  const finishingRef = useRef(false);
  const browserTranscriptRef = useRef("");
  const serverTranscriptRef = useRef("");
  // Guards against a slow live grade landing after a newer one and painting
  // stale colours over fresher speech.
  const liveSeqRef = useRef(0);

  useEffect(() => {
    const canRecord =
      typeof MediaRecorder !== "undefined" &&
      !!navigator.mediaDevices?.getUserMedia;
    setStatus(canRecord ? "idle" : "unsupported");
  }, []);

  // Unmounting mid-recording must not leave the mic open or timers running.
  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      if (liveTranscribeTimerRef.current) {
        clearInterval(liveTranscribeTimerRef.current);
      }
      if (tickRef.current) clearInterval(tickRef.current);
      manualStopRef.current = true;
      recognitionRef.current?.abort();
      if (mediaRecorderRef.current?.state !== "inactive") {
        mediaRecorderRef.current?.stop();
      }
      for (const track of mediaStreamRef.current?.getTracks() ?? []) {
        track.stop();
      }
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
        if (json.orchestration) setAgentRun(json.orchestration);
      } catch {
        // Live colouring is an enhancement; a failed pass must never
        // interrupt the recording.
      }
    },
    [courseId],
  );

  /**
   * Browser speech recognition depends on a remote browser service and often
   * fails with `network`. When it does, periodically transcribe the complete
   * recording so far and replace the on-screen draft with that newer result.
   */
  const transcribeLiveAudio = useCallback(async () => {
    if (
      liveTranscribeBusyRef.current ||
      manualStopRef.current ||
      audioChunksRef.current.length === 0
    ) {
      return;
    }

    const recorder = mediaRecorderRef.current;
    const type = recorder?.mimeType || "audio/webm";
    const audio = new Blob([...audioChunksRef.current], { type });
    if (!audio.size) return;

    liveTranscribeBusyRef.current = true;
    try {
      const body = new FormData();
      body.set(
        "audio",
        new File([audio], `live.${audioExtension(type)}`, { type }),
      );
      const response = await fetch(`/api/courses/${courseId}/transcribe`, {
        method: "POST",
        body,
      });
      const json = await response.json();
      if (
        response.ok &&
        typeof json.transcript === "string" &&
        json.transcript.trim() &&
        !manualStopRef.current
      ) {
        const text = json.transcript.trim();
        serverTranscriptRef.current = text;
        transcriptRef.current = text;
        setTranscript(text);
        setInterim("");
      }
    } catch {
      // The final full-audio transcription remains the source of truth.
    } finally {
      liveTranscribeBusyRef.current = false;
    }
  }, [courseId]);

  function startServerCaptions() {
    if (liveTranscribeTimerRef.current) return;
    setNotice(
      "Live captions are using the secure audio fallback and will update every few seconds.",
    );
    liveTranscribeTimerRef.current = setInterval(() => {
      void transcribeLiveAudio();
    }, LIVE_TRANSCRIBE_MS);
  }

  function scheduleLiveGrade() {
    if (!courseReady) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const text = transcriptRef.current.trim();
      if (text.length > 24) void gradeLive(text);
    }, LIVE_DEBOUNCE_MS);
  }

  async function stopAudioCapture() {
    const recorder = mediaRecorderRef.current;
    const audioReady = audioReadyRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
    const audio = audioReady ? await audioReady : null;
    mediaRecorderRef.current = null;
    mediaStreamRef.current = null;
    audioReadyRef.current = null;
    return audio;
  }

  async function finish() {
    if (finishingRef.current) return;
    finishingRef.current = true;
    if (tickRef.current) clearInterval(tickRef.current);
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    if (liveTranscribeTimerRef.current) {
      clearInterval(liveTranscribeTimerRef.current);
      liveTranscribeTimerRef.current = null;
    }
    recognitionRef.current = null;
    setStatus("saving");

    let text = transcriptRef.current.trim();
    const audio = await stopAudioCapture();

    // Browser speech recognition is useful for live colour, but it depends on
    // a remote browser service that is frequently unavailable. The recorded
    // audio is the source of truth once the student finishes.
    if (audio?.size) {
      try {
        const body = new FormData();
        body.set(
          "audio",
          new File([audio], `recording.${audioExtension(audio.type)}`, {
            type: audio.type || "audio/webm",
          }),
        );
        const response = await fetch(`/api/courses/${courseId}/transcribe`, {
          method: "POST",
          body,
        });
        const json = await response.json();
        if (response.ok && typeof json.transcript === "string") {
          text = json.transcript.trim();
          transcriptRef.current = text;
          setTranscript(text);
          setInterim("");
        } else if (!text) {
          setError(json.error ?? "Couldn't transcribe that recording.");
        }
      } catch {
        if (!text) setError("Couldn't reach the transcription service.");
      }
    }

    if (!text) {
      setStatus("idle");
      finishingRef.current = false;
      return;
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setStatus("idle");
      finishingRef.current = false;
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
      finishingRef.current = false;
      return;
    }

    setSessions((prev) => [data, ...prev]);
    setDisplayedSessionId(data.id);

    // Only now — after the student has stopped — do we ask for teaching.
    if (!courseReady || text.length < 24) {
      setStatus("idle");
      finishingRef.current = false;
      return;
    }

    setStatus("analyzing");
    await analyzeSession(text, data.id);
    setStatus("idle");
    finishingRef.current = false;
  }

  async function analyzeSession(text: string, sessionId: string) {
    try {
      const response = await fetch(`/api/courses/${courseId}/analyze`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          transcript: text,
          mode: "final",
          sessionId,
        }),
      });
      const json = await response.json();
      if (!response.ok) {
        setError(json.error ?? "Couldn't analyse that session.");
        setFailedAnalysis({ sessionId, transcript: text });
        return;
      }

      setFailedAnalysis(null);
      if (Array.isArray(json.spans)) setSpans(json.spans);
      if (json.orchestration) setAgentRun(json.orchestration);
      if (json.report) {
        setReport(json.report);
        setDisplayedSessionId(sessionId);
        setSessions((prev) =>
          prev.map((session) =>
            session.id === sessionId
              ? { ...session, score: Math.round(json.report.score) }
              : session,
          ),
        );
      }
    } catch {
      setError("Couldn't reach the analyser.");
      setFailedAnalysis({ sessionId, transcript: text });
    }
  }

  async function retryAnalysis(session: Session) {
    const text = session.transcript?.trim();
    if (!text || text.length < 24) return;
    setError(null);
    setStatus("analyzing");
    await analyzeSession(text, session.id);
    setStatus("idle");
  }

  async function retryGapCoach() {
    if (!failedAnalysis) return;
    setError(null);
    setStatus("analyzing");
    await analyzeSession(failedAnalysis.transcript, failedAnalysis.sessionId);
    setStatus("idle");
  }

  async function deleteSession(sessionId: string) {
    setDeletingId(sessionId);
    setError(null);

    const supabase = createClient();
    const { data: deleted, error: deleteError } = await supabase
      .from("course_sessions")
      .delete()
      .eq("id", sessionId)
      .select("id")
      .single<{ id: string }>();

    if (deleteError || !deleted) {
      setError("Couldn't delete that session. Try again.");
      setDeletingId(null);
      return;
    }

    setSessions((previous) =>
      previous.filter((session) => session.id !== sessionId),
    );
    setConfirmDeleteId(null);
    setDeletingId(null);
    if (failedAnalysis?.sessionId === sessionId) setFailedAnalysis(null);

    if (displayedSessionId === sessionId) {
      setDisplayedSessionId(null);
      setTranscript("");
      setInterim("");
      setSpans([]);
      setReport(null);
      setAgentRun(null);
      transcriptRef.current = "";
    }
  }

  async function startRecording() {
    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;

    // Dispose of a completed engine before resetting this session's stop
    // guard. A late `onend` from the old instance must not finish the new
    // recording.
    manualStopRef.current = true;
    const previousRecognition = recognitionRef.current;
    if (previousRecognition) {
      previousRecognition.onend = null;
      previousRecognition.onerror = null;
      previousRecognition.onresult = null;
      previousRecognition.abort();
    }
    recognitionRef.current = null;

    setError(null);
    setNotice(null);
    setFailedAnalysis(null);

    // Ask for the microphone FIRST and wait for the user to answer the
    // browser prompt. A denied prompt must not burn one of the day's five
    // recordings.
    setStatus("awaiting-mic");
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setStatus("idle");
      setError(
        "Ropes needs your microphone. Allow access in the browser prompt (or the padlock in the address bar) and try again.",
      );
      return;
    }

    let recorder: MediaRecorder;
    try {
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "";
      recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    } catch {
      for (const track of stream.getTracks()) track.stop();
      setStatus("idle");
      setError("This browser couldn't start an audio recording. Try again.");
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
      for (const track of stream.getTracks()) track.stop();
      setStatus("idle");
      setError("Couldn't check your daily limit. Try again.");
      return;
    }
    if (claimed !== true) {
      for (const track of stream.getTracks()) track.stop();
      setStatus("idle");
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
    setAgentRun(null);
    setDisplayedSessionId(null);
    setNotice(null);
    transcriptRef.current = "";
    browserTranscriptRef.current = "";
    serverTranscriptRef.current = "";
    startedAtRef.current = new Date().toISOString();
    manualStopRef.current = false;
    restartsRef.current = 0;
    liveCaptionsDisabledRef.current = false;
    finishingRef.current = false;

    // Capture audio locally for the entire session. Browser speech
    // recognition can still colour words live, but this recording is what
    // makes the final transcript independent of that remote browser service.
    audioChunksRef.current = [];
    mediaStreamRef.current = stream;
    mediaRecorderRef.current = recorder;
    audioReadyRef.current = new Promise((resolve) => {
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        for (const track of stream.getTracks()) track.stop();
        resolve(
          audioChunksRef.current.length > 0
            ? new Blob(audioChunksRef.current, {
                type: recorder.mimeType || "audio/webm",
              })
            : null,
        );
      };
    });
    recorder.start(1000);

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

    if (!Ctor) {
      startServerCaptions();
      setStatus("recording");
      return;
    }

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
        browserTranscriptRef.current =
          `${browserTranscriptRef.current} ${finalChunk}`.trim();
        if (!serverTranscriptRef.current) {
          transcriptRef.current = browserTranscriptRef.current;
          setTranscript(transcriptRef.current);
        }
        scheduleLiveGrade();
      }
      setInterim(interimChunk);
    };

    recognition.onerror = (event) => {
      // Failure of the browser's remote caption service must never stop the
      // local MediaRecorder stream. The final server transcript still works.
      if (
        event.error === "not-allowed" ||
        event.error === "service-not-allowed"
      ) {
        liveCaptionsDisabledRef.current = true;
        startServerCaptions();
        recognition.abort();
        return;
      }
      if (event.error === "network") {
        startServerCaptions();
      }
    };

    recognition.onend = () => {
      setInterim("");

      if (manualStopRef.current) {
        void finish();
        return;
      }
      if (liveCaptionsDisabledRef.current) return;

      // Recognition ended on its own — Chrome caps a continuous session at
      // roughly a minute, and any transient error lands here too. Restart on
      // a fresh tick: calling start() synchronously inside onend throws
      // InvalidStateError because the engine hasn't released yet.
      // Bail out rather than loop forever. Without a budget a mic that never
      // produces captions just cycles forever. The audio recorder remains
      // healthy, so disable captions and let the student keep explaining.
      if (restartsRef.current >= MAX_RESTARTS) {
        liveCaptionsDisabledRef.current = true;
        recognitionRef.current = null;
        startServerCaptions();
        return;
      }
      restartsRef.current += 1;

      restartTimerRef.current = setTimeout(() => {
        if (manualStopRef.current) return;
        try {
          recognition.start();
        } catch {
          liveCaptionsDisabledRef.current = true;
          recognitionRef.current = null;
          startServerCaptions();
        }
      }, 300);
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      liveCaptionsDisabledRef.current = true;
      recognitionRef.current = null;
      startServerCaptions();
    }
    setStatus("recording");
  }

  function stopRecording() {
    manualStopRef.current = true;
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    if (tickRef.current) clearInterval(tickRef.current);
    const recognition = recognitionRef.current;
    if (!recognition || liveCaptionsDisabledRef.current) {
      void finish();
      return;
    }
    try {
      recognition.stop();
    } catch {
      void finish();
    }
  }

  if (status === "checking") return null;

  if (status === "unsupported") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-surface px-6 py-12 text-center">
        <p className="text-sm font-medium text-strong">
          Recording isn&apos;t supported in this browser
        </p>
        <p className="max-w-sm text-sm text-subtle">
          Try a current version of Chrome, Edge, Firefox, or Safari.
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
          <div
            role="alert"
            className="flex max-w-sm flex-col items-center gap-2"
          >
            <p className="text-sm text-destructive">{error}</p>
            {failedAnalysis && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={status !== "idle"}
                onClick={() => void retryGapCoach()}
                className="rounded-full"
              >
                {status === "analyzing" ? "Retrying…" : "Retry Gap Coach"}
              </Button>
            )}
          </div>
        )}
      </div>

      <AgentOrchestration
        run={agentRun}
        running={status === "analyzing"}
        pipeline="recording"
        className="w-full max-w-2xl"
      />

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
            <ColouredTranscript
              spans={spans}
              fallback={transcript}
              gaps={report?.gaps ?? []}
            />
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

            {report.gaps.map((gap, index) => (
              <div
                key={gap.phrase}
                id={`record-gap-${index}`}
                tabIndex={-1}
                className="scroll-mt-24 rounded-xl border border-red-500/30 bg-red-500/[0.06] p-4"
              >
                <p className="font-mono text-[10px] tracking-[0.14em] text-red-500 uppercase">
                  {gap.category.replace("_", " ")}
                </p>
                <p className="mt-2 text-sm text-strong">
                  &ldquo;{gap.phrase}&rdquo;
                </p>
                <p className="mt-2 text-sm whitespace-pre-wrap text-foreground">
                  <span className="font-semibold text-strong">
                    Explanation:{" "}
                  </span>
                  {conciseTeachingText(gap.explanation)}
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
              className="flex flex-wrap items-start gap-3 rounded-lg border border-border bg-surface p-3"
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
              {session.transcript && session.transcript.trim().length >= 24 && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={status !== "idle"}
                  onClick={() => void retryAnalysis(session)}
                  className="shrink-0 rounded-full"
                >
                  {session.score === null ? "Build gap report" : "Recheck"}
                </Button>
              )}
              {confirmDeleteId === session.id ? (
                <fieldset
                  aria-label={`Confirm deleting session from ${new Date(session.started_at).toLocaleString()}`}
                  className="flex shrink-0 items-center gap-1.5 border-0 p-0"
                >
                  <span className="text-xs text-subtle">Are you sure?</span>
                  <Button
                    type="button"
                    size="xs"
                    variant="destructive"
                    disabled={deletingId === session.id}
                    onClick={() => void deleteSession(session.id)}
                  >
                    {deletingId === session.id ? "Deleting…" : "Yes"}
                  </Button>
                  <Button
                    type="button"
                    size="xs"
                    variant="ghost"
                    disabled={deletingId === session.id}
                    onClick={() => setConfirmDeleteId(null)}
                  >
                    No
                  </Button>
                </fieldset>
              ) : (
                <Button
                  type="button"
                  size="xs"
                  variant="destructive"
                  disabled={deletingId !== null || status !== "idle"}
                  onClick={() => setConfirmDeleteId(session.id)}
                  aria-label={`Delete session from ${new Date(session.started_at).toLocaleString()}`}
                >
                  Delete
                </Button>
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
  gaps,
}: {
  spans: Span[];
  fallback: string;
  gaps: Report["gaps"];
}) {
  if (spans.length === 0) {
    return <span className="text-foreground">{fallback}</span>;
  }

  return (
    <>
      {spans.map((span, i) => {
        const normalizedSpan = span.text.toLowerCase().replace(/\W+/g, " ");
        const matchingGap =
          span.status === "gap"
            ? gaps.findIndex((gap) => {
                const phrase = gap.phrase.toLowerCase().replace(/\W+/g, " ");
                return (
                  phrase.length > 0 &&
                  (normalizedSpan.includes(phrase) ||
                    phrase.includes(normalizedSpan))
                );
              })
            : -1;
        const linkedGap =
          matchingGap >= 0
            ? matchingGap
            : gaps.length > 0
              ? i % gaps.length
              : -1;
        const className = cn(
          "transition-colors duration-500",
          span.status === "correct" && "text-green-500",
          span.status === "gap" &&
            "rounded bg-red-500/10 font-medium text-red-500",
          span.status === "neutral" && "text-subtle",
        );

        return span.status === "gap" && linkedGap >= 0 ? (
          <ScrollToTargetLink
            // biome-ignore lint/suspicious/noArrayIndexKey: spans are positional
            key={`${i}-${span.text.slice(0, 12)}`}
            targetId={`record-gap-${linkedGap}`}
            title={span.issue ?? "Jump to this explanation"}
            className={cn(
              className,
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50",
            )}
          >
            {span.text}
          </ScrollToTargetLink>
        ) : (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: spans are positional
            key={`${i}-${span.text.slice(0, 12)}`}
            title={span.issue ?? undefined}
            className={className}
          >
            {span.text}
          </span>
        );
      })}
    </>
  );
}
