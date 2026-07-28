import type { GeneratedCourse } from "~/lib/ai/schemas";

const COMMON_WORDS = new Set([
  "about",
  "after",
  "again",
  "because",
  "before",
  "being",
  "between",
  "could",
  "during",
  "explain",
  "first",
  "from",
  "into",
  "other",
  "should",
  "their",
  "there",
  "these",
  "thing",
  "those",
  "through",
  "under",
  "using",
  "which",
  "would",
]);

function meaningfulWords(text: string) {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length > 4 && !COMMON_WORDS.has(word)),
  );
}

function normalized(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function courseSectionId(index: number) {
  return `course-section-${index + 1}`;
}

export function findRelatedSectionIndex(
  sections: GeneratedCourse["sections"],
  text: string,
) {
  const normalizedTarget = normalized(text);
  const exactKeyPointSection = sections.findIndex((section) =>
    section.key_points.some((point) => {
      const keyPoint = normalized(point);
      return keyPoint.length > 10 && normalizedTarget.includes(keyPoint);
    }),
  );
  if (exactKeyPointSection >= 0) return exactKeyPointSection;

  const targetWords = meaningfulWords(text);
  if (targetWords.size === 0) return -1;

  const sectionWordSets = sections.map((section) =>
    meaningfulWords(
      [
        section.title,
        section.intuition,
        section.technical,
        section.example,
        ...section.key_points,
      ].join(" "),
    ),
  );
  const frequency = new Map<string, number>();
  for (const words of sectionWordSets) {
    for (const word of words) {
      frequency.set(word, (frequency.get(word) ?? 0) + 1);
    }
  }

  let bestIndex = -1;
  let bestScore = 0;

  sections.forEach((section, index) => {
    const sectionWords = sectionWordSets[index] ?? new Set<string>();
    const titleWords = meaningfulWords(section.title);
    const keyPointWords = meaningfulWords(section.key_points.join(" "));
    let score = 0;
    for (const word of targetWords) {
      if (!sectionWords.has(word)) continue;
      const rarity = 1 / (frequency.get(word) ?? 1);
      score += rarity;
      if (keyPointWords.has(word)) score += rarity * 2;
      if (titleWords.has(word)) score += rarity * 3;
    }
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });

  return bestIndex;
}
