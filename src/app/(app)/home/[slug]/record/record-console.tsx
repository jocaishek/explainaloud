"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Mic, Radio, Square } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AgentOrchestration } from "~/components/agent-orchestration";
import { ScrollToTargetLink } from "~/components/scroll-to-target-link";
import { Button } from "~/components/ui/button";
import type { AgentRun } from "~/lib/ai/schemas";
import { audioExtension, preferredRecorderMimeType } from "~/lib/audio";
import { localDay } from "~/lib/limits";
import type { SpeechMetrics } from "~/lib/speech-metrics";
import { createClient } from "~/lib/supabase/client";
import { cn } from "~/lib/utils";
import { LevelMeter } from "./level-meter";

type Session = {
  id: string;
  transcript: string | null;
  started_at: string;
  ended_at: string | null;
  score: number | null;
  /** Which section's question this answered; null for pre-question sessions. */
  question_section?: number | null;
  /** Topic or interview. Older rows predate the distinction and read topic. */
  mode?: string | null;
};

/**
 * One answered question inside an interview recording.
 *
 * The whole run is a single recording and a single session, so a segment is a
 * slice of it: what was asked, the words that answered it, and what that answer
 * scored on its own question.
 */
type Segment = {
  question: string;
  sectionIndex: number;
  section: string;
  transcript: string;
  /** Null while the answer is still with the grader, or if grading failed. */
  score: number | null;
  verdict: string | null;
  spans: Span[];
  gaps: Array<{ phrase: string; category: string; explanation: string }>;
  strengths: string[];
};

/** How many questions one interview asks. */
const INTERVIEW_QUESTIONS = 3;

/** Grace between answers before the next one starts on its own. */
const BETWEEN_SECONDS = 5;

/**
 * How long a recording may hear nothing before it says so.
 *
 * Thirty seconds is far longer than any pause in speech — a long think, a
 * cough, rereading the question — so reaching it means the microphone is not
 * picking the person up at all: muted at the OS level, the wrong input
 * selected, or they walked away. Sitting silently through three minutes of
 * that and then charging them a recording for a blank transcript is the worst
 * version of this, and it is what happened.
 */
const SILENCE_WARN_MS = 30_000;

/** Grace after the warning before the take is stopped for them. */
const SILENCE_STOP_MS = 10_000;

/**
 * Loudness, as RMS over a frame, above which someone is speaking.
 *
 * Measured off the audio graph rather than off the transcript, because the
 * browser's caption service fails with `network` often enough that "no words
 * yet" is at least as likely to mean the captions broke as it is to mean the
 * room is quiet — and stopping a perfectly good recording because a remote
 * service went down would be strictly worse than the problem being solved.
 * Room tone sits near 0.002; speech at a normal distance is an order of
 * magnitude above this.
 */
const SILENCE_RMS = 0.012;

/**
 * How long the adaptive follow-up gets before the banked question is shown.
 *
 * A question written out of the answer you just gave is the thing nobody else
 * does, and it is worth a short wait. It is not worth the ten to fifteen
 * seconds two chained model calls actually took, mid-interview, on a clock the
 * student is being marked against.
 */
const FOLLOW_UP_BUDGET_MS = 3_000;

/**
 * How long to wait for the Examiner before falling back.
 *
 * Short on purpose: this runs inside the gap between two answers, and a
 * student staring at a blank card is worse than a slightly shallower question.
 */
const QUESTION_TIMEOUT_MS = 12_000;

/** One section's question, as offered on the record screen. */
export type CourseQuestion = {
  /** Position in `courses.generated.sections` — what grading is scoped to. */
  index: number;
  section: string;
  question: string;
  /** What a complete answer to this question contains, per the Examiner. */
  keyPoints?: string[];
  /**
   * Row id in the topic's question bank, when it came from there.
   *
   * Sent back on the next draw so one interview cannot ask the same banked
   * question twice. Absent for a follow-up, which is written on the spot and
   * never banked.
   */
  bankId?: string;
};

