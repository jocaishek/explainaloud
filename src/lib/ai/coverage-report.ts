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

export function completeCoverageReport({
  draft,
  keyPoints,
  covered,
  spans,
}: {
  draft: CoachingReport;
  keyPoints: string[];
  covered: Set<number>;
  spans: EvaluatedSpan[];
}): CoachingReport {
  const missingKeyPoints = keyPoints.filter((_, index) => !covered.has(index));
  const claimSpans = spans.filter((span) => span.status !== "neutral");
  const correctClaims = claimSpans.filter(
    (span) => span.status === "correct",
  ).length;
  const coverage = keyPoints.length > 0 ? covered.size / keyPoints.length : 0;
  const accuracy =
    claimSpans.length > 0 ? correctClaims / claimSpans.length : 0;
  const score = Math.round(coverage * accuracy * 100);
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

  return {
    ...draft,
    score,
    verdict: `${coverageVerdict}${accuracyVerdict}`,
    gaps: [...draft.gaps, ...supplementalGaps],
    next_focus: draft.next_focus || missingKeyPoints[0] || "",
  };
}
