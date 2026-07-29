/**
 * Turning word timestamps into a description of how someone spoke.
 *
 * Everything here is arithmetic over the word list Whisper already returns —
 * no model, no audio, nothing that runs on the student's machine. The point is
 * to capture *how* an explanation was delivered, so that hesitation can be
 * weighed alongside what the grader independently found wrong with it.
 *
 * Two rules shape the whole module:
 *
 * 1. **Medians and percentiles, never means.** A single four-second pause
 *    wrecks a mean and drags every other window below it, which is precisely
 *    the case this is meant to detect. Order statistics are barely more code
 *    and do not have that failure.
 *
 * 2. **Nothing here decides that anyone is confused.** These are measurements.
 *    Interpretation needs a per-speaker baseline (see `compareToBaseline`) and
 *    ought to be corroborated by a grader finding before it is ever shown —
 *    a slow, careful speaker and a non-native speaker both read as "hesitant"
 *    to any threshold applied in isolation.
 */

/** One word, as Whisper timestamps it. Times are seconds from audio start. */
export type TranscribedWord = {
  word: string;
  start: number;
  end: number;
};

/**
 * Silence shorter than this is articulation, not hesitation — stop consonants
 * alone open gaps of this size. Counting them would swamp the real signal.
 */
export const PAUSE_FLOOR_MS = 200;

/**
 * Window over which speaking rate is measured, and how far each window moves.
 *
 * Ten seconds because anything shorter swings wildly on a single long
 * technical term; the stride overlaps so a dip cannot fall between windows.
 */
export const RATE_WINDOW_SECONDS = 10;
export const RATE_STRIDE_SECONDS = 2.5;

/**
 * Windows sparser than this are silence or a single stray word, not speech,
 * and would drag the distribution toward zero.
 */
const MIN_WORDS_PER_WINDOW = 3;

/**
 * Least speech needed before a rate is worth reporting at all. Under this
 * there are too few windows for a median to mean anything.
 */
export const MIN_SPEAKING_SECONDS = 12;

/** Fillers counted toward the disfluency rate, as whole words. */
const FILLER_PATTERN =
  /^(um|uh|erm|er|hmm|mm|like|basically|literally|actually)$/i;

/**
 * Percentile used as the "capable pace" reference within a single recording.
 *
 * Not the median: when someone is shaky about an entire topic the median sinks
 * with them and dips vanish exactly when they matter most. Their better
 * stretches are the closest available stand-in for how they sound when they
 * know something — imperfect, but it degrades far more gracefully.
 */
export const CAPABLE_PACE_PERCENTILE = 0.8;

export type PauseStats = {
  /** Gaps above `PAUSE_FLOOR_MS`. */
  count: number;
  medianMs: number;
  p90Ms: number;
  longestMs: number;
  /** Gaps that fell inside a clause rather than after its punctuation. */
  midClauseCount: number;
  longestMidClauseMs: number;
};

export type SpeechMetrics = {
  wordCount: number;
  /** Wall time from first word to last, in seconds. */
  speakingSeconds: number;
  /** Median of the windowed speaking rates. */
  medianWpm: number;
  /** The `CAPABLE_PACE_PERCENTILE` rate, this recording's confident pace. */
  capableWpm: number;
  pauses: PauseStats;
  /** Fillers per 100 words, so it compares across recording lengths. */
  fillerPer100: number;
  /**
   * False when there was too little speech for the rates to mean anything.
   * The numbers are still returned — they are just not worth acting on.
   */
  reliable: boolean;
};

function median(sorted: number[]): number {
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? (sorted[mid] as number)
    : ((sorted[mid - 1] as number) + (sorted[mid] as number)) / 2;
}

/** Nearest-rank percentile over an already-sorted ascending array. */
function percentile(sorted: number[], fraction: number): number {
  if (sorted.length === 0) return 0;
  const rank = Math.ceil(fraction * sorted.length) - 1;
  return sorted[Math.min(sorted.length - 1, Math.max(0, rank))] as number;
}

/**
 * True when a word ends a clause, so a pause after it is punctuation rather
 * than a search for the next idea.
 *
 * Whisper attaches punctuation to the word it follows, which is what makes
 * this a string check rather than a parse. When a provider strips punctuation
 * every pause reads as mid-clause; that is the safe direction to be wrong in,
 * since mid-clause pauses are held to a stricter duration.
 */
