type CoachingGap = {
  phrase: string;
  category: "missing_step" | "misconception" | "vague" | "contradicted";
  explanation: string;
};

type CoachingReport = {
  score: number;
  verdict: string;
  gaps: CoachingGap[];
  strengths: string[];
  next_focus: string;
};

type EvaluatedSpan = {
  status: "correct" | "gap" | "vague" | "neutral";
  /** Present for real spans; absent only in the degraded local fallback. */
  text?: string;
};

export function coveredKeyPointIndices(values: number[], total: number) {
  return new Set(
    values.filter(
      (value) => Number.isInteger(value) && value >= 0 && value < total,
    ),
  );
}

function normalizedConcept(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function reportCoversConcept(report: CoachingReport, keyPoint: string) {
  const expected = normalizedConcept(keyPoint);
  return report.gaps.some((gap) => {
    const coaching = normalizedConcept(`${gap.phrase} ${gap.explanation}`);
    return coaching.includes(expected) || expected.includes(coaching);
  });
}

/**
 * How the three signals combine.
 *
 * The base is deliberately non-zero: saying true things about the subject is
 * itself evidence of knowing something, and a rubric that awards nothing for it
 * tells an accurate student they know nothing. Coverage carries the most weight
 * because breadth is what the course asks for, and depth is close behind
 * because explaining beats naming. They sum to 1, so a student who covers
 * everything, explains all of it, and says nothing false scores 100 -- and
 * nothing short of that does.
 */
/**
 * How much of the score accuracy can take away.
 *
 * It used to multiply the whole thing, so a run where the evaluator marked no
 * span "correct" scored exactly zero — for three minutes of on-topic speech
 * about the right subject. Zero is a claim that nothing said had any value,
 * and it is essentially never true of someone who showed up and explained
 * something. Being wrong still costs more than being incomplete, which is why
 * this is a multiplier at all; it just no longer erases the rest.
 */
const ACCURACY_FLOOR = 0.45;

const SCORE_BASE = 0.3;
const SCORE_COVERAGE = 0.4;
const SCORE_DEPTH = 0.3;

/**
 * What a covered-but-not-elaborated point is worth on the depth axis.
 *
 * Thoroughness is deliberately hard to earn — it is the difference between
 * memorising a label and understanding a mechanism — but zero is the wrong
 * floor. Someone who reached a point and stated it correctly did more than
 * someone who never mentioned it, and scoring both at nothing for depth is
 * what made an accurate three-minute answer land in the fifties. Full marks
 * still need real explanation; this only stops the axis collapsing.
 */
const DEPTH_FLOOR = 0.35;

/**
 * How much of a key point's substance has to appear in what was said before
 * calling it "not covered" becomes a claim the transcript contradicts.
 *
 * A backstop, not the main path — the grader decides coverage, and it is right
 * far more often than not. But its false negatives are the most damaging
 * output this product has: a student reads "you didn't get to this" next to
 * their own sentence saying exactly that, and stops trusting the number.
 */
const ECHO_FRACTION = 0.6;

/** Words too common to be evidence that a concept was actually discussed. */
const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "because",
  "but",
  "by",
  "can",
  "for",
  "from",
  "has",
  "have",
  "how",
  "in",
  "into",
  "is",
  "it",
  "its",
  "of",
  "on",
  "or",
  "that",
  "the",
  "their",
  "them",
  "then",
  "there",
  "these",
  "they",
  "this",
  "to",
  "was",
  "were",
  "what",
  "when",
  "which",
  "while",
  "who",
  "why",
  "will",
  "with",
  "you",
  "your",
]);

function contentWords(value: string): string[] {
  return normalizedConcept(value)
    .split(" ")
    .filter((word) => word.length > 2 && !STOPWORDS.has(word));
}

/**
 * Whether the transcript plainly contains a key point's substance.
 *
 * Word overlap rather than substring, because a student says it in their own
 * order and their own words — which is exactly the case the grader is supposed
 * to accept and occasionally does not.
 */
function echoedInTranscript(keyPoint: string, transcriptWords: Set<string>) {
  const words = contentWords(keyPoint);
  if (words.length < 3) return false;
  const hits = words.filter((word) => transcriptWords.has(word)).length;
  return hits / words.length >= ECHO_FRACTION;
}

/**
 * Shortest phrase worth matching on. Below this, "the" or "and" would match
 * almost any key point and let anything through.
 */
const MIN_MATCHABLE_CHARS = 10;

/**
 * Whether a coached gap is backed by something the evaluator actually found.
 *
 * The Gap Coach is asked to teach only the flagged spans and the uncovered key
 * points, and it does not reliably obey: given both lists empty it still
 * returned four "gaps", each quoting a sentence the same run had just marked
 * correct, and on one occasion asserted the Calvin cycle happens in the
 * thylakoid membrane. Telling a student they missed something they explained
 * correctly is the most corrosive output this product has, so it is enforced
 * here rather than requested in a prompt.
 */
