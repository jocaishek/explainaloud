/**
 * What the transcriber is told to expect before it hears a word of it.
 *
 * Whisper's prompt is a decoding bias rather than an instruction: a term in it
 * is far likelier to come back spelled that way. That matters more here than
 * in most places a transcript is used, because the transcript is not the
 * product — it is the thing the grader reads. A student who says "Bacon's
 * Rebellion" and gets "bacons rebellion" back has not been marked on what they
 * said, and the appeal they cannot make is the worst kind of wrong answer.
 *
 * The route already passed the course's section titles and key points. Those
 * are *sentences*, and the prompt is capped — it has to be, because past a few
 * hundred characters the bias starts steering the transcript towards the
 * prompt's wording rather than the speaker's. One key point spends forty-five
 * characters of the budget to protect one word:
 *
 *     "Mitosis copies the DNA before anything splits"
 *      ^^^^^^^                ^^^
 *
 * So the budget bought about eight sentences, and most of what it protected
 * was "copies", "before" and "anything" — words no transcriber has ever got
 * wrong. This module spends the same budget on terms instead, which is forty
 * of them, and puts the ones most likely to be mangled first.
 */

import type { GeneratedCourse } from "~/lib/ai/schemas";

/**
 * Words that are never worth protecting, and are common enough to crowd out
 * the words that are.
 *
 * Deliberately short. This is not a stopword list for search — a term only has
 * to survive being *ranked*, and the ranking already prefers proper nouns and
 * long words, so the list only needs to catch the ones that would otherwise
 * score well: long, ordinary, and frequent in academic prose.
 */
const NEVER_WORTH_IT = new Set([
  "about",
  "another",
  "because",
  "become",
  "becomes",
  "between",
  "concept",
  "consider",
  "describe",
  "different",
  "difference",
  "example",
  "explain",
  "following",
  "however",
  "important",
  "include",
  "includes",
  "including",
  "process",
  "question",
  "something",
  "student",
  "students",
  "system",
  "therefore",
  "through",
  "understand",
  "understanding",
  "whether",
  "without",
]);

/**
 * Words that start sentences rather than names.
 *
 * Every sentence hands over a capitalised first word, and taking those at face
 * value fills the list with "The" and "Because". Distrusting the first word
 * outright is worse: a section is titled "Bacon's Rebellion and the
 * Chesapeake", and dropping its first word does not lose a term, it invents
 * one — "Rebellion and the Chesapeake", a phrase nobody will ever say. So the
 * first word is trusted unless it is one of these.
 */
const SENTENCE_STARTERS = new Set([
  "a",
  "an",
  "and",
  "as",
  "at",
  "because",
  "but",
  "by",
  "for",
  "from",
  "how",
  "if",
  "in",
  "it",
  "on",
  "that",
  "the",
  "then",
  "there",
  "this",
  "to",
  "what",
  "when",
  "where",
  "which",
  "who",
  "why",
  "with",
]);

