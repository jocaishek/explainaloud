import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { interviewQuestionPrompt } from "~/lib/ai/prompts";
import { completeJson } from "~/lib/ai/provider";
import type { GeneratedCourse } from "~/lib/ai/schemas";

/**
 * How many questions a topic should have written down.
 *
 * Four interviews' worth. Enough that a second and third run are genuinely
 * different, and small enough that filling it is one model call.
 */
export const BANK_TARGET = 12;

/** Below this, a warm-up call tops the bank back up in the background. */
const BANK_FLOOR = 6;

/** One batch is capped so a single request cannot ask for an essay. */
const MAX_BATCH = 12;

/**
 * How much of a question's vocabulary must come from the course material.
 *
 * The prompt tells the examiner to stay inside the sections, and mostly it
 * does. Told to examine "Claude Code basics" it nonetheless asked how Claude's
 * pricing plans differ — a real question about a real product, about nothing
 * in the material, marked against key points the student was never taught.
 * An instruction is a request; this is the part that holds.
 */
const GROUNDING_FRACTION = 0.35;

/**
 * And how many of its words must be, in absolute terms.
 *
 * The fraction alone is not enough. "How do Claude's payment plans differ?" is
 * short, so the single word it shares with the material ("claude") is a large
 * slice of a small question. Both tests have to pass: enough of the question
 * has to come from the material, and enough of the material has to be in the
 * question.
 */
const MIN_MATERIAL_HITS = 3;

/** Words that carry no subject matter, so they are no evidence of grounding. */
const STOPWORDS = new Set([
  "about",
  "and",
  "are",
  "because",
  "between",
  "both",
  "but",
  "can",
  "could",
  "difference",
  "different",
  "does",
  "explain",
  "for",
  "from",
  "happen",
  "how",
  "its",
  "might",
  "not",
  "one",
  "only",
  "other",
  "rather",
  "same",
  "that",
  "the",
  "their",
  "them",
  "then",
  "there",
  "these",
  "they",
  "this",
  "those",
  "two",
  "use",
  "used",
  "uses",
  "using",
  "were",
  "what",
  "when",
  "where",
  "which",
  "while",
  "why",
  "with",
  "without",
  "would",
  "you",
  "your",
]);

/**
 * Crude suffix stripping, so a question about "reading the work trees" counts
 * as grounded in material that says "read" and "tree".
 *
 * Not a real stemmer, and it does not need to be: both sides go through it, so
 * it only has to be consistent. Without it the test rejects perfectly good
 * questions for conjugating a verb.
 */
function stem(word: string): string {
  for (const suffix of ["ing", "ies", "ed", "es", "s"]) {
    if (word.length > suffix.length + 2 && word.endsWith(suffix)) {
      return word.slice(0, -suffix.length);
    }
  }
  return word;
}

function terms(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((word) => word.length > 2 && !STOPWORDS.has(word))
    .map(stem);
}

/**
 * Whether a question is about the material it claims to examine.
 *
 * Word overlap against everything the course actually says — topic, section
 * titles, prose and key points. A question drawn from the material reuses its
 * vocabulary almost by definition; one invented from general knowledge about
 * the same product does not, because the words it needs are words the sections
 * never use.
 */
function groundedInMaterial(
  question: string,
  vocabulary: Set<string>,
): boolean {
  const words = terms(question);
  if (words.length === 0) return false;
  const hits = words.filter((word) => vocabulary.has(word)).length;
  return hits >= MIN_MATERIAL_HITS && hits / words.length >= GROUNDING_FRACTION;
}

function materialVocabulary(
  topic: string,
  sections: GeneratedCourse["sections"],
): Set<string> {
  return new Set([
    ...terms(topic),
    ...sections.flatMap((section) => [
      ...terms(section.title),
      ...terms(section.technical),
      ...section.key_points.flatMap((point) => terms(point)),
    ]),
  ]);
}

export type BankQuestion = {
  id: string;
  question: string;
  section_index: number;
  section: string;
  key_points: string[];
};

const writtenSchema = z.object({
  questions: z
    .array(
      z.object({
        question: z.string().min(8),
        section_index: z.number().int().nonnegative().default(0),
        key_points: z.array(z.string().min(1)).default([]),
      }),
    )
    .min(1),
});

