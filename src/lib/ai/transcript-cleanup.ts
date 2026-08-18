import type { TranscribedWord } from "~/lib/speech-metrics";

/**
 * Removing what Whisper says when it cannot hear anything.
 *
 * Whisper was trained on a very large quantity of YouTube captions, and when
 * it is handed audio with no speech in it — a pause, a room, a breath, the
 * gap between two sentences — it does not return nothing. It returns the most
 * probable caption for silence in its training data, which is "Thank you for
 * watching!", "Please subscribe", "Subtitles by the Amara.org community", and
 * a short list of siblings. It then conditions on its own output and says it
 * again, and again, until the audio runs out.
 *
 * This is not hypothetical. A real session came back as five real sentences
 * about acids and bases followed by nineteen consecutive "Thank you for
 * watching!"s, and because the grader had no way to know those were not said,
 * it marked them red: the report told somebody they had failed to explain a
 * topic largely by quoting words they had never spoken. The pace figure was
 * computed over them too.
 *
 * The provider already rejects a transcript that is *entirely* an artefact.
 * That check cannot help here, because the hallucination arrives interleaved
 * with real speech — so the filtering has to happen sentence by sentence, and
 * the word timings have to be filtered with it or the metrics stay wrong.
 *
 * Two rules, both deliberately narrow. Whatever survives is treated as
 * something the person actually said, and wrongly deleting a real sentence is
 * a worse failure than leaving one artefact in.
 */

/**
 * Caption boilerplate, matched whole.
 *
 * Every entry has to match a complete sentence after normalisation, never a
 * substring: "thank you" inside "thank you, that makes sense" is a real thing
 * a person says while thinking out loud, and somebody explaining the YouTube
 * recommendation algorithm may legitimately produce the phrase "please
 * subscribe". Anchoring to the whole sentence is what keeps this from eating
 * real speech.
 */
const CAPTION_ARTEFACTS = new Set([
  "thank you",
  "thanks",
  "thank you for watching",
  "thanks for watching",
  "thank you for watching this video",
  "thank you very much",
  "thank you so much",
  "please subscribe",
  "please subscribe to my channel",
  "like and subscribe",
  "dont forget to subscribe",
  "see you next time",
  "see you in the next video",
  "bye",
  "bye bye",
  "you",
  "music",
  "applause",
  "outro music",
  "subtitles by the amaraorg community",
  "subtitles by the amara org community",
  "subtitles by amaraorg",
  "transcription by castingwords",
  "transcribed by esoorg",
  "copyright",
  "the end",
]);

/**
 * How many times a sentence has to repeat back to back before it is a loop.
 *
 * Three, not two. Somebody explaining something out loud genuinely does say
 * the same short sentence twice — restarting a thought, or repeating a term
 * to be sure it was heard. Nobody says it three times in a row.
 */
const LOOP_THRESHOLD = 3;

/**
 * Length, in words, at which repeating a clause verbatim stops being speech.
 *
 * The run rule above only sees repetition it can count, and it counts
 * sentences — so it is blind to the shape a loop actually takes most of the
 * time, which is comma-spliced and non-adjacent:
 *
 *   "Claude Code is a tool that can be used to create code, Claude Code can be
 *    used to create code, The language needs to be set up, The language needs
 *    to be set up, Claude Codes are used to create code, Claude Codes are used
 *    to create code, Claude Code is a tool that can be used to create code,
 *    Claude Code can be used to create code,"
 *
 * That is one sentence by the old split — there is no full stop anywhere in
 * it — so nothing repeated and nothing was removed. It came from a recording
 * of somebody singing. They did not say a word of it.
 *
 * Six words is the line because of how people actually repeat themselves. We
 * restate an idea and paraphrase it while doing so; reproducing six words in
 * the same order twice is a decoder conditioning on its own output. Below six
 * the run rule still applies, so "no, no, no" needs three before it counts.
 *
 * The first occurrence always survives. If the repetition was real, what they
 * said is still there once.
 */
const ECHO_WORDS = 6;

/**
 * Window, in words, for the phrase rule below.
 *
 * Eight rather than the clause rule's six, because this one works without
 * clause boundaries and so has more chances to fire. Eight words reproduced in
 * the same order, having already been said once, is not a person restating an
 * idea — a person paraphrases when they restate. It is a decoder conditioning
 * on its own output.
 */
const PHRASE_WINDOW = 8;

