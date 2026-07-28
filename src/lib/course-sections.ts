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

export function courseSectionId(index: number) {
  return `course-section-${index + 1}`;
}

export function findRelatedSectionIndex(
  sections: GeneratedCourse["sections"],
  text: string,
) {
  const targetWords = meaningfulWords(text);
  if (targetWords.size === 0) return -1;

  let bestIndex = -1;
  let bestScore = 0;

  sections.forEach((section, index) => {
    const sectionWords = meaningfulWords(
      [
        section.title,
        section.intuition,
        section.technical,
        section.example,
        ...section.key_points,
      ].join(" "),
    );
    let score = 0;
    for (const word of targetWords) {
      if (sectionWords.has(word)) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });

  return bestIndex;
}