type Row = {
  id: string;
  question: string;
  section_index: number;
  section: string;
  key_points: unknown;
  times_asked: number;
};

function toBankQuestion(row: Row): BankQuestion {
  return {
    id: row.id,
    question: row.question,
    section_index: row.section_index,
    section: row.section,
    key_points: Array.isArray(row.key_points)
      ? row.key_points.filter(
          (point): point is string => typeof point === "string",
        )
      : [],
  };
}

/** Fisher-Yates. In place, on a copy the caller owns. */
function shuffle<T>(items: T[]): T[] {
  const pool = [...items];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const a = pool[i];
    const b = pool[j];
    if (a !== undefined && b !== undefined) {
      pool[i] = b;
      pool[j] = a;
    }
  }
  return pool;
}

/**
 * Write `count` new questions for a course and store them.
 *
 * Every question already in the bank is passed to the model as the do-not-ask
 * list, and the unique index catches whatever slips through that instruction —
 * `ignoreDuplicates` means a near-repeat is silently dropped rather than
 * failing the whole batch and leaving the student with no interview.
 */
export async function fillQuestionBank({
  supabase,
  courseId,
  userId,
  topic,
  sections,
  count,
}: {
  supabase: SupabaseClient;
  courseId: string;
  userId: string;
  topic: string;
  sections: GeneratedCourse["sections"];
  count: number;
}): Promise<BankQuestion[]> {
  if (sections.length === 0 || count <= 0) return [];

  const { data: existing } = await supabase
    .from("course_questions")
    .select("question")
    .eq("course_id", courseId)
    .eq("user_id", userId)
    .returns<Array<{ question: string }>>();

  const asked = (existing ?? []).map((row) => row.question);

  const result = await completeJson(
    interviewQuestionPrompt({
      topic,
      sections: sections.map((section) => ({
        title: section.title,
        technical: section.technical,
        keyPoints: section.key_points,
      })),
      // The whole bank, not a recent slice: the point of this call is to add
      // questions that are not already in it, and a list it cannot see is a
      // list it will duplicate.
      asked,
      count: Math.min(count, MAX_BATCH),
    }),
    (value) => writtenSchema.parse(value),
    { fast: true, maxOutputTokens: 2200 },
  );

  const vocabulary = materialVocabulary(topic, sections);
  const rows = result.data.questions
    .filter((written) => groundedInMaterial(written.question, vocabulary))
    .map((written) => {
      const index = Math.min(written.section_index, sections.length - 1);
      const section = sections[index];
      return {
        course_id: courseId,
        user_id: userId,
        question: written.question.trim(),
        section_index: index,
        section: section?.title ?? "",
        // A question with no key points cannot be marked: the grader has no
        // yardstick, reports "you reached every key point", and hands out the
        // base score for anything at all. The section's own points are a
        // blunter rubric than a bespoke one, and far better than none.
        key_points:
          written.key_points.length > 0
            ? written.key_points
            : (section?.key_points ?? []),
      };
    })
    .filter((row) => row.key_points.length > 0);

  if (rows.length === 0) return [];

  const { data: inserted } = await supabase
    .from("course_questions")
    .upsert(rows, {
      onConflict: "course_id,question",
      ignoreDuplicates: true,
    })
    .select("id, question, section_index, section, key_points, times_asked")
    .returns<Row[]>();

  return (inserted ?? []).map(toBankQuestion);
}

/**
 * Draw `count` questions for one interview, and mark them used.
 *
 * Least-asked first, then random within that: an unasked question always beats
 * one that has been asked, so nothing repeats until everything has been used
 * once. Randomising inside the tier is what makes a second interview a
 * different interview rather than the same list in the same order.
 *
 * The bank is topped up when it runs low, and filled from empty on the first
 * draw for a course that was generated before it existed.
 */