/** Lowercased, stripped of punctuation and collapsed whitespace. */
function normalize(sentence: string) {
  return sentence
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Split into clauses, keeping the punctuation with the clause it closes.
 *
 * Commas as well as full stops. This used to split on `[.!?]` only, on the
 * reasoning that hallucinations arrive punctuated — "Thank you for watching!"
 * comes with its exclamation mark — which is true of that particular artefact
 * and false of the more common one. A decoding loop over unintelligible audio
 * comes back comma-spliced, one long run-on with no sentence end in it at all,
 * and a splitter looking for full stops sees a single sentence that repeats
 * nothing.
 *
 * A clause is the right unit anyway: it is what the loop repeats.
 */
function splitClauses(transcript: string): string[] {
  return transcript
    .split(/(?<=[.!?,])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

/** Words in an already-normalised clause. */
function wordCount(normalised: string) {
  return normalised ? normalised.split(" ").length : 0;
}

/**
 * Collapse repeated phrases, ignoring where the clauses fall.
 *
 * The clause rules above compare whole clauses, so they catch a loop that
 * repeats in tidy units and miss the one that does not. This is the shape they
 * miss, and it is the common one:
 *
 *   "…and to understand Analytical reading is a form of reading that helps
 *    readers understand the meaning of the Analytical reading is a way to
 *    understand the context of a particular text, and to understand Analytical
 *    reading is a way to understand the context of a particular text…"
 *
 * Every clause there is a unique string — each one starts at a different point
 * in the loop — so nothing matches anything and all of it survives. What is
 * plainly repeating is the *phrase*, across the clause boundaries, and the
 * splices are where one transcription window was glued to the next.
 *
 * So: walk the words, and whenever the last `PHRASE_WINDOW` of them have been
 * seen in that order before, drop words until they have not. The first
 * occurrence stays, and so does whatever new material follows the loop, which
 * is the property that matters — a recording that goes round three times and
 * then says something new keeps the something new.
 *
 * Timings are deliberately not handled here. Rewriting text without rewriting
 * Whisper's word array in step would put the pace figure over words nobody
 * said, so `stripHallucinations` only reaches for this when it has no timings
 * to keep aligned.
 */
function phrasesIn(normalised: string): string[] {
  const words = normalised ? normalised.split(" ") : [];
  if (words.length < PHRASE_WINDOW) return [];
  const phrases: string[] = [];
  for (let i = 0; i + PHRASE_WINDOW <= words.length; i++) {
    phrases.push(words.slice(i, i + PHRASE_WINDOW).join(" "));
  }
  return phrases;
}

/**
 * Whole clauses only, and that is the entire design.
 *
 * The first version of this walked word by word and dropped any word that
 * completed an already-seen phrase. It removed more of the loop and it was
 * wrong twice over: it left ungrammatical debris — "the context of a particular
 * and to understand" — which the report then quotes back as something the
 * student said, and it deleted a word out of the middle of an honest sentence
 * that happened to restate itself. Both are worse than leaving a loop in.
 *
 * So the unit stays the clause. A clause goes only if it repeats a phrase of
 * `PHRASE_WINDOW` words already said, in order, which no amount of ordinary
 * restatement produces — and when it goes, it goes whole, so what remains is
 * always something somebody actually uttered.
 */

export type CleanedTranscript = {
  transcript: string;
  words: TranscribedWord[];
  /** How many sentences were dropped. Zero on almost every recording. */
  removed: number;
};

/**
 * The same rules, applied at the seam between two transcription windows.
 *
 * `stripHallucinations` cleans one transcript. Live captioning does not produce
 * one transcript — it transcribes four seconds at a time and appends, so every
 * window is cleaned on its own and the assembled result is never checked at
 * all. A decoder that loops does not repeat itself inside a four-second window;
 * it says the same clause once per window, for a minute, and each of those
 * windows is individually spotless:
 *
 *   "Analytical reading is a way to understand the context of a particular
 *    text, and to understand the context of a particular text. Analytical
 *    reading is a way to understand the context of a particular text, and to
 *    understand Analytical reading is a form of reading that helps readers
 *    understand the meaning of the Analytical reading is a way to…"
 *
 * That is a real recording. The mid-sentence splices are the window joins.
 *
 * **Why this drops the addition rather than rewriting the transcript.** Live
 * grading holds a cursor into the text it has already coloured; anything that
 * rewrites earlier words invalidates every span on screen and forces a full
 * re-grade. Refusing to append a clause that has already been said costs
 * nothing and keeps that cursor valid.
 *
 * Returns what survives of `addition` — the empty string when all of it was an
 * echo, which is the correct result and means "this window added nothing".
 */
export function dropEchoedClauses(existing: string, addition: string): string {
  const clauses = splitClauses(addition);
  if (clauses.length === 0) return addition.trim();

  const previousClauses = splitClauses(existing).map(normalize);
  const seen = new Set(
    previousClauses.filter((clause) => wordCount(clause) >= ECHO_WORDS),
  );
  // The same phrase index the whole-transcript pass keeps, seeded from what has
  // already been said. This is what catches the spliced clause — unique as a
  // string, built entirely out of a phrase from the window before it.
  const seenPhrases = new Set(previousClauses.flatMap(phrasesIn));

  const kept: string[] = [];
  let run = 0;
  let previous = "";

  for (const clause of clauses) {
    const normalised = normalize(clause);
    if (!normalised) continue;

    // A clause long enough to be a fingerprint, already said: skip it.
    if (wordCount(normalised) >= ECHO_WORDS && seen.has(normalised)) continue;

    const phrases = phrasesIn(normalised);
    if (phrases.some((candidate) => seenPhrases.has(candidate))) continue;
    for (const candidate of phrases) seenPhrases.add(candidate);

    // Short clauses have no fingerprint, so they fall back to the run rule —
    // "no, no, no" needs three in a row before it counts as a loop.
    run = normalised === previous ? run + 1 : 0;
    previous = normalised;
    if (run >= LOOP_THRESHOLD - 1) continue;

    if (wordCount(normalised) >= ECHO_WORDS) seen.add(normalised);
    if (!CAPTION_ARTEFACTS.has(normalised)) kept.push(clause);
  }

  return kept.join(" ").trim();
}

/**
 * Strip caption artefacts and decoding loops from a transcript and its timings.
 *
 * The words are filtered by consuming them in step with the sentences, rather
 * than by matching text against the word list: Whisper's word array is the
 * same sequence of tokens as the transcript, so walking both together keeps
 * the timings aligned even when a sentence contains a word that also appears
 * in a kept sentence.
 */
export function stripHallucinations(
  transcript: string,
  words: TranscribedWord[],
): CleanedTranscript {
  const sentences = splitClauses(transcript);
  if (sentences.length === 0) return { transcript, words, removed: 0 };

  const normalized = sentences.map(normalize);
  const looping = new Array<boolean>(sentences.length).fill(false);

  /* Runs of three or more identical clauses. The whole run goes, including the
     first: a loop that begins by echoing something real is still a loop, and
     the real instance is somewhere in the speech before it. */
  for (let i = 0; i < sentences.length; ) {
    let j = i;
    while (j + 1 < sentences.length && normalized[j + 1] === normalized[i]) j++;
    if (j - i + 1 >= LOOP_THRESHOLD && normalized[i]) {
      for (let k = i; k <= j; k++) looping[k] = true;
    }
    i = j + 1;
  }

  /* Verbatim echoes of a long clause, adjacent or not. Separate from the run
     rule because a loop rarely repeats back to back — it wanders through two
     or three phrases and comes round again, which no count of consecutive
     matches will ever see. The first occurrence is kept; only later copies of
     something already said go. */
  const seen = new Set<string>();
  /* And clauses that are not repeats themselves but are built out of one.
     A loop spliced at a transcription-window boundary produces clauses that
     are each unique as strings — every one starts at a different point in the
     cycle — while plainly saying the same thing. Matching on a phrase inside
     them is what sees that; see `phrasesIn`. */
  const seenPhrases = new Set<string>();
  for (const [i, phrase] of normalized.entries()) {
    if (looping[i]) continue;
    const clause = phrase as string;

    if (wordCount(clause) >= ECHO_WORDS) {
      if (seen.has(clause)) {
        looping[i] = true;
        continue;
      }
      seen.add(clause);
    }

    const phrases = phrasesIn(clause);
    if (phrases.some((candidate) => seenPhrases.has(candidate))) {
      looping[i] = true;
      continue;
    }
    for (const candidate of phrases) seenPhrases.add(candidate);
  }

  const keptSentences: string[] = [];
  const keptWords: TranscribedWord[] = [];
  let cursor = 0;
  let removed = 0;

  for (const [i, sentence] of sentences.entries()) {
    // Word timings are per token, and Whisper's tokens are whitespace-ish, so
    // the count of whitespace-separated chunks is the number of entries this
    // sentence occupies in the word array.
    const span = sentence.split(/\s+/).filter(Boolean).length;
    const slice = words.slice(cursor, cursor + span);
    cursor += span;

    const drop = looping[i] || CAPTION_ARTEFACTS.has(normalized[i] as string);
    if (drop) {
      removed++;
      continue;
    }

    keptSentences.push(sentence);
    keptWords.push(...slice);
  }

  // Anything past the last sentence boundary — Whisper occasionally emits a
  // trailing token the split does not see — rides along with the transcript
  // rather than being silently dropped.
  if (cursor < words.length && keptSentences.length > 0) {
    keptWords.push(...words.slice(cursor));
  }

  if (removed === 0) return { transcript, words, removed: 0 };

  return {
    transcript: keptSentences.join(" "),
    // If the timings did not line up with the sentences for any reason, keep
    // the originals rather than handing the metrics a mangled sequence. The
    // transcript is the payload; the timings are an enhancement.
    words: words.length > 0 && keptWords.length === 0 ? words : keptWords,
    removed,
  };
}