type Span = {
  text: string;
  status: "correct" | "gap" | "vague" | "neutral";
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
  /** Podcast mode, between questions: the take is open, the mic is muted. */
  | "between"
  | "saving"
  | "analyzing";

/** Which shape of recording this is. Both cost one of the day's recordings. */
type Mode = "topic" | "interview";

/**
 * How long between live grades.
 *
 * Grading used to be triggered by the speech engine finalising a phrase, which
 * is not a clock — Chrome finalises at a pause, so a student speaking fluently
 * for eight seconds got no colour for eight seconds, then all of it at once. It
 * read as the grader being slow when it had simply not been asked yet.
 *
 * A grade now goes out on this tick over whatever has been heard, interim words
 * included, so colour tracks speech continuously instead of arriving in bursts
 * at sentence boundaries. Phrase finalisation still runs alongside it, but only
 * to settle the wording — it no longer gates when grading happens.
 *
 * The floor is the provider, not this number. Live passes run on Groq's 8B at
 * ~415ms, and its free tier allows 30 requests a minute — one every 2s. At
 * 1200ms a fast talker rides just above that and leans on the rate-limit retry
 * and the 70B failover behind it. Lower this if the account's tier allows it;
 * that is the only thing keeping colour from being near-instant.
 */
const LIVE_GRADE_TICK_MS = 1200;
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
 * Hard cap on one explanation, supplied per plan — three minutes on Free, five
 * on Pro. Three is past the point where a teach-back stops being recall and
 * starts being reading aloud; five gives a subscriber room for a dense topic
 * without changing that character. Either keeps one transcript inside a single
 * model context comfortably.
 *
 * The value arrives as a prop rather than being read here, so the plan is
 * resolved once on the server from the subscription rather than trusted from
 * the browser.
 */

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
  /**
   * Delivery statistics from the transcription pass. Deliberately opaque here:
   * this component only forwards them to storage, and typing the shape in two
   * places would mean updating both every time a statistic is added.
   */
  metrics?: SpeechMetrics | null;
  /** From the Examiner route: drawn from the bank, or written on the spot. */
  questions?: Array<{
    /** Bank row id. Absent on a follow-up, which is never banked. */
    id?: string;
    question: string;
    section_index: number;
    section: string;
    key_points?: string[];
  }>;
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

/**
 * What has been said since the last answer ended.
 *
 * Prefix comparison rather than an index, because the only assumption that
 * holds is that the transcript usually grows from what it was. When it does
 * not — a wholesale rewrite by the server caption path — falling back to the
 * whole transcript is wrong but recoverable; a stale offset silently returns
 * someone else's answer, which is not.
 */
function newSpeech(whole: string, captured: string) {
  if (!captured) return whole.trim();
  if (whole.startsWith(captured)) return whole.slice(captured.length).trim();
  // The string was rebuilt. Take whatever tail is genuinely new if we can
  // find the old ending inside it, and the whole thing if we cannot.
  const seam = captured.slice(-60);
  const at = seam ? whole.lastIndexOf(seam) : -1;
  return at >= 0 ? whole.slice(at + seam.length).trim() : whole.trim();
}

function formatClock(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

function indexOfSequence(bytes: Uint8Array, needle: number[]) {
  outer: for (let i = 0; i + needle.length <= bytes.length; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (bytes[i + j] !== needle[j]) continue outer;
    }
    return i;
  }
  return -1;
}

/**
 * Where the container's initialisation segment ends in the first recorded chunk.
 *
 * Incremental captions prepend this to the newest chunks so they decode without
 * the rest of the recording. It has to be the header *alone*: the first chunk a
 * MediaRecorder emits is the header followed by a full timeslice of audio —
 * measured at 146 bytes of header against 15.6KB of speech — so prepending the
 * whole chunk silently re-sends the opening second of the explanation on every
 * pass, and appending each result would stutter those words back into the
 * transcript dozens of times over a recording.
 *
 * Returns null for a container we can't split, which turns incremental passes
 * off rather than guessing at an offset.
 */
function initSegmentEnd(bytes: Uint8Array, mimeType: string) {
  if (mimeType.includes("webm") || mimeType.includes("ogg")) {
    // Everything before the first WebM Cluster: EBML header, Segment, Tracks.
    const cluster = indexOfSequence(bytes, [0x1f, 0x43, 0xb6, 0x75]);
    return cluster > 0 ? cluster : null;
  }
  if (mimeType.includes("mp4")) {
    // Fragmented MP4: ftyp + moov, up to the first moof. The four-byte box size
    // precedes the type, so the box itself starts four bytes earlier.
    const moof = indexOfSequence(bytes, [0x6d, 0x6f, 0x6f, 0x66]);
    return moof > 4 ? moof - 4 : null;
  }
  return null;
}

export function RecordConsole({
  courseId,
  slug,
  initialSessions,
  questions,
  initialQuestion,
  courseReady,
  recordingsUsed,
  unlimited,
  dailyLimit,
  maxRecordingMs,
}: {
  courseId: string;
  /** The course's URL segment. Links use it; the API routes use the id. */
  slug: string;
  initialSessions: Session[];
  /** Empty when the course is ungenerated, or generated without any quizzes. */
  questions: CourseQuestion[];
  /** Index into `questions` to open on — the first one not yet answered. */
  initialQuestion: number;
  courseReady: boolean;
  recordingsUsed: number;
  unlimited: boolean;
  /** Recordings a day for this plan; `null` when there is no cap. */
  dailyLimit: number | null;
  maxRecordingMs: number;
}) {
  const [status, setStatus] = useState<Status>("checking");
  /** Read from async callbacks that closed over an older render. */
  const statusRef = useRef<Status>("checking");
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [spans, setSpans] = useState<Span[]>([]);
  // The exact text `spans` describes. Grading now runs on a clock rather than
  // on phrase boundaries, so it is always a little behind what has been heard;
  // this is what lets the view render the not-yet-graded remainder as plain
  // text instead of duplicating it or dropping it.
  const [spansCover, setSpansCover] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [remainingMs, setRemainingMs] = useState(maxRecordingMs);
  const [sessions, setSessions] = useState(initialSessions);
  const [used, setUsed] = useState(recordingsUsed);
  const [agentRun, setAgentRun] = useState<AgentRun | null>(null);
  const [displayedSessionId, setDisplayedSessionId] = useState<string | null>(
    null,
  );
  // Which question is on screen. Clamped on read rather than on write, so a
  // course that regenerates with fewer sections cannot leave this dangling.
  const askedAt = initialQuestion;
  const asked = questions[Math.min(askedAt, questions.length - 1)];
  // Pinned when recording starts: the answer must be graded against the
  // question that was on screen when they began, not one they scrolled to
  // mid-sentence.
  const answeringRef = useRef<CourseQuestion | null>(null);
  const [mode, setMode] = useState<Mode>("topic");
  /**
   * The three questions this recording asks, drawn at the moment it starts.
   *
   * Held in a ref as well as state because `finish()` and the analysis
   * callbacks run from closures that captured an older render, and a segment
   * saved against the wrong question is worse than no segment at all.
   */
  const [asking, setAsking] = useState<CourseQuestion[]>([]);
  const askingRef = useRef<CourseQuestion[]>([]);
  const [segmentIndex, setSegmentIndex] = useState(0);
  const segmentIndexRef = useRef(0);
  const [segments, setSegments] = useState<Segment[]>([]);
  const segmentsRef = useRef<Segment[]>([]);
  /**
   * Everything already claimed by a finished answer.
   *
   * A character offset was wrong here: the transcript is not append-only. The
   * server caption path rewrites it wholesale, and the recogniser rewrites
   * words it revises, so an index taken at question one could point anywhere
   * by question two — which is how three different answers ended up being
   * graded on nearly the same text and scoring the same.
   */
  const capturedRef = useRef("");
  /** The final answer, captured at the stop and never re-derived. */
  const lastAnswerRef = useRef("");
  /** Podcast mode for the recording in progress, whatever the chooser says now. */
  const interviewRef = useRef(false);
  /** Seconds left to start the next answer yourself before it starts for you. */
  const [countdown, setCountdown] = useState<number | null>(null);
  /**
   * When the grace period ends, as a clock time.
   *
   * The count used to be a chain of one-second timeouts, each scheduling the
   * next. A backgrounded tab throttles those to once a minute or stops them
   * entirely, so switching away mid-count and coming back left the countdown
   * frozen and the microphone never opened. A deadline is recomputed from the
   * clock on every tick, so however long the tab was asleep, the first tick
   * after it wakes has the right answer.
   */
  const graceDeadlineRef = useRef<number | null>(null);
  /** Every question asked this session, so the examiner never repeats one. */
  const usedQuestionsRef = useRef<string[]>([]);
  /** Bank rows drawn this run — the draw's own do-not-repeat list. */
  const drawnIdsRef = useRef<string[]>([]);
  /** The audio graph the silence watchdog listens to, and its scratch buffer. */
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const levelBufferRef = useRef<Float32Array<ArrayBuffer> | null>(null);
  /** When speech was last actually heard. Null while nothing is being heard. */
  const lastVoiceAtRef = useRef<number | null>(null);
  /** Seconds left before a silent take is stopped. Null when not warning. */
  const [silenceLeft, setSilenceLeft] = useState<number | null>(null);
  const silenceLeftRef = useRef<number | null>(null);
  /** True while the next question is being written. */
  const [writing, setWriting] = useState(false);
  const writingRef = useRef(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [loadingCheckId, setLoadingCheckId] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioReadyRef = useRef<Promise<Blob | null> | null>(null);
  const transcriptRef = useRef("");
  // Words the engine is still revising. Kept in a ref as well as state because
  // the grading loop reads them on its own clock, outside any render.
  const interimRef = useRef("");
  const startedAtRef = useRef<string | null>(null);
  const manualStopRef = useRef(false);
  const gradeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
  // The container header on its own, carved out of the first chunk once and
  // reused to make every later window decodable by itself.
  const liveInitSegmentRef = useRef<Blob | null>(null);
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
  // The text the last pass was sent, so a tick that lands on unchanged speech
  // costs nothing instead of re-asking the same question.
  const lastGradedTextRef = useRef("");
  // The already-graded head of the transcript: the spans for it, and the exact
  // text they cover. Live passes only ever grade what comes after this, and
  // these spans are re-used verbatim rather than re-requested.
  const gradedSpansRef = useRef<Span[]>([]);
  const gradedTextRef = useRef("");
  // Lets the caption path and the grading loop reach the latest `gradeLive`
  // without depending on its identity, which would make them un-memoisable.
  const gradeLiveRef = useRef<
    ((text: string, confirmedLength: number) => Promise<void>) | null
  >(null);

  useEffect(() => {
    const canRecord =
      typeof MediaRecorder !== "undefined" &&
      !!navigator.mediaDevices?.getUserMedia;
    setStatus(canRecord ? "idle" : "unsupported");
  }, []);

  // Top the question bank up now, while the page is being read, so picking
  // interview mode later is a database read rather than a model call. Returns
  // immediately without writing anything when the bank is already healthy,
  // which is the normal case. Nothing depends on the result — a failure here
  // just means the draw pays for the fill itself.
  useEffect(() => {
    if (!courseReady) return;
    void fetch(`/api/courses/${courseId}/questions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ warm: true }),
    }).catch(() => {});
  }, [courseId, courseReady]);

  // Unmounting mid-recording must not leave the mic open or timers running.
  useEffect(
    () => () => {
      if (gradeTimerRef.current) {
        clearTimeout(gradeTimerRef.current);
        gradeTimerRef.current = null;
      }
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
      void audioContextRef.current?.close().catch(() => {});
      audioContextRef.current = null;
      analyserRef.current = null;
    },
    [],
  );

  // Kept in step so the late-arriving question writers can tell whether the
  // student has already started talking.
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // When the writer finishes after the count has already run out, start then.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `resumeRecording` is rebuilt every render; this fires on the writer settling, not on the closure changing
  useEffect(() => {
    writingRef.current = writing;
    if (!writing && countdown === 0) resumeRecording();
  }, [writing, countdown]);

  const remaining = unlimited
    ? Number.POSITIVE_INFINITY
    : Math.max(0, (dailyLimit ?? 0) - used);

  /**
   * The grace period between answers, counted down in view.
   *
   * Visible the whole way rather than silent: the microphone opening on its
   * own is only tolerable when the person watched it coming.
   */
  // biome-ignore lint/correctness/useExhaustiveDependencies: `resumeRecording` is rebuilt every render; the countdown decides when it fires, not which closure does
  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      // Do not open the microphone on a card that has no question on it yet.
      if (writingRef.current) return;
      resumeRecording();
      return;
    }
    // Polled against the deadline rather than counted down, so a throttled or
    // suspended tab cannot lose seconds — or stall on one forever.
    const timer = window.setInterval(() => {
      const deadline = graceDeadlineRef.current;
      if (deadline === null) return;
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setCountdown((current) => (current === null ? null : left));
    }, 250);
    return () => window.clearInterval(timer);
  }, [countdown]);

  /** Open the grace period: five seconds, from now, visible the whole way. */
  const startGrace = useCallback(() => {
    graceDeadlineRef.current = Date.now() + BETWEEN_SECONDS * 1000;
    setCountdown(BETWEEN_SECONDS);
  }, []);

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
    async (text: string, confirmedLength: number) => {
      // One pass at a time. The loop asks again on the next tick anyway, so a
      // tick that lands mid-flight is simply skipped rather than queued —
      // overlapping calls would spend the small model's per-minute budget
      // grading text a later pass immediately supersedes.
      if (liveGradeInFlightRef.current) return;
      if (text === lastGradedTextRef.current) return;

      // The head is only re-usable while it is still a prefix of what's on
      // screen. A caption pass that rewrites earlier words instead of appending
      // invalidates it, and re-grading from scratch is the honest response.
      if (!text.startsWith(gradedTextRef.current)) resetGradedHead();

      const head = gradedTextRef.current;
      const tail = text.slice(head.length);
      if (tail.trim().length < LIVE_GRADE_MIN_CHARS) return;
      const context = head.slice(-LIVE_CONTEXT_CHARS);

      lastGradedTextRef.current = text;
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
              ...(answeringRef.current
                ? { sectionIndex: answeringRef.current.index }
                : {}),
            }),
          },
          LIVE_REQUEST_TIMEOUT_MS,
        );
        // Let the next tick try this text again rather than treating a hiccup
        // as "already graded" and waiting for more speech — a student who stops
        // talking after a failed pass would otherwise sit in front of grey text
        // until they said something new.
        //
        // Except on 429. There the minute's budget is already spent, and
        // re-sending identical text every 1.2s spends what little is left on a
        // question we just asked. Waiting for new speech is both cheaper and
        // likelier to succeed.
        if (!response.ok) {
          if (response.status !== 429) lastGradedTextRef.current = "";
          return;
        }
        if (seq !== liveSeqRef.current) return; // superseded
        // Stopping does not cancel a request already in flight. `liveSeqRef`
        // only orders live passes against each other, so without this a slow
        // one — a rate-limit retry can take twenty seconds — could return after
        // the final pass has painted the graded transcript and overwrite it
        // with partial colours that no longer match the report beneath them.
        if (manualStopRef.current) return;
        // A pass that started before a reset would splice its tail spans onto
        // a head that no longer exists, mismatching text and colour.
        if (gradedTextRef.current !== head) return;
        if (json.orchestration) setAgentRun(json.orchestration);
        if (!Array.isArray(json.spans)) return;

        const tailSpans = json.spans;
        setSpans([...gradedSpansRef.current, ...tailSpans]);
        setSpansCover(text);

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
        // Never freeze a span the engine might still rewrite. The tail now
        // reaches into interim words, and those are a guess — "recursion" can
        // become "the russian" a syllable later. Freezing one would nail its
        // colour to text that no longer exists.
        const freezable = Math.max(0, confirmedLength - head.length);
        let frozenChars = 0;
        const frozen: Span[] = [];
        for (const span of tailSpans) {
          if (frozenChars >= excess) break;
          if (frozenChars + span.text.length > freezable) break;
          frozen.push(span);
          frozenChars += span.text.length;
        }
        if (frozenChars === 0) return;
        gradedSpansRef.current = [...gradedSpansRef.current, ...frozen];
        gradedTextRef.current = head + tail.slice(0, frozenChars);
      } catch {
        // Live colouring is an enhancement; a failed pass must never
        // interrupt the recording. Same as above: let the next tick retry.
        lastGradedTextRef.current = "";
      } finally {
        liveGradeInFlightRef.current = false;
      }
    },
    [courseId, resetGradedHead],
  );

  // Kept in a ref so the grading loop and the caption path can reach the
  // latest one without either depending on its identity.
  gradeLiveRef.current = gradeLive;

  /**
   * Everything heard so far, settled words and in-progress ones together. This
   * is what gets graded: waiting for the engine to promote interim words to
   * final is what made colour arrive in bursts at sentence boundaries.
   */
  function heardSoFar() {
    const confirmed = transcriptRef.current;
    const pending = interimRef.current.trim();
    if (!pending) return { text: confirmed, confirmedLength: confirmed.length };
    return {
      text: confirmed ? `${confirmed} ${pending}` : pending,
      confirmedLength: confirmed.length,
    };
  }

  /**
   * The grading clock.
   *
   * Self-scheduling rather than an interval, for the same reason as the caption
   * loop: a tick that fires while the previous pass is still out is wasted, and
   * on an interval it would be silently dropped. Chaining from the end of each
   * pass means the next grade goes out `LIVE_GRADE_TICK_MS` after the last one
   * landed — a steady rhythm the student can feel, whatever the model does.
   */
  const gradeLoopRef = useRef<(() => void) | null>(null);
  gradeLoopRef.current = () => {
    gradeTimerRef.current = setTimeout(async () => {
      if (manualStopRef.current || !gradeTimerRef.current) return;
      if (courseReady) {
        const { text, confirmedLength } = heardSoFar();
        await gradeLiveRef.current?.(text, confirmedLength);
      }
      if (manualStopRef.current || !gradeTimerRef.current) return;
      gradeLoopRef.current?.();
    }, LIVE_GRADE_TICK_MS);
  };

  function stopGradeLoop() {
    if (gradeTimerRef.current) clearTimeout(gradeTimerRef.current);
    gradeTimerRef.current = null;
  }

  /** Keeps the interim ref and the rendered copy from drifting apart. */
  function applyInterim(value: string) {
    interimRef.current = value;
    setInterim(value);
  }

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

    // Hand the transcript back to browser recognition, which may well still be
    // running: server captions start on a *transient* recognition error, and
    // recognition restarts itself. Once a server caption had landed,
    // `onresult` stopped writing — it defers to `serverTranscriptRef` — so
    // giving up here used to freeze the transcript on screen for the rest of
    // the recording even while the engine was still producing words.
    //
    // Carrying the server text across rather than clearing it keeps what is on
    // screen, and keeps it a prefix of what comes next, so the graded spans
    // survive instead of being thrown away by the next pass.
    browserTranscriptRef.current = transcriptRef.current;
    serverTranscriptRef.current = "";

    setNotice(
      "Live captions aren't available in this browser. Keep going: your full transcript arrives when you finish.",
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

    // Claimed before the first `await` below, not after: reading the header out
    // of a Blob suspends, and a tick arriving in that window would otherwise
    // sail past the busy check above and start a second pass.
    liveTranscribeBusyRef.current = true;
    try {
      const recorder = mediaRecorderRef.current;
      const type = recorder?.mimeType || "audio/webm";
      const chunks = audioChunksRef.current;
      // Send only the seconds recorded since the last pass. Re-uploading the
      // whole recording every few seconds was the reason captions crawled: at
      // one minute in, each pass was posting a minute of audio and waiting for
      // a minute of audio to be transcribed, and it got worse every pass.
      const sentThrough = chunks.length;
      const cursor = liveChunkCursorRef.current;
      const first = chunks[0];
      let incremental = liveIncrementalRef.current && cursor > 0 && !!first;
      if (incremental && sentThrough <= cursor) return;

      // Carve the header out of the first chunk once, and give up on
      // incremental passes if this container can't be split — a whole-recording
      // pass is slower but correct, which a mis-sliced one would not be.
      if (incremental && first && !liveInitSegmentRef.current) {
        const bytes = new Uint8Array(await first.arrayBuffer());
        const end = initSegmentEnd(bytes, type);
        if (end === null) liveIncrementalRef.current = false;
        else liveInitSegmentRef.current = first.slice(0, end);
      }

      // Re-derived rather than assumed: `incremental` decides both what is sent
      // and whether the reply is appended or replaces the transcript, so a pass
      // that falls back to whole-recording here must also fall back to
      // replacing — appending a full transcript to itself would duplicate it.
      const initSegment = liveInitSegmentRef.current;
      incremental = incremental && !!initSegment;
      const parts =
        incremental && initSegment
          ? [initSegment, ...chunks.slice(cursor)]
          : [...chunks];
      const audio = new Blob(parts, { type });
      if (!audio.size) return;

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
      interimRef.current = "";
      setInterim("");
      // No grade call here. The grading clock reads the transcript itself, so a
      // caption landing is picked up within a tick like any other new speech —
      // and firing one here as well would double the request rate on exactly
      // the browsers already paying for server-side captions.
    } catch {
      // The final full-audio transcription remains the source of truth.
      noteLiveCaptionFailure();
    } finally {
      liveTranscribeBusyRef.current = false;
    }
  }, [courseId, noteLiveCaptionFailure]);

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
          question: answeringRef.current?.question ?? null,
          question_section: answeringRef.current?.index ?? null,
          mode: interviewRef.current ? "interview" : "topic",
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

    stopWatching();
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
    stopGradeLoop();
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

    // The last answer, taken before anything else can rewrite the transcript.
    //
    // `finish()` replaces `transcriptRef` with the server's transcription of
    // the whole recording, which shares no prefix with the live captions the
    // earlier answers were sliced from. Reading the last segment after that
    // meant the prefix test failed and the fallback returned the entire
    // recording — which is why question three's answer was the whole session,
    // and why the same words appeared twice in the report.
    lastAnswerRef.current = newSpeech(
      transcriptRef.current.trim(),
      capturedRef.current,
    );

    try {
      let text = transcriptRef.current.trim();
      // Delivery statistics for this attempt — pace, pauses, filler rate. Only
      // the server-side pass produces them, because only Whisper returns the
      // word timings they are derived from; the browser's own recogniser gives
      // text with no timing at all. Stays null when that pass didn't happen.
      let speechMetrics: SpeechMetrics | null = null;
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
            if (json.metrics && typeof json.metrics === "object") {
              speechMetrics = json.metrics;
            }
            transcriptRef.current = text;
            setTranscript(text);
            applyInterim("");
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
              speech_metrics: speechMetrics,
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
              speech_metrics: speechMetrics,
              started_at: startedAtRef.current ?? new Date().toISOString(),
              ended_at: new Date().toISOString(),
              question: answeringRef.current?.question ?? null,
              question_section: answeringRef.current?.index ?? null,
              mode: interviewRef.current ? "interview" : "topic",
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
      if (interviewRef.current) {
        await finishInterview(data.id);
      } else {
        await analyzeSession(text, data.id);
      }
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

  /**
   * Close an interview: three answers, one session.
   *
   * Each answer was already graded against its own question while the next one
   * was being given, so nothing is sent to the grader here. This is the
   * assembly: the segments become one transcript, one set of coloured spans and
   * one report, which is what makes the gap report and Re-Teach able to read a
   * interview session without knowing that questions exist.
   *
   * The transcript stored is the one the grading actually read — the live
   * captions, sliced per answer — not the server's cleaner pass over the whole
   * audio. Spans are positions in a specific string, so storing a different
   * string would leave every colour pointing at the wrong words. The server
   * pass still runs, because the pace metrics come from its word timings.
   */
  async function finishInterview(sessionId: string) {
    // The last answer never went through `endSegment`.
    const last = askingRef.current[segmentIndexRef.current];
    const tail = lastAnswerRef.current;
    if (last && tail) {
      const segment: Segment = {
        question: last.question,
        sectionIndex: last.index,
        section: last.section,
        transcript: tail,
        score: null,
        verdict: null,
        spans: [],
        gaps: [],
        strengths: [],
      };
      segmentsRef.current = [...segmentsRef.current, segment];
      setSegments(segmentsRef.current);
      await gradeSegment(
        segmentsRef.current.length - 1,
        tail,
        last.index,
        last.keyPoints,
      );
    }

    const done = segmentsRef.current;
    const answered = done.filter((segment) => segment.transcript.length > 0);
    if (answered.length === 0) return;

    // Two blank lines between answers, and the separator carries into the
    // spans as neutral text so the coloured transcript keeps its paragraphs.
    const transcript = answered
      .map((segment) => segment.transcript)
      .join("\n\n");
    const spans: Span[] = [];
    answered.forEach((segment, i) => {
      if (i > 0) spans.push({ text: "\n\n", status: "neutral", issue: null });
      spans.push(
        ...(segment.spans.length > 0
          ? segment.spans
          : [
              {
                text: segment.transcript,
                status: "neutral" as const,
                issue: null,
              },
            ]),
      );
    });

    /* Question numbers are carried, not re-derived.
     *
     * The breakdown used to be built by mapping over the *scored* segments and
     * numbering them by their position in that array, which silently renumbers
     * every question after a missing one: an interview where question two was
     * not captured printed question three's mark as "Q2". The number belongs to
     * the question, so it is taken from the answer's position in `answered` and
     * travels with it. */
    const marks = answered.map((segment, i) => ({ n: i + 1, segment }));
    const scored = marks.filter(
      (mark): mark is { n: number; segment: Segment & { score: number } } =>
        mark.segment.score !== null,
    );
    const missed = marks.filter((mark) => mark.segment.score === null);

    // The mean, because each answer was a whole answer to its own question.
    // Weighting by length would say a rambling answer is worth more of the
    // grade than a tight one, which is the opposite of true.
    const score = scored.length
      ? Math.round(
          scored.reduce((total, mark) => total + mark.segment.score, 0) /
            scored.length,
        )
      : 0;

    /* An answer that was not captured is named, not quietly dropped.
     *
     * This mean is taken over the answers that have a mark, so an answer that
     * produced no transcript leaves the denominator along with the numerator —
     * and the result is a full score for half an interview. A real session came
     * back 100/100 having graded one of two questions, and nothing on the page
     * said so. The number was not wrong arithmetic; it was an honest average of
     * a set the reader did not know had been narrowed.
     *
     * Scoring the missing answer zero would be worse. It is not established
     * that the person said nothing — only that nothing reached the grader, and
     * that is at least as likely to be our failure as theirs. So the score
     * stands and its basis is stated. */
    const breakdown = scored
      .map((mark) => `Q${mark.n}: ${mark.segment.score}`)
      .join(" · ");
    const shortfall =
      missed.length > 0
        ? ` Scored on ${scored.length} of ${answered.length}: nothing was captured for ${
            missed.length === 1 ? "question" : "questions"
          } ${missed.map((mark) => mark.n).join(" and ")}, so ${
            missed.length === 1 ? "it is" : "they are"
          } not in this mark.`
        : "";

    const report = {
      score,
      verdict: `You answered ${answered.length} question${answered.length === 1 ? "" : "s"} in this recording. ${breakdown}${shortfall}`,
      gaps: answered.flatMap((segment) => segment.gaps),
      strengths: answered.flatMap((segment) => segment.strengths),
      next_focus:
        scored.length > 0
          ? ([...scored].sort((a, b) => a.segment.score - b.segment.score)[0]
              ?.segment.question ?? "")
          : "",
    };

    const supabase = createClient();
    const { error: saveError } = await supabase
      .from("course_sessions")
      .update({
        transcript,
        spans,
        report,
        score,
        segments: answered.map((segment) => ({
          question: segment.question,
          section_index: segment.sectionIndex,
          transcript: segment.transcript,
          score: segment.score,
          verdict: segment.verdict,
          // Per answer, so the report can show what this one missed rather
          // than pooling every mistake in the recording under all three.
          gaps: segment.gaps,
          strengths: segment.strengths,
        })),
        analyzed_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    if (saveError) {
      setError("The answers were graded but couldn't be saved.");
      return;
    }

    // Written from here rather than by the analyze route: that route persists
    // gaps for the session it graded, and it graded three answers separately
    // without knowing they belonged to one.
    await supabase.from("gaps").delete().eq("session_id", sessionId);
    if (report.gaps.length > 0) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("gaps").insert(
          report.gaps.map((gap) => ({
            session_id: sessionId,
            user_id: user.id,
            phrase: gap.phrase,
            category: gap.category,
            explanation: gap.explanation,
          })),
        );
      }
    }

    setTranscript(transcript);
    transcriptRef.current = transcript;
    setSpans(spans);
    setSpansCover(transcript);
    setReport(report as Report);
    setDisplayedSessionId(sessionId);
    setSessions((prev) =>
      prev.map((session) =>
        session.id === sessionId ? { ...session, score } : session,
      ),
    );
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
            ...(answeringRef.current
              ? { sectionIndex: answeringRef.current.index }
              : {}),
          }),
        },
        ANALYZE_TIMEOUT_MS,
      );
      if (!response.ok) {
        setError(json.error ?? "Couldn't analyse that session.");
        return;
      }

      if (Array.isArray(json.spans)) {
        setSpans(json.spans);
        // The final pass graded the whole transcript, so nothing is left over.
        setSpansCover(text);
      }
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
          ? "Gap Coach took too long. The session is saved, so retry when you're ready."
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
    applyInterim("");
    setSpans(Array.isArray(data.spans) ? data.spans : []);
    setSpansCover(data.transcript ?? "");
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
      applyInterim("");
      setSpans([]);
      setSpansCover("");
      setReport(null);
      setAgentRun(null);
      transcriptRef.current = "";
    }
  }

  /**
   * The clock. Extracted because interview mode stops and restarts it between
   * questions, and the deadline it reads is rebuilt from the time left rather
   * than run continuously — so the seconds spent reading a question are not
   * charged to the answer.
   */
  function tick() {
    const left = deadlineRef.current - Date.now();
    setRemainingMs(left);
    if (left <= 0) {
      if (tickRef.current) clearInterval(tickRef.current);
      setNotice(
        `${Math.round(maxRecordingMs / 60_000)}-minute limit reached, wrapping up.`,
      );
      stopRecording();
      return;
    }
    watchForSilence();
  }

  /**
   * Stop a take that is not hearing anyone.
   *
   * Runs off the same 250ms interval as the clock rather than its own timer,
   * so there is one thing to start, stop and tear down — and so a browser that
   * throttles the tab throttles both together instead of leaving a watchdog
   * running against a frozen clock.
   *
   * The warning is not a courtesy. A recording is spent the moment it starts,
   * and someone whose microphone was muted the whole time has paid for a blank
   * transcript. Ten seconds is enough to say something and keep the take.
   */
  function watchForSilence() {
    const analyser = analyserRef.current;
    const buffer = levelBufferRef.current;
    if (!analyser || !buffer) return;

    analyser.getFloatTimeDomainData(buffer);
    let sum = 0;
    for (const sample of buffer) sum += sample * sample;
    const rms = Math.sqrt(sum / buffer.length);

    const now = Date.now();
    if (rms >= SILENCE_RMS) {
      lastVoiceAtRef.current = now;
      if (silenceLeftRef.current !== null) {
        silenceLeftRef.current = null;
        setSilenceLeft(null);
        setNotice(null);
      }
      return;
    }

    // The window opens at the start of the take, so a recording that never
    // hears anything is caught as surely as one that goes quiet halfway.
    const since = now - (lastVoiceAtRef.current ?? now);
    if (since < SILENCE_WARN_MS) return;

    const left = Math.ceil((SILENCE_WARN_MS + SILENCE_STOP_MS - since) / 1000);
    if (left <= 0) {
      silenceLeftRef.current = null;
      setSilenceLeft(null);
      setNotice(
        "Stopped. Nothing was heard. Check your microphone is unmuted and that the right input is selected.",
      );
      stopRecording();
      return;
    }
    // Only on the whole second, so this is not a state write every 250ms.
    if (silenceLeftRef.current !== left) {
      silenceLeftRef.current = left;
      setSilenceLeft(left);
    }
  }

  /** Start listening to the microphone's level, and reset the silence window. */
  function watchStream(stream: MediaStream) {
    stopWatching();
    try {
      const context = new AudioContext();
      const analyser = context.createAnalyser();
      // Small window: this measures loudness, not pitch, and a short buffer
      // keeps the per-tick cost negligible.
      analyser.fftSize = 512;
      context.createMediaStreamSource(stream).connect(analyser);
      audioContextRef.current = context;
      analyserRef.current = analyser;
      levelBufferRef.current = new Float32Array(
        new ArrayBuffer(analyser.fftSize * Float32Array.BYTES_PER_ELEMENT),
      );
    } catch {
      // No Web Audio, no watchdog. The recording is unaffected — this only
      // ever stops a take early, so failing to set it up fails safe.
    }
    lastVoiceAtRef.current = Date.now();
    silenceLeftRef.current = null;
    setSilenceLeft(null);
  }

  function stopWatching() {
    analyserRef.current = null;
    levelBufferRef.current = null;
    void audioContextRef.current?.close().catch(() => {});
    audioContextRef.current = null;
    silenceLeftRef.current = null;
    setSilenceLeft(null);
  }

  /**
   * Get the next question, or the opening set.
   *
   * Without a weakness this is a draw from the topic's stored bank — the
   * server picks the least-asked first, so nothing repeats until everything
   * has been used. With one, it is written fresh out of the answer that just
   * happened, which is the difference between a list and an examiner.
   *
   * Falls back to the course's own section questions rather than failing: an
   * interview that stops because a model was busy is worse than one whose
   * third question is shallower.
   */
  async function writeQuestion(
    weakness?: string,
    count = 1,
  ): Promise<CourseQuestion[]> {
    const already = [
      ...askingRef.current.map((item) => item.question),
      ...usedQuestionsRef.current,
    ];
    try {
      const { response, json } = await fetchJson(
        `/api/courses/${courseId}/questions`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            count,
            asked: already.slice(0, 12),
            exclude: drawnIdsRef.current.slice(0, 12),
            ...(weakness ? { weakness } : {}),
          }),
        },
        QUESTION_TIMEOUT_MS,
      );
      const written = response.ok ? (json.questions ?? []) : [];
      if (written.length > 0) {
        usedQuestionsRef.current = [
          ...usedQuestionsRef.current,
          ...written.map((item) => item.question),
        ];
        drawnIdsRef.current = [
          ...drawnIdsRef.current,
          ...written.flatMap((item) => (item.id ? [item.id] : [])),
        ];
        return written.map((item) => ({
          index: item.section_index ?? 0,
          section:
            item.section || questions[item.section_index ?? 0]?.section || "",
          question: item.question,
          keyPoints: item.key_points,
          bankId: item.id,
        }));
      }
    } catch {
      // Fall through to the course's own questions.
    }
    return questions
      .filter((item) => !already.includes(item.question))
      .slice(0, count);
  }

  /**
   * End the current answer without ending the recording.
   *
   * The take stays open: the recorder pauses, the microphone track is muted so
   * nothing said while reading the next question reaches either the audio or
   * the captions, and the clock stops. The next question therefore starts with
   * exactly the time the last one left behind.
   */
  function endSegment() {
    const current = askingRef.current[segmentIndexRef.current];
    if (!current) return;

    if (tickRef.current) clearInterval(tickRef.current);
    stopGradeLoop();
    for (const track of mediaStreamRef.current?.getAudioTracks() ?? []) {
      track.enabled = false;
    }
    // Nothing is supposed to be heard between answers — the mic is muted on
    // purpose — so the silence watchdog would stop the take for doing exactly
    // what it was told to do.
    stopWatching();
    const recorder = mediaRecorderRef.current;
    if (recorder?.state === "recording") {
      try {
        recorder.pause();
      } catch {
        // A browser that will not pause still records a continuous take; the
        // segment boundary is a position in the transcript, not in the audio.
      }
    }

    const whole = transcriptRef.current.trim();
    const answer = newSpeech(whole, capturedRef.current);
    capturedRef.current = whole;

    const segment: Segment = {
      question: current.question,
      sectionIndex: current.index,
      section: current.section,
      transcript: answer,
      score: null,
      verdict: null,
      spans: [],
      gaps: [],
      strengths: [],
    };
    segmentsRef.current = [...segmentsRef.current, segment];
    setSegments(segmentsRef.current);

    const at = segmentsRef.current.length - 1;
    const next = segmentIndexRef.current + 1;
    segmentIndexRef.current = next;
    setSegmentIndex(next);
    setStatus("between");
    applyInterim("");

    // Grade this answer, then write the next question out of what it missed.
    // This is the whole difference between a list and an examiner: question
    // two exists because of how question one went.
    if (next < INTERVIEW_QUESTIONS) {
      // Grading still runs — the recap needs it — but the next question no
      // longer waits behind it.
      const graded = gradeSegment(at, answer, current.index, current.keyPoints);

      // The adaptive follow-up, on a stopwatch.
      //
      // This was two model calls in series before the next question appeared:
      // grade the answer, then write a question out of what it missed. That is
      // ten to fifteen seconds of a card reading "choosing", between every
      // pair of questions. Whichever arrives first inside the budget wins, and
      // past the budget the banked question is shown and a late follow-up is
      // dropped rather than swapped in — a question that changes after it has
      // been read is the one thing this screen must never do.
      const banked = askingRef.current[next] ?? null;
      setWriting(true);
      let settled = false;
      const reveal = (follow: CourseQuestion | null) => {
        if (settled) return;
        settled = true;
        if (
          follow &&
          segmentIndexRef.current === next &&
          statusRef.current !== "recording"
        ) {
          const updated = [...askingRef.current];
          updated[next] = follow;
          askingRef.current = updated;
          setAsking(updated);
        }
        setWriting(false);
        // The clock only starts once there is something to answer. Counting
        // down against a question nobody has written yet is how you open a
        // microphone on someone who is still reading.
        startGrace();
      };

      void graded
        .then((weakness) => writeQuestion(weakness))
        .then((written) => reveal(written[0] ?? null))
        .catch(() => reveal(null));

      // With nothing banked there is nothing to fall back to, so the wait is
      // the only option — a slow question beats an empty card.
      if (banked) {
        window.setTimeout(() => reveal(null), FOLLOW_UP_BUDGET_MS);
      }
    } else {
      void gradeSegment(at, answer, current.index, current.keyPoints);
      startGrace();
    }
  }

  /** Pick the take back up where it stopped, on the next question. */
  function resumeRecording() {
    graceDeadlineRef.current = null;
    setCountdown(null);
    for (const track of mediaStreamRef.current?.getAudioTracks() ?? []) {
      track.enabled = true;
    }
    // A fresh window per answer. Thirty seconds of nothing on question two is
    // the same problem as thirty seconds of nothing on question one.
    const stream = mediaStreamRef.current;
    if (stream) watchStream(stream);
    const recorder = mediaRecorderRef.current;
    if (recorder?.state === "paused") {
      try {
        recorder.resume();
      } catch {
        // Nothing to do: the take is either running or already lost, and the
        // transcript is what the grading reads either way.
      }
    }

    // The deadline is rebuilt from what was left rather than kept running, so
    // the seconds spent reading a question are not charged to the answer.
    deadlineRef.current = Date.now() + Math.max(0, remainingMs);
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = setInterval(tick, 250);
    stopGradeLoop();
    gradeLoopRef.current?.();
    setStatus("recording");
  }

  /**
   * Mark one answer against the question it answered.
   *
   * Runs during the recording and writes into the segment when it lands, so a
   * slow grader delays a score appearing and nothing else.
   */
  async function gradeSegment(
    at: number,
    answer: string,
    sectionIndex: number,
    questionKeyPoints?: string[],
  ): Promise<string | undefined> {
    if (answer.length < 24 || !courseReady) return undefined;
    try {
      const { response, json } = await fetchJson(
        `/api/courses/${courseId}/analyze`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            transcript: answer,
            mode: "final",
            sectionIndex,
            ...(questionKeyPoints?.length ? { questionKeyPoints } : {}),
          }),
        },
        ANALYZE_TIMEOUT_MS,
      );
      const graded = json.report;
      if (!response.ok || !graded) return undefined;

      segmentsRef.current = segmentsRef.current.map((segment, i) =>
        i === at
          ? {
              ...segment,
              score: Math.round(graded.score),
              verdict: graded.verdict,
              spans: Array.isArray(json.spans) ? json.spans : [],
              gaps: Array.isArray(graded.gaps) ? graded.gaps : [],
              strengths: Array.isArray(graded.strengths)
                ? graded.strengths
                : [],
            }
          : segment,
      );
      setSegments(segmentsRef.current);

      // What the next question should go at: what this answer got wrong first,
      // then what it never reached.
      const missed = graded.gaps
        ?.slice(0, 3)
        .map((gap) => `${gap.phrase}: ${gap.explanation}`)
        .join(" ");
      return missed || graded.next_focus || undefined;
    } catch {
      // The answer keeps its transcript and shows no score. Saying so is the
      // report's job; failing loudly here would interrupt the next answer.
    }
    return undefined;
  }

  async function startRecording(question?: CourseQuestion) {
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
    // What this recording is answering, fixed for its whole life — including
    // the grading that happens after it stops.
    const interview = mode === "interview" && questions.length > 0;
    interviewRef.current = interview;
    // Drawn when the mode was chosen. Nothing is redrawn here: what was on
    // screen when they pressed record is what they are answering, and the
    // button is disabled until the draw lands, so this cannot be empty.
    const drawn = interview
      ? asking.length > 0
        ? asking
        : questions.slice(0, INTERVIEW_QUESTIONS)
      : [];
    askingRef.current = drawn;
    setAsking(drawn);
    segmentIndexRef.current = 0;
    setSegmentIndex(0);
    segmentsRef.current = [];
    setSegments([]);
    capturedRef.current = "";
    answeringRef.current = interview
      ? (drawn[0] ?? null)
      : (question ?? asked ?? null);

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
        "Explainaloud needs your microphone. Allow access in the browser prompt (or the padlock in the address bar) and try again.",
      );
      return;
    }

    let recorder: MediaRecorder;
    try {
      const mimeType = preferredRecorderMimeType();
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
        p_limit: dailyLimit ?? 0,
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
        `You've used all ${dailyLimit ?? 0} recordings for today. It resets at midnight your time.`,
      );
      setUsed(dailyLimit ?? 0);
      return;
    }
    if (!unlimited) setUsed((u) => u + 1);

    setTranscript("");
    applyInterim("");
    setSpans([]);
    setSpansCover("");
    setReport(null);
    setAgentRun(null);
    setDisplayedSessionId(null);
    setNotice(null);
    transcriptRef.current = "";
    lastGradedTextRef.current = "";
    browserTranscriptRef.current = "";
    serverTranscriptRef.current = "";
    startedAtRef.current = new Date().toISOString();
    manualStopRef.current = false;
    restartsRef.current = 0;
    liveCaptionsDisabledRef.current = false;
    liveTranscribeFailuresRef.current = 0;
    liveChunkCursorRef.current = 0;
    liveIncrementalRef.current = true;
    liveInitSegmentRef.current = null;
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
    watchStream(stream);
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

    // Start grading on its own clock, before a single word is in. It runs for
    // the whole recording regardless of which caption path this browser ends up
    // on, because it reads the transcript rather than being called by whichever
    // component produced it.
    stopGradeLoop();
    gradeLoopRef.current?.();

    // Hard stop at the cap. The interval only drives the readout; the
    // deadline itself is a timestamp, so a throttled background tab can't
    // let a recording run past three minutes.
    deadlineRef.current = Date.now() + maxRecordingMs;
    setRemainingMs(maxRecordingMs);
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = setInterval(tick, 250);

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
      // Finalising a phrase settles its wording; it no longer decides when
      // grading happens. That is the clock's job, and it reads interim words
      // too — so this handler's only remaining task is to keep the text
      // current, and it can run as often as the engine likes without costing
      // a request.
      if (finalChunk) {
        browserTranscriptRef.current =
          `${browserTranscriptRef.current} ${finalChunk}`.trim();
        if (!serverTranscriptRef.current) {
          transcriptRef.current = browserTranscriptRef.current;
          setTranscript(transcriptRef.current);
        }
      }
      applyInterim(interimChunk);
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
      applyInterim("");

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

  // Everything heard, settled and in-progress alike — the same text the grading
  // clock reads.
  const heardText = interim ? `${transcript} ${interim}`.trim() : transcript;
  /**
   * The words spoken since the last grade landed, rendered plain beneath the
   * coloured ones.
   *
   * This can't just be `interim` any more. Grades now cover interim words too,
   * so the last pass has usually already coloured some of what the engine is
   * still revising, and printing the interim on top of that would show those
   * words twice.
   *
   * When the engine revises rather than extends — "the russian" becoming
   * "recursion" — the coloured text is briefly a version behind and this is
   * empty. That resolves itself on the next tick, and is the quieter failure:
   * a word arriving a beat late reads as latency, the same word on screen twice
   * reads as a bug.
   */
  const ungraded =
    spans.length === 0
      ? interim
      : heardText.startsWith(spansCover)
        ? heardText.slice(spansCover.length)
        : "";
  const outOfQuota = !unlimited && remaining === 0 && status !== "recording";
  const running = status === "recording" || status === "between";
  const interviewing = mode === "interview" || interviewRef.current;
  const live = interviewing ? asking[segmentIndex] : asked;
  /**
   * The examiner is still deciding what to ask, so there is nothing to show.
   *
   * Deliberately not "show the old one until the new one lands". A question
   * that appears and then changes under the reader is the single thing this
   * screen must never do: it is being read as an instruction, and an
   * instruction that rewrites itself is worse than one that arrives late.
   */
  const drafting = interviewing && writing && (!live || status === "between");
  /**
   * Whether the take is finished and every answer has come back graded.
   *
   * Marks are a verdict on the whole thing. Handing one out per answer, while
   * the clock is still running on the next, is not feedback — it is a score
   * arriving in the middle of the exam.
   */
  const interviewComplete =
    !interviewing ||
    (!running &&
      status !== "saving" &&
      status !== "analyzing" &&
      segments.length >= Math.min(INTERVIEW_QUESTIONS, asking.length) &&
      segments.every((segment) => segment.score !== null));
  // The last question ends the whole recording; the others just end an answer.
  const lastQuestion =
    !interviewRef.current || segmentIndex >= asking.length - 1;
  /**
   * One button, four jobs. The label is the instruction — "Finishing" is not a
   * status decoration, it is the answer to "why has nothing happened since I
   * clicked", which is that the words are still being transcribed.
   */
  const primaryLabel =
    status === "awaiting-mic"
      ? "Waiting for microphone…"
      : drafting
        ? "Choosing your question…"
        : status === "saving"
          ? "Finishing…"
          : status === "analyzing"
            ? "Reading it back…"
            : status === "between"
              ? "Continue recording"
              : status === "recording"
                ? lastQuestion
                  ? "I'm done"
                  : "Next question"
                : mode === "interview" && questions.length > 0
                  ? "Start the interview"
                  : "Start explaining";
  const primaryAction = () => {
    if (status === "between") return resumeRecording();
    if (status !== "recording") return void startRecording();
    // Mid-recording in interview mode, every question but the last ends only the
    // answer. The take, and the clock, carry on.
    if (interviewRef.current && !lastQuestion) return endSegment();
    return stopRecording();
  };

  return (
    <div className="flex flex-col items-center gap-8">
      {!running && !busy && questions.length > 0 && (
        <ModeChooser
          mode={mode}
          onChange={(next) => {
            setMode(next);
            setSegmentIndex(0);
            segmentIndexRef.current = 0;
            usedQuestionsRef.current = [];
            if (next !== "interview") {
              askingRef.current = [];
              setAsking([]);
              return;
            }
            // Nothing is shown until the real questions are in hand.
            //
            // This used to display a course question immediately and replace
            // it with the drawn one about half a second later. That is the
            // question changing on its own while you read it, which reads as
            // the app deciding it meant to ask something else. A card that
            // says it is drawing is honest; a card that changes its mind is
            // not. The draw is a database read now, so the wait is short.
            askingRef.current = [];
            setAsking([]);
            drawnIdsRef.current = [];
            setWriting(true);
            void writeQuestion(undefined, INTERVIEW_QUESTIONS)
              .then((written) => {
                // The recording may have started while this was in flight —
                // it cannot, with nothing on screen to start against, but a
                // late arrival must never overwrite a live question.
                if (written.length === 0 || interviewRef.current) return;
                askingRef.current = written;
                setAsking(written);
              })
              .finally(() => setWriting(false));
          }}
          questionCount={Math.min(INTERVIEW_QUESTIONS, questions.length)}
          minutes={Math.round(maxRecordingMs / 60_000)}
        />
      )}

      {drafting ? (
        <QuestionCard
          asked={null}
          position={segmentIndex}
          total={Math.min(INTERVIEW_QUESTIONS, Math.max(asking.length, 1))}
          waiting={status === "between"}
          countdown={null}
        />
      ) : (
        live &&
        (mode === "interview" || running) && (
          <QuestionCard
            asked={live}
            position={mode === "interview" ? segmentIndex : askedAt}
            total={mode === "interview" ? asking.length : questions.length}
            waiting={status === "between"}
            countdown={status === "between" ? countdown : null}
          />
        )
      )}

      <div className="flex flex-col items-center gap-4 text-center">
        <button
          type="button"
          aria-label={primaryLabel}
          onClick={primaryAction}
          disabled={busy || outOfQuota || drafting}
          className={cn(
            "flex size-20 items-center justify-center rounded-full transition-transform active:scale-95 disabled:opacity-50",
            status === "recording" && "border-brand/40 bg-brand/10",
          )}
        >
          {status === "recording" ? (
            <Square className="size-7 fill-brand text-brand-ink" />
          ) : (
            <Mic className="size-8 text-brand-ink" />
          )}
        </button>

        {/* Directly under the button that opened the microphone.
         *
         * It was down in the transcript panel, which is the wrong place for
         * it twice over: that panel is about what you said, and on a phone it
         * is often below the fold while you are talking. The one question this
         * row answers — is it hearing me — is asked of the microphone control,
         * so the answer belongs against the microphone control. */}
        {status === "recording" && (
          <LevelMeter analyserRef={analyserRef} active={true} />
        )}

        <Button
          type="button"
          onClick={primaryAction}
          disabled={busy || outOfQuota || drafting}
          className="h-11 rounded-full bg-accent-solid px-6 font-semibold text-accent-contrast shadow-[0_0_30px_-8px_var(--color-brand-deep)] transition-transform hover:bg-accent-solid-hover active:scale-[0.97]"
        >
          {primaryLabel}
          {status === "between" && countdown !== null && (
            <span className="ml-1.5 font-mono tabular-nums opacity-70">
              {countdown}
            </span>
          )}
        </Button>

        {running && (
          <ExamClock
            remainingMs={remainingMs}
            totalMs={maxRecordingMs}
            paused={status === "between"}
            question={interviewRef.current ? segmentIndex + 1 : null}
            of={INTERVIEW_QUESTIONS}
          />
        )}

        <p className="font-mono text-[11px] tracking-[0.14em] text-subtle uppercase">
          {unlimited
            ? "Unlimited recordings"
            : `${remaining} of ${dailyLimit ?? 0} recordings left today · resets at midnight`}
        </p>

        {/* A warning, not a status line. Someone who cannot be heard is not
            reading the page — they are talking at a muted microphone — so this
            is loud, says what is wrong, and says what it is about to do. */}
        {silenceLeft !== null && (
          <div
            role="alert"
            aria-live="assertive"
            className="flex max-w-sm flex-col items-center gap-1 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3"
          >
            <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">
              We can&apos;t hear you
            </p>
            <p className="text-xs leading-5 text-foreground">
              Nothing has been picked up for 30 seconds. Check your microphone
              is unmuted and that the right input is selected. This recording
              stops in {silenceLeft}s, and it still counts against today&apos;s.
            </p>
          </div>
        )}

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

      {/* The same panel the landing page demonstrates.
       *
       * Rounded to the same radius, the same header row, the same mono
       * voice at the same size, and the same two verdict dots — drawn from
       * `--ok` and `--miss` rather than from Tailwind's palette, so the
       * green here is the exact green somebody was shown before they signed
       * up. A demo that promises one surface and delivers another is a small
       * lie told at the worst possible moment. */}
      {(status === "recording" || transcript) && (
        <div className="w-full max-w-2xl rounded-card border border-border bg-card p-6 shadow-rest">
          <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-border border-b pb-3 font-mono text-[0.68rem] text-subtle uppercase tracking-[0.09em]">
            <span className="flex items-center gap-2">
              <span
                className="size-[10px] rounded-full"
                style={{ background: "var(--ok)" }}
              />
              On track
            </span>
            <span className="flex items-center gap-2">
              <span
                className="size-[10px] rounded-full"
                style={{ background: "var(--miss)" }}
              />
              Gap
            </span>
            {status === "recording" && (
              <span className="ml-auto flex items-center gap-2 text-brand-ink">
                <span
                  className="tally-lamp size-[10px] rounded-full"
                  style={{ background: "var(--miss)" }}
                />
                Live. Nothing interrupts you
              </span>
            )}
          </div>

          <p className="min-h-[6rem] text-[1.02rem] leading-[1.6]">
            <ColouredTranscript
              spans={spans}
              fallback={transcript}
              gaps={report?.gaps ?? []}
            />
            {ungraded && <span className="text-subtle"> {ungraded}</span>}
            {status === "recording" && !transcript && !interim && (
              <span className="text-subtle">Listening…</span>
            )}
          </p>
        </div>
      )}

      <AnimatePresence>
        {report && interviewComplete && (
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
            <div className="rounded-card border border-border bg-surface p-4">
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
              className="mt-1 h-11 w-fit gap-2 rounded-full bg-accent-solid px-6 font-semibold text-accent-contrast transition-transform duration-200 ease-out hover:bg-accent-solid-hover active:scale-[0.97]"
            >
              <Link href={`/home/${slug}/gaps`}>
                See the full gap report
                <ArrowRight aria-hidden className="size-4" />
              </Link>
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Marks are held back until the interview is over.
          Seeing 38 out of 100 for question one while question two is being
          read changes how question two gets answered — it turns the rest of
          the take into a reaction to a number. The clock is still running,
          and there is nothing useful to do with the score until it stops. */}
      {segments.length > 0 && !running && interviewComplete && (
        <InterviewRecap segments={segments} />
      )}

      {sessions.length > 0 && (
        <div className="flex w-full max-w-2xl flex-col gap-2">
          <h2 className="text-sm font-medium text-subtle">Past sessions</h2>
          {sessions.map((session) => (
            <div
              key={session.id}
              className="flex flex-wrap items-start gap-3 rounded-lg border border-border bg-surface p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-xs text-subtle">
                  {/* Which of the two it was. Without it a list of past
                      sessions is a list of scores with no idea what was being
                      asked of the person, and the two are not comparable. */}
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 font-mono text-[10px] tracking-[0.1em] uppercase",
                      session.mode === "interview"
                        ? "bg-brand/12 text-brand-ink"
                        : "bg-foreground/10 text-subtle",
                    )}
                  >
                    {session.mode === "interview"
                      ? `Interview · ${INTERVIEW_QUESTIONS} questions`
                      : "Topic · open-ended"}
                  </span>
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
/**
 * The clock, made the size of the thing it is.
 *
 * It used to be a line of small mono type under the button. That is the wrong
 * weight for the constraint that defines the whole exercise: three minutes
 * shared across three questions, spend it early and question three gets what
 * is left. A quiz has a timer somewhere; an exam has a clock on the wall, and
 * you are meant to feel it.
 *
 * The bar drains rather than filling, which is the direction the resource
 * actually moves, and the last thirty seconds turn red on both the digits and
 * the bar at once so the warning cannot be missed by looking at the wrong one.
 */
function ExamClock({
  remainingMs,
  totalMs,
  paused,
  question,
  of,
}: {
  remainingMs: number;
  totalMs: number;
  paused: boolean;
  /** Which question is up, or null in topic mode where there is only one. */
  question: number | null;
  of: number;
}) {
  const left = Math.max(0, remainingMs);
  const fraction = totalMs > 0 ? Math.max(0, Math.min(1, left / totalMs)) : 0;
  const low = left <= WARN_AT_MS;

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-2">
      <p
        className={cn(
          "font-mono text-4xl font-semibold tabular-nums transition-colors duration-300",
          low ? "text-destructive" : "text-strong",
          paused && "opacity-50",
        )}
      >
        {formatClock(left)}
      </p>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface">
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-300 ease-linear",
            low ? "bg-destructive" : "bg-brand",
          )}
          style={{ width: `${fraction * 100}%` }}
        />
      </div>

      <p className="text-xs text-subtle">
        {paused
          ? "Clock stopped between questions."
          : question
            ? `Question ${question} of ${of}. This is the whole recording's time, not this question's.`
            : "Time left in this recording."}
      </p>
    </div>
  );
}

/**
 * Topic or interview, before anything starts.
 *
 * Both spend one of the day's recordings, which is the point: this is a choice
 * about how to spend it, not a cheaper and a dearer option. One asks for
 * everything you know about the topic; the other asks three questions and
 * marks each answer against the question it answered.
 */
function ModeChooser({
  mode,
  onChange,
  questionCount,
  minutes,
}: {
  mode: Mode;
  onChange: (mode: Mode) => void;
  questionCount: number;
  minutes: number;
}) {
  const options: Array<{
    value: Mode;
    icon: typeof Mic;
    title: string;
    body: string;
  }> = [
    {
      value: "topic",
      icon: Mic,
      title: "Topic mode",
      body: `Open-ended. Say what you know about the topic, in ${minutes} minutes.`,
    },
    {
      value: "interview",
      icon: Radio,
      title: "Interview mode",
      body: `${questionCount} questions, asked one at a time, sharing the same ${minutes} minutes. You cannot see the next one until you have answered this one.`,
    },
  ];

  return (
    <fieldset className="grid w-full max-w-2xl gap-3 sm:grid-cols-2">
      <legend className="sr-only">Recording mode</legend>
      {options.map((option) => {
        const selected = mode === option.value;
        const Icon = option.icon;
        return (
          <label
            key={option.value}
            htmlFor={`mode-${option.value}`}
            className={cn(
              "flex cursor-pointer flex-col gap-1.5 rounded-2xl border p-4 text-left transition-colors",
              "focus-within:ring-2 focus-within:ring-brand/40",
              selected
                ? "border-brand/40 bg-brand/[0.06]"
                : "border-border bg-surface hover:border-brand/25",
            )}
          >
            <input
              id={`mode-${option.value}`}
              type="radio"
              name="recording-mode"
              value={option.value}
              checked={selected}
              // Clicking anywhere on the card has to select it. A nested input
              // alone was not enough — `htmlFor` is what makes the whole card
              // the control rather than just the invisible dot inside it.
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            <span className="flex items-center gap-2">
              <Icon
                aria-hidden
                className={cn(
                  "size-4",
                  selected ? "text-brand-ink" : "text-subtle",
                )}
              />
              <span className="text-sm font-semibold text-strong">
                {option.title}
              </span>
            </span>
            <span className="text-xs leading-5 text-subtle">{option.body}</span>
          </label>
        );
      })}
      <p className="text-xs text-subtle sm:col-span-2">
        Either way it costs one of today's recordings.
      </p>
    </fieldset>
  );
}

/**
 * How the interview went, question by question.
 *
 * An average across the run is deliberately absent. Each answer was graded
 * against its own question, so a mean over five of them is a number about
 * nothing — and the useful reading is which question went badly, which this
 * shows directly.
 */
function InterviewRecap({ segments }: { segments: Segment[] }) {
  return (
    <div className="flex w-full max-w-2xl flex-col gap-3 rounded-card border border-border bg-surface p-5">
      <h2 className="font-mono text-[10px] tracking-[0.14em] text-subtle uppercase">
        This recording · {segments.length} answered
      </h2>

      <ol className="flex flex-col divide-y divide-border">
        {segments.map((turn, i) => (
          <li
            key={turn.question}
            className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
          >
            <span className="mt-0.5 font-mono text-[10px] text-subtle tabular-nums">
              {String(i + 1).padStart(2, "0")}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-6 text-foreground">
                {turn.question}
              </p>
              <p className="mt-0.5 text-xs text-subtle">{turn.section}</p>
            </div>
            <span
              className={cn(
                "shrink-0 font-mono text-lg font-semibold tabular-nums",
                turn.score === null
                  ? "text-subtle"
                  : turn.score >= 70
                    ? "text-green-500"
                    : turn.score >= 40
                      ? "text-amber-500"
                      : "text-red-500",
              )}
            >
              {turn.score ?? "—"}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/**
 * The question this recording answers.
 *
 * It sits above the microphone because it is the instruction, not a footnote:
 * before this the screen said "Start explaining" and left the student to guess
 * the scope, which is how someone ends up explaining a whole topic and being
 * marked down for the parts they never claimed to be covering.
 */
function QuestionCard({
  asked,
  position,
  total,
  waiting,
  countdown,
}: {
  /** Null while the examiner is still deciding. Never a stale question. */
  asked: CourseQuestion | null;
  position: number;
  total: number;
  /** Between answers: this question is up next, and nothing is being heard. */
  waiting?: boolean;
  /** Seconds until this question starts recording on its own. */
  countdown?: number | null;
}) {
  return (
    <div className="flex w-full max-w-2xl flex-col gap-3 rounded-2xl border border-brand/20 bg-brand/[0.06] p-5">
      <div className="flex items-center justify-between gap-4">
        <span className="font-mono text-[10px] tracking-[0.14em] text-subtle uppercase">
          Question {position + 1} of {total}
          {asked ? ` · ${asked.section}` : ""}
        </span>
      </div>

      {/* Keyed on the position, not the text.
          A question only ever appears once now — it is never swapped out from
          under the reader — so the animation marks moving to the next one. Key
          on the text and an exit transition can be left half-finished by a
          backgrounded tab, which strands the previous question on screen and
          looks exactly like the app reverting. */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.p
          key={asked ? position : "drafting"}
          initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -12, filter: "blur(4px)" }}
          transition={{ duration: 0.34, ease: [0.23, 1, 0.32, 1] }}
          className={cn(
            "text-lg leading-relaxed font-medium",
            asked ? "text-strong" : "text-subtle",
          )}
        >
          {asked ? asked.question : "Choosing your next question…"}
        </motion.p>
      </AnimatePresence>

      {!asked ? (
        <p className="text-xs leading-5 text-subtle">
          Stay on this tab. Nothing is being recorded and the clock is stopped,
          but switching away can pause the browser mid-take, and your next
          question appears here in a moment.
        </p>
      ) : countdown !== null && countdown !== undefined ? (
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand/15 font-mono text-lg font-semibold text-brand-ink tabular-nums">
            {countdown}
          </span>
          <p className="text-xs leading-5 text-subtle">
            Recording starts in {countdown}. The clock is stopped until it does.
          </p>
        </div>
      ) : (
        <p className="text-xs leading-5 text-subtle">
          {waiting
            ? "Take a second. The clock is stopped and the mic is off until you continue."
            : "Answer just this. You are marked on the answer, not on everything else the course covers."}
        </p>
      )}
    </div>
  );
}

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
          // Vague shares the grey of speech that made no claim, because to a
          // reader they mean the same thing: nothing was established here.
          (span.status === "vague" || span.status === "neutral") &&
            "text-subtle",
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
