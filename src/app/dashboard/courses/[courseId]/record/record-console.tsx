"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Mic, Square } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AgentOrchestration } from "~/components/agent-orchestration";
import { ScrollToTargetLink } from "~/components/scroll-to-target-link";
import { Button } from "~/components/ui/button";
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

/**
 * How long the student must pause before we re-grade what they've said.
 *
 * This was the whole latency problem: a 2.2s wait before the request even left
 * the browser, on top of a ~0.4s model call. Recognition already fires this on
 * a finalised phrase, so the debounce only needs to coalesce the burst of
 * results that arrive together at a sentence boundary. 150ms does that, and
 * with a measured ~460ms median for the grading call it puts colour on screen
 * roughly 600-700ms after a phrase ends — the model round trip is the floor
 * now, not the wait.
 */
const LIVE_DEBOUNCE_MS = 150;
/** Server caption fallback cadence; stays below the transcription RPM limit. */
const LIVE_TRANSCRIBE_MS = 4000;
/**
 * Shortest utterance worth grading. Below this there isn't enough of a claim to
 * judge, and a request per syllable would burn the minute's token budget.
 */
const LIVE_GRADE_MIN_CHARS = 12;

/**
 * How much of the explanation one live pass re-grades.
 *
 * The pass used to send the whole transcript every time and ask the model to
 * re-segment all of it. Both halves of that grow with the recording: the prompt
 * gets longer, and — the expensive half — the model has to re-emit span JSON for
 * every word already on screen. A minute in, a pass that started at ~450ms was
 * taking several seconds and eventually overrunning the 900-token span budget
 * entirely, which is why colour crawled to a stop the longer someone spoke.
 *
 * Only the newest stretch of speech can actually change status, so only that is
 * sent. Everything before it is already graded, is frozen client-side, and stays
 * on screen untouched. Work per pass is now flat: the tail is the same size at
 * three minutes as it was at three seconds, so the round trip is too.
 */
const LIVE_GRADE_WINDOW_CHARS = 700;
/**
 * How much already-graded speech rides along as read-only context, so a sentence
 * that back-references what came before ("which is why it doubles") is still
 * judgeable. Costs prompt tokens only — the model returns no spans for it.
 */
const LIVE_CONTEXT_CHARS = 600;

/**
 * How often to write the transcript so far into the session row. Frequent enough
 * that an abandoned tab keeps nearly everything, infrequent enough not to be a
 * write every keystroke of speech.
 */
const AUTOSAVE_MS = 10_000;
const LIVE_REQUEST_TIMEOUT_MS = 20_000;
const TRANSCRIBE_TIMEOUT_MS = 45_000;
const ANALYZE_TIMEOUT_MS = 60_000;
const AUDIO_STOP_TIMEOUT_MS = 5_000;

/**
 * How long to wait for `onend` after asking recognition to stop.
 *
 * `stop()` is a request, not a guarantee: an engine whose remote caption service
 * has dropped, or one that already ended while still held in the ref, never
 * fires the event. Waiting on it alone means the session is never saved and the
 * student sees a stopped timer and nothing else — no row, no report, no error.
 * `finish()` guards itself with `finishingRef`, so a late `onend` after this
 * fires is a harmless no-op.
 */
const STOP_WATCHDOG_MS = 2_500;

/**
 * Hard cap on one explanation. Three minutes is past the point where a
 * teach-back stops being recall and starts being reading aloud, and it keeps
 * a single transcript inside one model context comfortably.
 */
const MAX_RECORDING_MS = 3 * 60_000;

/** Warn when this much time is left, so the ending isn't a surprise. */
const WARN_AT_MS = 30_000;

/**
 * How many silent restarts to tolerate before giving up. Chrome ends a
 * continuous session about once a minute, so a three-minute recording needs
 * several — but an endless run means the mic is never producing audio.
 */
const MAX_RESTARTS = 6;

/**
 * How many failed audio-fallback caption passes to tolerate before dropping
 * live captions for the rest of the session. Safari's fragmented-MP4 chunks
 * aren't always decodable as a prefix, so a partial upload can fail every
 * time — retrying it forever wastes a transcription call every few seconds
 * when the complete recording at the end will transcribe fine.
 */
