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
  status: "correct" | "gap" | "neutral";
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
  thorough,
  spans,
}: {
  draft: CoachingReport;
  keyPoints: string[];
  covered: Set<number>;
  /** Covered points the student explained rather than merely named. */
  thorough: Set<number>;
  spans: EvaluatedSpan[];
}): CoachingReport {
  const missingKeyPoints = keyPoints.filter((_, index) => !covered.has(index));
  const claimSpans = spans.filter((span) => span.status !== "neutral");
  const correctClaims = claimSpans.filter(
    (span) => span.status === "correct",
  ).length;
  // Coverage answers "did they say it", thoroughness "did they explain it".
  //
  // Coverage alone made full marks cheap: name every point in a sentence each
  // and the rubric had nothing left to ask for. Weighting the two equally means
  // 100 requires every point explained, not merely mentioned, and multiplying
  // by accuracy means one wrong claim still pulls it down. Someone who lists
  // labels correctly now lands near 50, which is the honest reading of what
  // they demonstrated.
  const coverage = keyPoints.length > 0 ? covered.size / keyPoints.length : 0;
  const thoroughness =
    keyPoints.length > 0
      ? // Guard against a model returning indices not present in `covered`.
        [...thorough].filter((index) => covered.has(index)).length /
        keyPoints.length
      : 0;
  const accuracy =
    claimSpans.length > 0 ? correctClaims / claimSpans.length : 0;
  const understanding = coverage * 0.5 + thoroughness * 0.5;
  const score = Math.round(understanding * accuracy * 100);
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
  const coverageVerdict =
    missingCount === 0
      ? `You correctly covered all ${keyPoints.length} course key points.`
      : `You correctly covered ${covered.size} of ${keyPoints.length} course key points. ${missingCount} key detail${missingCount === 1 ? " is" : "s are"} still missing.`;
  const accuracyVerdict =
    claimSpans.length > 0
      ? ` ${correctClaims} of ${claimSpans.length} checkable claim${claimSpans.length === 1 ? " was" : "s were"} accurate.`
      : "";
  // Without this the score is inexplicable: someone who covered everything and
  // said nothing wrong would see a number well under 100 and no reason for it.
  const thoroughCount = [...thorough].filter((index) =>
    covered.has(index),
  ).length;
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