function endsClause(word: string): boolean {
  return /[.,;:!?—]["')\]]?$/.test(word.trim());
}

function pauseStats(words: TranscribedWord[]): PauseStats {
  const all: number[] = [];
  const midClause: number[] = [];

  for (let i = 0; i < words.length - 1; i++) {
    const current = words[i] as TranscribedWord;
    const next = words[i + 1] as TranscribedWord;
    const gapMs = (next.start - current.end) * 1000;
    if (gapMs < PAUSE_FLOOR_MS) continue;

    all.push(gapMs);
    if (!endsClause(current.word)) midClause.push(gapMs);
  }

  all.sort((a, b) => a - b);
  midClause.sort((a, b) => a - b);

  return {
    count: all.length,
    medianMs: Math.round(median(all)),
    p90Ms: Math.round(percentile(all, 0.9)),
    longestMs: Math.round(all.at(-1) ?? 0),
    midClauseCount: midClause.length,
    longestMidClauseMs: Math.round(midClause.at(-1) ?? 0),
  };
}

/** Windowed speaking rates in words per minute, ascending. */
function windowedRates(words: TranscribedWord[]): number[] {
  const first = words[0];
  const last = words.at(-1);
  if (!first || !last) return [];

  // Midpoints, so a word straddling a boundary is counted once rather than in
  // both neighbouring windows.
  const midpoints = words.map((word) => (word.start + word.end) / 2);
  const rates: number[] = [];

  for (
    let start = first.start;
    start + RATE_WINDOW_SECONDS <=
    Math.max(last.end, first.start + RATE_WINDOW_SECONDS);
    start += RATE_STRIDE_SECONDS
  ) {
    const end = start + RATE_WINDOW_SECONDS;
    let count = 0;
    for (const midpoint of midpoints) {
      if (midpoint >= start && midpoint < end) count++;
    }
    if (count >= MIN_WORDS_PER_WINDOW) {
      rates.push((count * 60) / RATE_WINDOW_SECONDS);
    }
  }

  return rates.sort((a, b) => a - b);
}

/**
 * Describes a delivery. Returns null when there are no usable timestamps at
 * all, so callers can carry on with a plain transcript rather than storing
 * zeroes that would later be indistinguishable from a very slow speaker.
 */
export function speechMetrics(words: TranscribedWord[]): SpeechMetrics | null {
  const usable = words.filter(
    (word) =>
      Number.isFinite(word.start) &&
      Number.isFinite(word.end) &&
      word.end >= word.start &&
      word.word.trim().length > 0,
  );
  if (usable.length < 2) return null;

  const first = usable[0] as TranscribedWord;
  const last = usable.at(-1) as TranscribedWord;
  const speakingSeconds = Math.max(0, last.end - first.start);

  const rates = windowedRates(usable);
  const fillers = usable.filter((word) =>
    FILLER_PATTERN.test(word.word.replace(/[^\p{L}]/gu, "")),
  ).length;

  // With too little audio for a full window, fall back to the overall rate so
  // the field is never a misleading zero — `reliable` is what says not to
  // trust it.
  const overallWpm =
    speakingSeconds > 0 ? (usable.length * 60) / speakingSeconds : 0;

  return {
    wordCount: usable.length,
    speakingSeconds: Number(speakingSeconds.toFixed(2)),
    medianWpm: Math.round(rates.length ? median(rates) : overallWpm),
    capableWpm: Math.round(
      rates.length ? percentile(rates, CAPABLE_PACE_PERCENTILE) : overallWpm,
    ),
    pauses: pauseStats(usable),
    fillerPer100: Number(((fillers / usable.length) * 100).toFixed(1)),
    reliable: speakingSeconds >= MIN_SPEAKING_SECONDS && rates.length > 0,
  };
}

/**
 * The reference a later recording is judged against.
 *
 * `sampleCount` exists so a single warm-up is not mistaken for a settled
 * picture of someone: the display should hedge until several real sessions
 * have accumulated.
 */
export type SpeechBaseline = {
  medianWpm: number;
  capableWpm: number;
  pauseP90Ms: number;
  fillerPer100: number;
  sampleCount: number;
};

/**
 * Fraction below the reference pace that counts as a real drop.
 *
 * A tenth is inside the noise of ordinary sentence-to-sentence variation.
 * A quarter is roughly where a listener starts to hear hesitancy, which is the
 * point of comparison worth reporting.
 */
export const PACE_DROP_FRACTION = 0.25;

/** A pause worth mentioning, by position. Mid-clause is held to less. */
export const PAUSE_FLAG_MS = 2000;
export const PAUSE_FLAG_MID_CLAUSE_MS = 1200;

export type BaselineComparison = {
  /** This delivery's pace as a fraction of the reference, e.g. 0.72. */
  paceRatio: number;
  paceDropped: boolean;
  pausedLongerThanUsual: boolean;
  moreFillersThanUsual: boolean;
  /**
   * Whether any of this is worth showing. False when either side of the
   * comparison is too thin to support it.
   */
  worthReporting: boolean;
};

/**
 * Compares one delivery against a speaker's own reference.
 *
 * Deliberately returns booleans and a ratio rather than prose: the wording
 * belongs next to the grader's findings, where it can be tied to a specific
 * claim instead of floating free as a verdict about the person.
 */
export function compareToBaseline(
  metrics: SpeechMetrics,
  baseline: SpeechBaseline,
): BaselineComparison {
  const reference = baseline.capableWpm || baseline.medianWpm;
  const paceRatio = reference > 0 ? metrics.medianWpm / reference : 1;

  return {
    paceRatio: Number(paceRatio.toFixed(2)),
    paceDropped: paceRatio <= 1 - PACE_DROP_FRACTION,
    // 1.5x is a deliberately blunt line. Pause distributions are noisy at the
    // lengths these recordings run to, and a tighter one would fire on
    // ordinary variation between two recordings by the same person.
    pausedLongerThanUsual:
      baseline.pauseP90Ms > 0 &&
      metrics.pauses.p90Ms > baseline.pauseP90Ms * 1.5,
    moreFillersThanUsual:
      baseline.fillerPer100 > 0 &&
      metrics.fillerPer100 > baseline.fillerPer100 * 1.5,
    worthReporting: metrics.reliable && reference > 0,
  };
}