const MAX_LIVE_CAPTION_FAILURES = 3;

/**
 * Safari exposes `webkitSpeechRecognition`, but starting it takes over audio
 * input and tears down the `getUserMedia` stream that MediaRecorder is writing
 * from — trading the local recording (which the final transcript depends on)
 * for captions that Apple's service frequently refuses anyway. WebKit gets
 * server captions from the first second instead.
 */
function browserCaptionsUsable() {
  if (typeof navigator === "undefined") return false;
  const isAppleWebKit =
    /apple/i.test(navigator.vendor) &&
    !/chrome|chromium|edg\//i.test(navigator.userAgent);
  return !isAppleWebKit;
}

type ApiPayload = {
  error?: string;
  transcript?: string;
  spans?: Span[];
  report?: Report;
  orchestration?: AgentRun;
};

async function fetchJson(
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(input, { ...init, signal: controller.signal });
    const body = await response.text();
    let json: ApiPayload = {};
    if (body) {
      try {
        json = JSON.parse(body) as ApiPayload;
      } catch {
        json = {
          error: response.ok
            ? "The server returned an unreadable response."
            : `The request failed (${response.status}).`,
        };
      }
    }
    return { response, json };
  } finally {
    clearTimeout(timeout);
  }
}

function requestTimedOut(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

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
  unlimited,
}: {
  courseId: string;
  initialSessions: Session[];
  courseReady: boolean;
  recordingsUsed: number;
  unlimited: boolean;
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
  const [loadingCheckId, setLoadingCheckId] = useState<string | null>(null);

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
  const stopWatchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The row for the recording in progress. Created up front so that closing the
  // tab, a crash, or any failure in the stop path still leaves the attempt in
  // the database rather than losing it entirely.
  const sessionRowIdRef = useRef<string | null>(null);
  const autosaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSavedTranscriptRef = useRef("");
  const liveTranscribeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const liveTranscribeBusyRef = useRef(false);
  const liveTranscribeFailuresRef = useRef(0);
  // Index of the first audio chunk this session hasn't sent for captions yet.
  // Each pass uploads only what's new, so a caption request costs the same at
  // three minutes as at three seconds.
  const liveChunkCursorRef = useRef(0);
  const liveIncrementalRef = useRef(true);
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
  const liveGradeInFlightRef = useRef(false);
  const livePendingTextRef = useRef<string | null>(null);
  // The already-graded head of the transcript: the spans for it, and the exact
  // text they cover. Live passes only ever grade what comes after this, and
  // these spans are re-used verbatim rather than re-requested.
  const gradedSpansRef = useRef<Span[]>([]);
  const gradedTextRef = useRef("");
  // Lets the in-flight pass re-enter itself without `gradeLive` depending on
  // its own identity, which would make the callback un-memoisable.
  const gradeLiveRef = useRef<((text: string) => Promise<void>) | null>(null);

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
      if (stopWatchdogRef.current) clearTimeout(stopWatchdogRef.current);
      if (autosaveTimerRef.current) clearInterval(autosaveTimerRef.current);
      if (liveTranscribeTimerRef.current) {
        clearTimeout(liveTranscribeTimerRef.current);
        liveTranscribeTimerRef.current = null;
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

  const remaining = unlimited
    ? Number.POSITIVE_INFINITY
    : Math.max(0, DAILY_LIMITS.recording - used);

  /** Forget the frozen head, so the next pass grades the transcript afresh. */
  const resetGradedHead = useCallback(() => {
    gradedSpansRef.current = [];
    gradedTextRef.current = "";
  }, []);

  /**
   * Live grading pass. Colours the transcript only — it never produces
   * teaching text, so it cannot interrupt the student mid-explanation.
   *
   * Grades the ungraded tail of `text` rather than all of it. Spans for the
   * head are already on screen and are kept as they are; once the tail grows
   * past the window, its leading spans are frozen into the head too. That is
   * what keeps every pass the same size, and so the same speed, however long
   * the student talks.
   */
  const gradeLive = useCallback(
    async (text: string) => {
      // At a 150ms debounce and ~400ms responses, phrases arrive faster than
      // grades come back. Run one at a time and remember only the newest text:
      // overlapping calls would spend the small model's per-minute budget
      // grading transcripts that a later pass immediately supersedes anyway.
      if (liveGradeInFlightRef.current) {
        livePendingTextRef.current = text;
        return;
      }

      // The head is only re-usable while it is still a prefix of what's on
      // screen. A caption pass that rewrites earlier words instead of appending
      // invalidates it, and re-grading from scratch is the honest response.
      if (!text.startsWith(gradedTextRef.current)) resetGradedHead();

      const head = gradedTextRef.current;
      const tail = text.slice(head.length);
      if (tail.trim().length < LIVE_GRADE_MIN_CHARS) return;
      const context = head.slice(-LIVE_CONTEXT_CHARS);

      liveGradeInFlightRef.current = true;
      const seq = ++liveSeqRef.current;
      try {
        const { response, json } = await fetchJson(
          `/api/courses/${courseId}/analyze`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              transcript: tail,
              mode: "live",
              ...(context ? { context } : {}),
            }),
          },
          LIVE_REQUEST_TIMEOUT_MS,
        );
        if (!response.ok) return;
        if (seq !== liveSeqRef.current) return; // superseded
        // A pass that started before a reset would splice its tail spans onto
        // a head that no longer exists, mismatching text and colour.
        if (gradedTextRef.current !== head) return;
        if (json.orchestration) setAgentRun(json.orchestration);
        if (!Array.isArray(json.spans)) return;

        const tailSpans = json.spans;
        setSpans([...gradedSpansRef.current, ...tailSpans]);

        // Freeze the front of the tail until what's left fits the window
        // again. The server reconciles spans against the exact text it was
        // sent, so their concatenation is that text — advancing the head by
        // the lengths of the spans moved keeps the two in step.
        const tailLength = tailSpans.reduce(
          (total, span) => total + span.text.length,
          0,
        );
        // Freezing means trusting span lengths to index back into the text. The
        // server reconciles spans so this always holds; if it somehow doesn't,
        // skip the freeze rather than advance the head to the wrong offset and
        // colour every later word one span out of place.
        if (tailLength !== tail.length) return;
        const excess = tailLength - LIVE_GRADE_WINDOW_CHARS;
        if (excess <= 0) return;
        let frozenChars = 0;
        const frozen: Span[] = [];
        for (const span of tailSpans) {
          if (frozenChars >= excess) break;
          frozen.push(span);
          frozenChars += span.text.length;
        }
        gradedSpansRef.current = [...gradedSpansRef.current, ...frozen];
        gradedTextRef.current = head + tail.slice(0, frozenChars);
      } catch {
        // Live colouring is an enhancement; a failed pass must never
        // interrupt the recording.
      } finally {
        liveGradeInFlightRef.current = false;
        const pending = livePendingTextRef.current;
        livePendingTextRef.current = null;
        // Whatever was said while this pass was in flight gets graded next,
        // straight away rather than waiting for another phrase to land.
        if (pending && !manualStopRef.current)
          void gradeLiveRef.current?.(pending);
      }
    },
    [courseId, resetGradedHead],
  );

  // Kept in a ref so the coalescing tail-call above can reach the latest one.
  gradeLiveRef.current = gradeLive;

  /**
   * Browser speech recognition depends on a remote browser service and often
   * fails with `network`. When it does, periodically transcribe the complete
   * recording so far and replace the on-screen draft with that newer result.
   */
  /**
   * Give up on live captions after repeated failures. The recording itself is
   * untouched — it still transcribes in full when the student finishes — so
   * this only stops burning a call every few seconds on audio the service
   * can't decode mid-stream.
   */
  const noteLiveCaptionFailure = useCallback(() => {
    liveTranscribeFailuresRef.current += 1;
    if (liveTranscribeFailuresRef.current < MAX_LIVE_CAPTION_FAILURES) return;
    if (liveTranscribeTimerRef.current) {
      clearTimeout(liveTranscribeTimerRef.current);
      liveTranscribeTimerRef.current = null;
    }
    setNotice(
      "Live captions aren't available in this browser. Keep going — your full transcript arrives when you finish.",
    );
  }, []);

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
    const chunks = audioChunksRef.current;
    // Send only the seconds recorded since the last pass. Re-uploading the
    // whole recording every few seconds was the reason captions crawled: at
    // one minute in, each pass was posting a minute of audio and waiting for a
    // minute of audio to be transcribed, and it got worse every pass. The first
    // chunk carries the container header, so later chunks need it prepended to
    // decode on their own.
    const sentThrough = chunks.length;
    const cursor = liveChunkCursorRef.current;
    const header = chunks[0];
    const incremental = liveIncrementalRef.current && cursor > 0 && !!header;
    if (incremental && sentThrough <= cursor) return;
    const parts = incremental ? [header, ...chunks.slice(cursor)] : [...chunks];
    const audio = new Blob(parts, { type });
    if (!audio.size) return;

    liveTranscribeBusyRef.current = true;
    try {
      const body = new FormData();
      body.set(
        "audio",
        new File([audio], `live.${audioExtension(type)}`, { type }),
      );
      const { response, json } = await fetchJson(
        `/api/courses/${courseId}/transcribe`,
        { method: "POST", body },
        TRANSCRIBE_TIMEOUT_MS,
      );
      if (manualStopRef.current) return;

      const heard =
        response.ok && typeof json.transcript === "string"
          ? json.transcript.trim()
          : "";

      // 422 is "no speech in this audio", which for a four-second window is
      // just a pause. Treat it, and an empty success, as heard-nothing: the
      // window was still decoded, so move the cursor past it and say nothing.
      if (!heard) {
        if (response.ok || response.status === 422) {
          liveTranscribeFailuresRef.current = 0;
          liveChunkCursorRef.current = sentThrough;
        } else if (incremental) {
          // Not every container survives being cut at a chunk boundary. Fall
          // back to whole-recording passes — slower, and they degrade again
          // over a long recording, but correct — rather than spending the
          // failure budget on a slicing strategy this browser can't produce.
          liveIncrementalRef.current = false;
          liveChunkCursorRef.current = 0;
        } else {
          noteLiveCaptionFailure();
        }
        return;
      }

      liveTranscribeFailuresRef.current = 0;
      liveChunkCursorRef.current = sentThrough;
      // An incremental pass transcribed only the new seconds, so it extends the
      // transcript instead of replacing it. Appending is also what keeps the
      // graded head valid: a pass that rewrote earlier words would throw away
      // every span already on screen and force a full re-grade.
      const text = incremental
        ? `${serverTranscriptRef.current} ${heard}`.trim()
        : heard;
      serverTranscriptRef.current = text;
      transcriptRef.current = text;
      setTranscript(text);
      setInterim("");
      // Grade it. Only `recognition.onresult` used to do this, so on every path
      // that falls back to server captions — Safari and Firefox always, Chrome
      // whenever its caption service drops — the transcript grew while staying
      // grey until the final pass. No debounce here: these arrive on a fixed
      // cadence already, so there is no burst to coalesce.
      if (courseReady && text.length >= LIVE_GRADE_MIN_CHARS) {
        void gradeLiveRef.current?.(text);
      }
    } catch {
      // The final full-audio transcription remains the source of truth.
      noteLiveCaptionFailure();
    } finally {
      liveTranscribeBusyRef.current = false;
    }
  }, [courseId, courseReady, noteLiveCaptionFailure]);

  /**
   * Caption loop.
   *
   * Each pass schedules the next one after it settles rather than running on a
   * fixed interval. An interval fires whether or not the previous pass came
   * back, and every tick that landed on a busy pass was simply dropped — so a
   * slow pass didn't just take longer, it also cost the ticks behind it, and
   * the gap between captions grew far past the cadence. Chaining gives a steady
   * `LIVE_TRANSCRIBE_MS` between passes with no dropped turns.
   */
  const captionLoopRef = useRef<(() => void) | null>(null);
  captionLoopRef.current = () => {
    liveTranscribeTimerRef.current = setTimeout(async () => {
      await transcribeLiveAudio();
      if (manualStopRef.current || !liveTranscribeTimerRef.current) return;
      captionLoopRef.current?.();
    }, LIVE_TRANSCRIBE_MS);
  };

  function startServerCaptions() {
    if (liveTranscribeTimerRef.current) return;
    setNotice(
      "Captions in this browser transcribe your audio server-side, so they update every few seconds instead of word by word.",
    );
    captionLoopRef.current?.();
  }

  function scheduleLiveGrade() {
    if (!courseReady) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const text = transcriptRef.current.trim();
      if (text.length >= LIVE_GRADE_MIN_CHARS) void gradeLive(text);
    }, LIVE_DEBOUNCE_MS);
  }

  /**
   * Claims the database row for this attempt before a single word is spoken.
   *
   * Everything that saves a recording used to happen after the student stopped,
   * which made the whole attempt contingent on the stop path completing. With the
   * row already present, a closed tab or a stop that never fires costs at most
   * the last few seconds of transcript, not the session.
   */
  async function createSessionRow(startedAt: string) {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error: createError } = await supabase
        .from("course_sessions")
        .insert({
          course_id: courseId,
          user_id: user.id,
          transcript: null,
          started_at: startedAt,
        })
        .select("id")
        .single<{ id: string }>();
      if (createError || !data) {
        // Not fatal: `finish()` falls back to inserting. Log so a policy or
        // schema problem is visible rather than silently costing the backup.
        console.error("Session pre-create failed:", createError);
        return;
      }
      sessionRowIdRef.current = data.id;
    } catch (error) {
      console.error("Session pre-create threw:", error);
    }
  }

  /** Best-effort periodic flush so an abandoned tab keeps most of the speech. */
  const flushTranscript = useCallback(async () => {
    const id = sessionRowIdRef.current;
    const text = transcriptRef.current.trim();
    if (!id || !text || text === lastSavedTranscriptRef.current) return;
    lastSavedTranscriptRef.current = text;
    try {
      const supabase = createClient();
      await supabase
        .from("course_sessions")
        .update({ transcript: text })
        .eq("id", id);
    } catch {
      // The final write in `finish()` is the one that matters.
    }
  }, []);

  // Leaving the page mid-recording: write whatever has been transcribed so far.
  // `pagehide` fires on tab close, navigation and mobile backgrounding, where
  // `beforeunload` is unreliable. Best effort by design — the row already exists,
  // so the worst case is losing the last few seconds, not the attempt.
  useEffect(() => {
    const onHide = () => {
      if (sessionRowIdRef.current) void flushTranscript();
    };
    window.addEventListener("pagehide", onHide);
    return () => window.removeEventListener("pagehide", onHide);
  }, [flushTranscript]);

  async function stopAudioCapture() {
    const recorder = mediaRecorderRef.current;
    const audioReady = audioReadyRef.current;
    if (recorder && recorder.state !== "inactive") {
      try {
        recorder.requestData();
        recorder.stop();
      } catch {
        // The browser may already have stopped the recorder. The chunks
        // collected so far remain usable.
      }
    }
    let audio = audioReady
      ? await Promise.race([
          audioReady,
          new Promise<null>((resolve) =>
            setTimeout(() => resolve(null), AUDIO_STOP_TIMEOUT_MS),
          ),
        ])
      : null;

    // A slow or missing `onstop` used to cost the student the entire recording:
    // the race resolved null and the chunks already collected were dropped on
    // the floor. They are a complete recording of everything up to the stop, so
    // assemble them rather than discarding minutes of speech.
    if (!audio && audioChunksRef.current.length > 0) {
      audio = new Blob([...audioChunksRef.current], {
        type: recorder?.mimeType || "audio/webm",
      });
    }

    for (const track of mediaStreamRef.current?.getTracks() ?? []) track.stop();
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
    if (stopWatchdogRef.current) {
      clearTimeout(stopWatchdogRef.current);
      stopWatchdogRef.current = null;
    }
    if (autosaveTimerRef.current) {
      clearInterval(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    if (liveTranscribeTimerRef.current) {
      clearTimeout(liveTranscribeTimerRef.current);
      liveTranscribeTimerRef.current = null;
    }
    recognitionRef.current = null;
    setStatus("saving");

    try {
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
          const { response, json } = await fetchJson(
            `/api/courses/${courseId}/transcribe`,
            { method: "POST", body },
            TRANSCRIBE_TIMEOUT_MS,
          );
          if (response.ok && typeof json.transcript === "string") {
            text = json.transcript.trim();
            transcriptRef.current = text;
            setTranscript(text);
            setInterim("");
          } else if (!text) {
            setError(json.error ?? "Couldn't transcribe that recording.");
          }
        } catch (transcribeError) {
          if (!text) {
            setError(
              requestTimedOut(transcribeError)
                ? "Transcription took too long. Your recording is safe; try again."
                : "Couldn't reach the transcription service.",
            );
          }
        }
      }

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError(
          "Your sign-in expired. Sign in again; the transcript is still on screen.",
        );
        return;
      }

      // The row usually already exists — it is created when recording starts so
      // that leaving the page cannot lose the attempt. Update it when it does,
      // insert when the up-front create didn't get through.
      const existingId = sessionRowIdRef.current;
      const { data, error: insertError } = existingId
        ? await supabase
            .from("course_sessions")
            .update({
              transcript: text || null,
              ended_at: new Date().toISOString(),
            })
            .eq("id", existingId)
            .eq("user_id", user.id)
            .select("id, transcript, started_at, ended_at, score")
            .single<Session>()
        : await supabase
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
        // Name the database's own reason. "Couldn't save that session" is
        // indistinguishable from a missing policy, a missing column, or an
        // expired session, and the recording is gone by the time anyone looks.
        console.error("Session insert failed:", insertError);
        setError(
          insertError?.message
            ? `Couldn't save that session: ${insertError.message}`
            : "Couldn't save that session. Try again.",
        );
        return;
      }

      // Filter by id first: the row may already be in the list if it was
      // pre-created and the page has since been reloaded.
      setSessions((prev) => [
        data,
        ...prev.filter((session) => session.id !== data.id),
      ]);
      setDisplayedSessionId(data.id);

      // An empty transcript is still worth keeping — the row is what makes the
      // attempt visible and re-gradeable later. There is just nothing to grade
      // yet, so say why rather than returning silently.
      if (!text) {
        setError(
          (current) =>
            current ??
            "No speech was captured, so there's nothing to grade. The attempt was saved.",
        );
        return;
      }

      // Only now — after the student has stopped — do we ask for teaching.
      if (!courseReady || text.length < 24) {
        return;
      }

      setStatus("analyzing");
      await analyzeSession(text, data.id);
    } catch (finishError) {
      console.error("Recording finalization failed:", finishError);
      setError(
        "The recording stopped safely, but finishing it failed. Your transcript is still on screen.",
      );
    } finally {
      setStatus("idle");
      finishingRef.current = false;
    }
  }

  async function analyzeSession(text: string, sessionId: string) {
    try {
      const { response, json } = await fetchJson(
        `/api/courses/${courseId}/analyze`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            transcript: text,
            mode: "final",
            sessionId,
          }),
        },
        ANALYZE_TIMEOUT_MS,
      );
      if (!response.ok) {
        setError(json.error ?? "Couldn't analyse that session.");
        return;
      }

      if (Array.isArray(json.spans)) setSpans(json.spans);
      if (json.orchestration) setAgentRun(json.orchestration);
      if (json.report) {
        const completedReport = json.report;
        setReport(completedReport);
        setDisplayedSessionId(sessionId);
        setSessions((prev) =>
          prev.map((session) =>
            session.id === sessionId
              ? { ...session, score: Math.round(completedReport.score) }
              : session,
          ),
        );
      }
    } catch (analysisError) {
      setError(
        requestTimedOut(analysisError)
          ? "Gap Coach took too long. The session is saved — retry when you're ready."
          : "Couldn't reach Gap Coach. The session is saved.",
      );
    }
  }

  /**
   * Reopens the check a session already has, rather than grading it again.
   *
   * Re-running the agents on the same words costs a model call to answer a
   * question that was already answered, and it invites treating the score as
   * something to farm. The way to find out whether you have learned more is to
   * explain it again, which is a new recording.
   */
  async function viewSession(session: Session) {
    setError(null);
    setLoadingCheckId(session.id);

    const supabase = createClient();
    const { data, error: loadError } = await supabase
      .from("course_sessions")
      .select("id, transcript, spans, report")
      .eq("id", session.id)
      .maybeSingle<{
        id: string;
        transcript: string | null;
        spans: Span[] | null;
        report: Report | null;
      }>();

    setLoadingCheckId(null);

    if (loadError || !data) {
      setError("Couldn't load that session.");
      return;
    }

    setDisplayedSessionId(data.id);
    setTranscript(data.transcript ?? "");
    transcriptRef.current = data.transcript ?? "";
    setInterim("");
    setSpans(Array.isArray(data.spans) ? data.spans : []);
    setReport(data.report ?? null);
    setAgentRun(null);
    if (!data.report) {
      setError(
        "This session was saved without a check. Record it again to have it graded.",
      );
    }
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
    const Ctor = browserCaptionsUsable()
      ? (window.SpeechRecognition ?? window.webkitSpeechRecognition)
      : undefined;

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
    if (!unlimited) setUsed((u) => u + 1);

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
    liveTranscribeFailuresRef.current = 0;
    liveChunkCursorRef.current = 0;
    liveIncrementalRef.current = true;
    finishingRef.current = false;
    sessionRowIdRef.current = null;
    lastSavedTranscriptRef.current = "";
    resetGradedHead();

    // Claim the row now and keep flushing the transcript into it. Not awaited:
    // the student should start talking immediately, and `finish()` falls back to
    // an insert if this hasn't landed by then.
    void createSessionRow(startedAtRef.current);
    if (autosaveTimerRef.current) clearInterval(autosaveTimerRef.current);
    autosaveTimerRef.current = setInterval(() => {
      void flushTranscript();
    }, AUTOSAVE_MS);

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
    // let a recording run past three minutes.
    deadlineRef.current = Date.now() + MAX_RECORDING_MS;
    setRemainingMs(MAX_RECORDING_MS);
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = setInterval(() => {
      const left = deadlineRef.current - Date.now();
      setRemainingMs(left);
      if (left <= 0) {
        if (tickRef.current) clearInterval(tickRef.current);
        setNotice("Three-minute limit reached — wrapping up.");
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
    // Acknowledge the click now rather than when `onend` arrives: the timer has
    // already stopped, so leaving the status on "recording" for up to a couple
    // of seconds reads as the app having frozen.
    setStatus("saving");
    // Finish on `onend` if it comes, on the watchdog if it doesn't.
    if (stopWatchdogRef.current) clearTimeout(stopWatchdogRef.current);
    stopWatchdogRef.current = setTimeout(() => {
      void finish();
    }, STOP_WATCHDOG_MS);
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
  const outOfQuota = !unlimited && remaining === 0 && status !== "recording";

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
          {unlimited
            ? "Admin account · unlimited recordings"
            : `${remaining} of ${DAILY_LIMITS.recording} recordings left today · resets at midnight`}
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
            {/* No score here. A number attached to the thing you just said
                invites judging the take rather than reading what was missed —
                the score belongs on the gap report, once. */}
            <div className="rounded-xl border border-border bg-surface p-4">
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
                {/* The phrase only. Teaching lives in Re-Teach: putting the
                    explanation here hands over the answer at the moment the
                    student should be noticing the gap themselves. */}
                <p className="mt-2 text-sm text-strong">
                  &ldquo;{gap.phrase}&rdquo;
                </p>
              </div>
            ))}

            {report.next_focus && (
              <p className="text-sm text-subtle">
                <span className="font-medium text-strong">Next: </span>
                {report.next_focus}
              </p>
            )}

            {/* The panel above is a summary. The full report is a page of its
                own — with the transcript, every weakness and the teaching for
                each — and there was no way to reach it from here. */}
            <Button
              asChild
              className="mt-1 h-11 w-fit gap-2 rounded-full bg-brand px-6 font-semibold text-white transition-transform duration-200 ease-out hover:bg-brand/90 active:scale-[0.97]"
            >
              <Link href={`/dashboard/courses/${courseId}/gaps`}>
                See the full gap report
                <ArrowRight aria-hidden className="size-4" />
              </Link>
            </Button>
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
              {session.transcript && (
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  disabled={status !== "idle" || loadingCheckId === session.id}
                  onClick={() => void viewSession(session)}
                  className="shrink-0 rounded-full"
                >
                  {loadingCheckId === session.id ? "Opening…" : "View check"}
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
