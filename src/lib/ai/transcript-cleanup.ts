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

export type CleanedTranscript = {
  transcript: string;
  words: TranscribedWord[];
  /** How many sentences were dropped. Zero on almost every recording. */
  removed: number;
};

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
  for (const [i, phrase] of normalized.entries()) {
    if (looping[i] || wordCount(phrase as string) < ECHO_WORDS) continue;
    if (seen.has(phrase as string)) looping[i] = true;
    else seen.add(phrase as string);
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