/** The proper nouns in one line, first word included where it earns it. */
function properNouns(sentence: string) {
  const found: string[] = [];
  const words = sentence.split(/\s+/);
  let run: string[] = [];

  const flush = () => {
    if (run.length > 0) found.push(run.join(" "));
    run = [];
  };

  for (let i = 0; i < words.length; i += 1) {
    const word = (words[i] ?? "").replace(
      /^[^\p{L}\p{N}]+|[^\p{L}\p{N}']+$/gu,
      "",
    );
    const capitalised = /^\p{Lu}/u.test(word);
    /* A run may continue through a lowercase joiner — "War of 1812", "Bill of
       Rights" — but may not start on one. */
    const joiner = run.length > 0 && /^(of|the|and|de|van|von|for)$/.test(word);
    const opens = i > 0 || !SENTENCE_STARTERS.has(word.toLowerCase());
    if ((capitalised && opens) || joiner) {
      run.push(word);
      continue;
    }
    flush();
  }
  flush();
  /* A trailing joiner is the sentence's grammar, not part of the name. */
  return found
    .map((name) => name.replace(/\s+(of|the|and|de|van|von|for)$/, ""))
    .filter((name) => name.length > 2);
}

/**
 * How badly a term needs protecting, highest first.
 *
 * The three signals are the three ways a transcriber goes wrong: it does not
 * know a name (proper nouns), it has never seen a word (long and unusual
 * ones), and it splits or joins a phrase it does not recognise as one
 * (multi-word terms).
 */
function risk(term: string) {
  let score = 0;
  if (/^\p{Lu}/u.test(term)) score += 3;
  if (term.includes(" ")) score += 2;
  if (term.includes("-")) score += 1;
  if (term.length >= 10) score += 2;
  else if (term.length >= 8) score += 1;
  return score;
}

/** Every candidate term in one string of course prose. */
function termsIn(text: string) {
  const terms = properNouns(text);
  for (const raw of text.split(/[^\p{L}\p{N}'-]+/u)) {
    const word = raw.replace(/^-+|-+$/g, "");
    /* Nine, not eight. Eight lets "settlers", "separate" and "anything"
       through, and every one of those is a slot a real term does not get. */
    if (word.length < 9 && !word.includes("-")) continue;
    if (word.length < 5) continue;
    if (NEVER_WORTH_IT.has(word.toLowerCase())) continue;
    terms.push(word);
  }
  return terms;
}

/**
 * The vocabulary for one course, most worth protecting first.
 *
 * Case is preserved but comparison is not: "Mitosis" and "mitosis" are the
 * same term to a transcriber, and keeping both would spend the budget twice on
 * one word. The first spelling seen wins, which is the course's own.
 */
export function courseVocabulary(generated: GeneratedCourse | null) {
  const sections = generated?.sections ?? [];
  const prose = [
    ...sections.map((section) => section.title),
    ...sections.flatMap((section) => section.key_points),
    ...sections.map((section) => section.technical),
    ...sections.map((section) => section.quiz),
  ].filter(
    (line): line is string => typeof line === "string" && line.length > 0,
  );

  const seen = new Map<string, string>();
  for (const line of prose) {
    for (const term of termsIn(line)) {
      const key = term.toLowerCase();
      if (!seen.has(key)) seen.set(key, term);
    }
  }

  return [...seen.values()].sort((a, b) => risk(b) - risk(a));
}

/**
 * The subjects whose vocabulary a transcriber reliably gets wrong, and the
 * words it gets wrong in them.
 *
 * These are not glossaries and are not shown to anybody. They are a decoding
 * bias of last resort: terms that are homophones of ordinary English, or rare
 * enough that a general model has barely seen them written. "Stare decisis"
 * comes back as "starry decisis"; "enantiomer" as "an antiomer"; "Bacon's
 * Rebellion" as "bacons rebellion".
 *
 * Deliberately short, and deliberately last. A prompt term the speaker never
 * says is not free — it biases the decode, so a long list of plausible words
 * can put words in somebody's mouth. The course's own vocabulary always goes
 * first and these only ever fill what is left, which on a generated course is
 * usually nothing.
 */
const SUBJECT_TERMS: Record<string, { match: RegExp; terms: string[] }> = {
  history: {
    match:
      /\b(apush|u\.?s\.? history|american history|history|reconstruction|civil war|colonial)\b/i,
    terms: [
      "Bacon's Rebellion",
      "Mercantilism",
      "Headright",
      "Encomienda",
      "Antebellum",
      "Nullification",
      "Manifest Destiny",
      "Reconstruction",
      "Sharecropping",
      "Suffrage",
      "Progressivism",
      "Isolationism",
      "Détente",
      "Gerrymander",
    ],
  },
  organic: {
    match: /\b(organic chemistry|orgo|ochem|o-?chem|stereochem)\b/i,
    terms: [
      "Enantiomer",
      "Diastereomer",
      "Nucleophile",
      "Electrophile",
      "Carbocation",
      "Stereocenter",
      "Chirality",
      "Racemic",
      "Tautomer",
      "Alkene",
      "Alkyne",
      "Aldehyde",
      "Ketone",
      "Ester",
      "Amide",
      "Resonance",
      "Regiochemistry",
    ],
  },
  law: {
    match:
      /\b(law|legal|torts?|contracts?|constitutional|criminal procedure)\b/i,
    terms: [
      "Stare decisis",
      "Mens rea",
      "Actus reus",
      "Res ipsa loquitur",
      "Habeas corpus",
      "Certiorari",
      "Voir dire",
      "Estoppel",
      "Laches",
      "Tortfeasor",
      "Consideration",
      "Prima facie",
      "Obiter dicta",
      "Dicta",
      "Injunction",
    ],
  },
  biology: {
    match: /\b(bio|biology|cell|genetics?|mitosis|meiosis|anatomy)\b/i,
    terms: [
      "Mitosis",
      "Meiosis",
      "Chromatid",
      "Centromere",
      "Cytokinesis",
      "Prophase",
      "Metaphase",
      "Anaphase",
      "Telophase",
      "Homologous",
      "Allele",
      "Genotype",
      "Phenotype",
      "Ribosome",
      "Mitochondria",
    ],
  },
};

/** The subject dictionary a topic asks for, if any. */
export function subjectVocabulary(topic: string) {
  for (const subject of Object.values(SUBJECT_TERMS)) {
    if (subject.match.test(topic)) return subject.terms;
  }
  return [];
}

/**
 * Everything the transcriber should expect, in the order it should be spent.
 *
 * The course's own words first, because those are the words this student is
 * about to be graded against; the subject's afterwards, to fill what is left
 * on a topic that has not been generated yet or that produced few terms.
 */
export function transcriptionVocabulary(
  topic: string,
  generated: GeneratedCourse | null,
) {
  return [...courseVocabulary(generated), ...subjectVocabulary(topic)];
}
