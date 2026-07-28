const ANALOGY_OPENERS =
  /^(imagine\b|think of\b|picture\b|can you think\b|how would you explain\b)/i;

/**
 * Older reports can contain several analogy prompts and check questions.
 * Keep the direct teaching sentences while newly generated reports adopt the
 * shorter prompt contract.
 */
export function conciseTeachingText(text: string, maxLength = 260) {
  const sentences =
    text
      .match(/[^.!?]+[.!?]?/g)
      ?.map((sentence) => sentence.trim())
      .filter(Boolean) ?? [];

  const direct = sentences.filter(
    (sentence) => !ANALOGY_OPENERS.test(sentence) && !sentence.endsWith("?"),
  );
  const selected = (direct.length > 0 ? direct : sentences).slice(0, 2);
  const summary = selected.join(" ").trim();

  if (summary.length <= maxLength) return summary;

  const clipped = summary.slice(0, maxLength + 1);
  const lastSpace = clipped.lastIndexOf(" ");
  return `${clipped.slice(0, lastSpace > 0 ? lastSpace : maxLength).trim()}…`;
}