export async function drawFromBank({
  supabase,
  courseId,
  userId,
  topic,
  sections,
  count,
  exclude = [],
}: {
  supabase: SupabaseClient;
  courseId: string;
  userId: string;
  topic: string;
  sections: GeneratedCourse["sections"];
  count: number;
  /** Question ids already drawn for this run. */
  exclude?: string[];
}): Promise<BankQuestion[]> {
  const read = async () => {
    const { data } = await supabase
      .from("course_questions")
      .select("id, question, section_index, section, key_points, times_asked")
      .eq("course_id", courseId)
      .eq("user_id", userId)
      .order("times_asked", { ascending: true })
      .limit(60)
      .returns<Row[]>();
    return (data ?? []).filter((row) => !exclude.includes(row.id));
  };

  let rows = await read();

  // Only write on the blocking path when there is genuinely nothing to draw.
  //
  // It used to top up whenever the bank dipped below a comfortable margin,
  // which meant a student with eight perfectly good questions banked waited on
  // a model call before seeing any of them. Running low is a reason to write
  // more later — `warmQuestionBank` does it off the critical path — not a
  // reason to make someone wait for questions that already exist.
  if (rows.length < count) {
    const shortfall = Math.max(BANK_TARGET - rows.length, count - rows.length);
    try {
      await fillQuestionBank({
        supabase,
        courseId,
        userId,
        topic,
        sections,
        count: Math.max(shortfall, count),
      });
      rows = await read();
    } catch {
      // A busy model is not a reason to refuse an interview. Whatever is
      // already banked still makes one, and if nothing is, the caller falls
      // back to the course's own section questions.
    }
  }

  if (rows.length === 0) return [];

  // Rows arrive least-asked first. Shuffling within each tier keeps that
  // ordering while making the choice inside it unpredictable.
  const tiers = new Map<number, Row[]>();
  for (const row of rows) {
    const tier = tiers.get(row.times_asked) ?? [];
    tier.push(row);
    tiers.set(row.times_asked, tier);
  }
  const ordered = [...tiers.entries()]
    .sort(([a], [b]) => a - b)
    .flatMap(([, tier]) => shuffle(tier));

  // One question per section where the material allows it. Three questions
  // about the same section is a narrower interview than the course can give.
  const picked: Row[] = [];
  const usedSections = new Set<number>();
  for (const row of ordered) {
    if (picked.length === count) break;
    if (usedSections.has(row.section_index)) continue;
    picked.push(row);
    usedSections.add(row.section_index);
  }
  for (const row of ordered) {
    if (picked.length === count) break;
    if (picked.includes(row)) continue;
    picked.push(row);
  }

  // Asked in course order once drawn: the sections build on each other, and
  // being asked about the end before the beginning is a different exercise.
  picked.sort((a, b) => a.section_index - b.section_index);

  // Marked used now rather than when answered. A drawn question has been seen,
  // and showing it again in the next interview because the student stopped
  // before recording is exactly the repetition this is meant to prevent.
  const now = new Date().toISOString();
  await Promise.all(
    picked.map((row) =>
      supabase
        .from("course_questions")
        .update({ times_asked: row.times_asked + 1, last_asked_at: now })
        .eq("id", row.id)
        .eq("user_id", userId),
    ),
  );

  return picked.map(toBankQuestion);
}

/**
 * Top the bank up if it is running low, off the critical path.
 *
 * Called when the record screen opens, so the model call happens while the
 * student is reading the page rather than after they have clicked and are
 * watching a spinner. Writes nothing when the bank is already healthy, which
 * is the normal case — this costs one query on most visits.
 */
export async function warmQuestionBank({
  supabase,
  courseId,
  userId,
  topic,
  sections,
}: {
  supabase: SupabaseClient;
  courseId: string;
  userId: string;
  topic: string;
  sections: GeneratedCourse["sections"];
}): Promise<number> {
  const { count } = await supabase
    .from("course_questions")
    .select("id", { count: "exact", head: true })
    .eq("course_id", courseId)
    .eq("user_id", userId);

  const held = count ?? 0;
  if (held >= BANK_FLOOR) return 0;

  const written = await fillQuestionBank({
    supabase,
    courseId,
    userId,
    topic,
    sections,
    count: BANK_TARGET - held,
  });
  return written.length;
}

/**
 * The grounding test, for questions that never touch the bank.
 *
 * The adaptive follow-up is written on the spot out of the last answer, so it
 * skips `fillQuestionBank` entirely — and it is written by the same model,
 * under the same instruction, with the same tendency to drift off the material
 * when it runs out of things to ask.
 */
export function isGroundedQuestion(
  question: string,
  topic: string,
  sections: GeneratedCourse["sections"],
): boolean {
  return groundedInMaterial(question, materialVocabulary(topic, sections));
}
