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

/** Lowercased, stripped of punctuation and collapsed whitespace. */
function normalize(sentence: string) {
  return sentence
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Split on sentence ends, keeping the punctuation with the sentence it closes.
 *
 * Hallucinations are punctuated — "Thank you for watching!" arrives with its
 * exclamation mark — so sentence boundaries are reliable here in a way they
 * would not be for, say, dictated prose.
 */
function splitSentences(transcript: string): string[] {
  return transcript
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
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
  const sentences = splitSentences(transcript);
  if (sentences.length === 0) return { transcript, words, removed: 0 };

  const normalized = sentences.map(normalize);

  /* Which sentences are part of a run of three or more identical ones. The
     whole run goes, including the first: a loop that begins by echoing
     something real is still a loop, and the real instance is somewhere in the
     speech before it. */
  const looping = new Array<boolean>(sentences.length).fill(false);
  for (let i = 0; i < sentences.length; ) {
    let j = i;
    while (j + 1 < sentences.length && normalized[j + 1] === normalized[i]) j++;
    if (j - i + 1 >= LOOP_THRESHOLD && normalized[i]) {
      for (let k = i; k <= j; k++) looping[k] = true;
    }
    i = j + 1;
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
