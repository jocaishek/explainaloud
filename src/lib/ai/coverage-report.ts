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
const SCORE_BASE = 0.3;
const SCORE_COVERAGE = 0.4;
const SCORE_DEPTH = 0.3;

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
  const missingKeyPoints = keyPoints.filter(
    (_, index) => !covered.has(index) && !partial.has(index),
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

  const partialOnly = [...partial].filter((index) => !covered.has(index));
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
  const depth = covered.size > 0 ? thoroughCount / covered.size : 0;

  const understanding =
    SCORE_BASE + SCORE_COVERAGE * coverage + SCORE_DEPTH * depth;
  const score = Math.round(accuracy * understanding * 100);
  // Drop anything the coach invented before it can reach a student.
  const flaggedSpanTexts = spans
    .filter((span) => span.status === "gap")
    .map((span) => normalizedConcept(span.text ?? ""));
  const coachedGaps = draft.gaps.filter((gap) =>
    isJustified(gap, flaggedSpanTexts, missingKeyPoints),
  );

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
    missingCount === 0
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