function isJustified(
  gap: CoachingGap,
  flaggedSpanTexts: string[],
  missingKeyPoints: string[],
): boolean {
  const phrase = normalizedConcept(gap.phrase);
  if (phrase.length < MIN_MATCHABLE_CHARS) return false;

  // Quoting a span the evaluator flagged as wrong.
  if (
    flaggedSpanTexts.some(
      (text) =>
        text.length >= MIN_MATCHABLE_CHARS &&
        (text.includes(phrase) || phrase.includes(text)),
    )
  ) {
    return true;
  }

  // Or naming a key point the student never covered. Matched against the
  // explanation too, since an omission is labelled with a concept rather than
  // with the student's words.
  const blob = normalizedConcept(`${gap.phrase} ${gap.explanation}`);
  return missingKeyPoints.some((keyPoint) => {
    const point = normalizedConcept(keyPoint);
    if (point.length < MIN_MATCHABLE_CHARS) return false;
    return blob.includes(point) || point.includes(phrase);
  });
}

export function completeCoverageReport({
  draft,
  keyPoints,
  covered,
  partial,
  thorough,
  spans,
  transcript = "",
  scoped = false,
}: {
  draft: CoachingReport;
  keyPoints: string[];
  covered: Set<number>;
  /** Points whose substance was there but incomplete. Half credit. */
  partial: Set<number>;
  /** Covered points the student explained rather than merely named. */
  thorough: Set<number>;
  spans: EvaluatedSpan[];
  /** What was actually said, for the not-covered backstop. */
  transcript?: string;
  /**
   * Whether these key points are one question's worth rather than the whole
   * course. Changes only the wording: "the 3 course key points" is misleading
   * when the student was asked about three of a course's twelve.
   */
  scoped?: boolean;
}): CoachingReport {
  // Partially covered points are not missing. Listing them as weaknesses is
  // what produced "Missing Step: the light-dependent reactions produce ATP and
  // NADPH" for a student who had just said the light reactions make ATP.
  const transcriptWords = new Set(contentWords(transcript));
  // Demoted, not promoted: a point the transcript plainly contains is at worst
  // partial. It does not become fully covered — the grader may have withheld
  // coverage because the substance was there but wrong — but it stops being
  // reported as something they never reached.
  const echoed = new Set(
    keyPoints
      .map((keyPoint, index) => ({ keyPoint, index }))
      .filter(
        ({ keyPoint, index }) =>
          !covered.has(index) &&
          !partial.has(index) &&
          echoedInTranscript(keyPoint, transcriptWords),
      )
      .map(({ index }) => index),
  );
  const missingKeyPoints = keyPoints.filter(
    (_, index) =>
      !covered.has(index) && !partial.has(index) && !echoed.has(index),
  );
  // Accuracy is right-against-wrong, so only spans that actually committed to
  // something count. Vague speech is neither: including it would make "I'm not
  // sure, something about ATP" arithmetically identical to being wrong, which
  // is the opposite of what grey is for.
  const claimSpans = spans.filter(
    (span) => span.status === "correct" || span.status === "gap",
  );
  const correctClaims = claimSpans.filter(
    (span) => span.status === "correct",
  ).length;
  // A tester explained photosynthesis accurately, every span came back green,
  // and the score was 8 out of 100. Two fractions of the whole course were
  // being multiplied together: 2 of 12 points covered and 0 of 12 explained in
  // depth, so a partial-but-correct explanation was penalised twice for the
  // same thing. Nobody speaking for two minutes covers a twelve-point rubric,
  // and a score that assumes they should is measuring recitation.
  //
  // Three signals now, weighted rather than multiplied:
  //
  //   accuracy   was what you said true? Multiplies everything, because
  //              being wrong is different in kind from being incomplete.
  //   coverage   how much of the material you reached, with half credit for
  //              points whose substance you got.
  //   depth      of the points you did cover, how many you explained rather
  //              than named. Measured against what you covered, not against
  //              the whole course, so a narrow but well-explained answer is
  //              not punished for its narrowness twice.
  //
  // The base term is what says "you spoke accurately about this subject" has
  // value on its own. Full marks still require covering the material and
  // explaining it, so 100 stays rare.
  const accuracy =
    claimSpans.length > 0 ? correctClaims / claimSpans.length : 0;

  const partialOnly = [...new Set([...partial, ...echoed])].filter(
    (index) => !covered.has(index),
  );
  const coverage =
    keyPoints.length > 0
      ? Math.min(
          1,
          (covered.size + partialOnly.length * 0.5) / keyPoints.length,
        )
      : 0;

  // Guard against a model returning indices not present in `covered`.
  const thoroughCount = [...thorough].filter((index) =>
    covered.has(index),
  ).length;
  const depth =
    covered.size > 0
      ? (thoroughCount + DEPTH_FLOOR * (covered.size - thoroughCount)) /
        covered.size
      : 0;

  /**
   * Whether anything at all landed on the subject.
   *
   * The base term says "you spoke accurately about this" and is worth real
   * marks, but it presupposes there was something to speak about. Handed out
   * unconditionally it paid 30 out of 100 for "duh duh duh, six seven, six
   * seven" — nothing covered, nothing partial, not one correct claim. A score
   * that cannot tell that from an honest attempt is not measuring anything.
   */
  const engaged = correctClaims > 0 || covered.size > 0 || partial.size > 0;

  const understanding =
    (engaged ? SCORE_BASE : 0) +
    SCORE_COVERAGE * coverage +
    SCORE_DEPTH * depth;
  // No checkable claims at all is not the same as every claim being wrong.
  // Speech too hedged to mark is graded on what it covered — but only when it
  // covered something, which `engaged` has already settled.
  const accuracyFactor =
    claimSpans.length === 0
      ? 1
      : ACCURACY_FLOOR + (1 - ACCURACY_FLOOR) * accuracy;
  const score = Math.round(accuracyFactor * understanding * 100);
  // Drop anything the coach invented before it can reach a student.
  const flaggedSpanTexts = spans
    .filter((span) => span.status === "gap")
    .map((span) => normalizedConcept(span.text ?? ""));
  // A gap whose own explanation is already in the transcript is not a gap.
  //
  // The clearest failure this report has: "For example, like hackathons, even
  // startups" flagged as missed, explained as "Claude Code can be used in
  // various applications such as hackathons and startups" — the thing they
  // had just said, printed back at them as the thing they had not said, three
  // inches below the same sentence listed as a strength. A misconception is
  // untouched by this, because its explanation is the correct fact and the
  // correct fact is precisely what is absent from the transcript.
  const strengthWords = draft.strengths.map((strength) =>
    contentWords(strength).join(" "),
  );
  const coachedGaps = draft.gaps
    .filter((gap) => isJustified(gap, flaggedSpanTexts, missingKeyPoints))
    .filter((gap) => !echoedInTranscript(gap.explanation, transcriptWords))
    // And one the report itself already credits them for. Saying both on one
    // screen is not strictness, it is the page disagreeing with itself.
    .filter((gap) => {
      const words = contentWords(gap.explanation).join(" ");
      return (
        words.length === 0 ||
        !strengthWords.some(
          (strength) =>
            strength.length > 0 &&
            (strength.includes(words) || words.includes(strength)),
        )
      );
    });

  const supplementalGaps = missingKeyPoints
    .filter((keyPoint) => !reportCoversConcept(draft, keyPoint))
    .map((keyPoint) => ({
      phrase: keyPoint,
      category: "missing_step" as const,
      explanation: `The course material says: ${keyPoint}`,
    }));
  const missingCount = missingKeyPoints.length;
  const partialNote =
    partialOnly.length > 0
      ? ` You partly covered ${partialOnly.length} more.`
      : "";
  // "Course key points" is the wrong noun for a question's worth of them, and
  // the difference matters: it is the sentence that tells someone whether the
  // number in front of them is about their answer or about the whole syllabus.
  const pointsNoun = scoped
    ? "points this question is about"
    : "course key points";
  const coverageVerdict =
    keyPoints.length === 0
      ? "There was nothing to mark this against — the question arrived without any key points."
      : !engaged
        ? "Nothing in this recording addressed the question."
        : missingCount === 0
          ? scoped
            ? "You covered everything this question was asking for."
            : `You covered all ${keyPoints.length} course key points.`
          : `You covered ${covered.size} of ${keyPoints.length} ${pointsNoun}.${partialNote} The other ${missingCount} you did not get to — that is not the same as getting them wrong.`;
  const accuracyVerdict =
    claimSpans.length > 0
      ? ` ${correctClaims} of ${claimSpans.length} checkable claim${claimSpans.length === 1 ? " was" : "s were"} accurate.`
      : "";
  const depthVerdict =
    covered.size > 0 && thoroughCount < covered.size
      ? ` You explained ${thoroughCount} of them in depth; the rest you stated without saying how or why.`
      : "";

  return {
    ...draft,
    score,
    verdict: `${coverageVerdict}${depthVerdict}${accuracyVerdict}`,
    gaps: [...coachedGaps, ...supplementalGaps],
    next_focus: draft.next_focus || missingKeyPoints[0] || "",
  };
}
