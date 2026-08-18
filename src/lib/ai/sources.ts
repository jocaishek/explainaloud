import "server-only";

export { ACCEPT_ATTRIBUTE, ACCEPTED_EXTENSIONS } from "~/lib/uploads";

import { MAX_NOTES_CHARS } from "~/lib/uploads";

/**
 * How much source text one request may carry, across every file.
 *
 * **Was 8,000 characters, and that is why a textbook chapter produced no
 * course.** A forty-page chapter runs to about 150,000 characters, so the
 * model was shown roughly four per cent of it — and the first four per cent of
 * a textbook chapter is the title page, an epigraph, a photograph caption and
 * a timeline. Asked to build a course from that in sources-only mode, every
 * provider correctly answered that the files barely addressed the topic, which
 * arrived as an empty course and, before it was understood, as "this service
 * can't be used at the moment".
 *
 * The old number was sized for the provider that used to be tried first: Groq
 * bills a free tier 8,000 tokens a minute, and a prompt larger than the whole
 * minute's budget fails 413 on every retry. Gemini leads every call now, at a
 * million-token window, and the Gateway rung behind it holds 262K — so the
 * budget belongs to the *first* provider, and the one that cannot hold a long
 * prompt is the one the chain already knows how to fall past.
 *
 * 160,000 characters is around 40,000 tokens: a whole chapter with room beside
 * it, four per cent of Gemini's window, and still small enough that a course
 * build is one request rather than a retrieval problem. If sources routinely
 * exceed this, the answer is selecting the relevant passages rather than
 * raising the number again.
 */
const MAX_SOURCE_CHARS = 160_000;

/**
 * Two budgets, because two jobs.
 *
 * Building a course reads the documents once and has to see all of them.
 * Grading reads them again on every pass — including the live one, which runs
 * about once a second while somebody is still speaking — and does not need the
 * chapter: it is checking claims against key points that are already in the
 * prompt, with the sources there to catch a contradiction. Handing the whole
 * chapter to that call would put forty thousand tokens on a 1.2-second clock,
 * which is a rate limit and a latency problem rather than a better grade.
 */
export const SOURCE_BUDGET = {
  /** One request, whole documents. */
  course: MAX_SOURCE_CHARS,
  /** Every grading pass, live and final. Deliberately the old ceiling. */
  grading: 8_000,
} as const;

/**
 * The prompt budget for pasted notes.
 *
 * Uploads have been budgeted since they existed; the notes box was not, and
 * it is the easier of the two to overfill — pasting is one keystroke. A
 * student pasted about ten thousand words of revision notes and the request
 * came to 21,479 tokens, against a provider limit of 12,000 per minute. That
 * request could not succeed at any time, on any retry, because one request
 * was larger than the entire per-minute budget; it failed 413, not 429.
 *
 * Note this is a *prompt* budget, not a storage one. The full text is still
 * written to `input_notes` and still shown on the topic page — nothing the
 * student wrote is thrown away. Only what travels to the model is bounded,
 * because that is the only place the length actually costs anything.
 */

/**
 * Trims pasted notes to the prompt budget, saying so when it cuts.
 *
 * Cut at a paragraph or sentence boundary where one is near the limit rather
 * than mid-word: the model reads this as evidence, and a sentence severed
 * halfway is a sentence it may complete with a guess.
 *
 * The marker is not decoration. Without it the model sees a document that
 * simply stops and has no way to know it is working from part of one, which
 * is exactly the condition under which it fills the gap from its own
 * knowledge — the thing sources-only mode exists to prevent.
 */
export function renderNotes(notes: string | null): string | null {
  const text = notes?.trim();
  if (!text) return null;
  if (text.length <= MAX_NOTES_CHARS) return text;

  const head = text.slice(0, MAX_NOTES_CHARS);
  const breakAt = Math.max(head.lastIndexOf("\n\n"), head.lastIndexOf(". "));
  // Only honour a boundary in the last fifth, so a document with no paragraph
  // breaks near the cut does not lose most of its budget to the search.
  const cut = breakAt > MAX_NOTES_CHARS * 0.8 ? breakAt + 1 : MAX_NOTES_CHARS;

  return `${text.slice(0, cut).trim()}

[These notes were longer than fits in one request and were cut here. Teach
only what is above; do not guess at what came after it.]`;
}

export type SourceRow = {
  filename: string;
  content: string;
  /** Present for web-researched evidence; uploads intentionally omit it. */
  url?: string;
};

/**
 * Renders the uploaded sources into the prompt.
 *
 * When a course has no sources the model is told so explicitly and instructed
 * to refuse — silently falling back to general knowledge is exactly the
 * failure mode source-grounding exists to prevent.
 */
export function renderSources(
  sources: SourceRow[],
  /** Which of `SOURCE_BUDGET` this call gets. Grading's, unless said. */
  limit: number = SOURCE_BUDGET.grading,
): string {
  if (sources.length === 0) {
    // Sources are optional. The prompt already swapped in the open-knowledge
    // rule, so this just states the situation rather than forcing a refusal.
    return `SOURCES: none provided. Teach from established knowledge, and be
explicit in "uncovered" about anything you are not confident in.`;
  }

  /* A share each, then whatever the short ones did not use.
   *
   * The budget used to be spent first-come: one long file could consume all of
   * it and every file after it was dropped whole, with a single line at the
   * end saying "some sources were omitted". Upload a chapter and a slide deck
   * and the deck was simply not in the course — and nothing said which one had
   * gone.
   *
   * Two passes. Every source is guaranteed an equal share; anything shorter
   * than its share hands the remainder back, and the long ones split what is
   * left in proportion to how much they still want. A single source therefore
   * still gets the whole budget, which is the common case. */
  const share = Math.floor(limit / sources.length);
  const spare = sources.reduce(
    (total, source) => total + Math.max(0, share - source.content.length),
    0,
  );
  const overflow = sources.reduce(
    (total, source) => total + Math.max(0, source.content.length - share),
    0,
  );

  const blocks: string[] = [];
  const trimmed: string[] = [];

  for (const source of sources) {
    const wanted = Math.max(0, source.content.length - share);
    const allowance =
      overflow > 0 ? share + Math.floor((spare * wanted) / overflow) : limit;
    const body = trimAtBoundary(source.content, allowance);
    if (body.length < source.content.length) trimmed.push(source.filename);

    const urlAttribute = source.url ? ` url="${escapeAttr(source.url)}"` : "";
    blocks.push(
      `<source filename="${escapeAttr(source.filename)}"${urlAttribute}>\n${body}\n</source>`,
    );
  }

  /* Named, and said inside the prompt rather than only to the reader.
   *
   * A model that cannot tell it is working from part of a document is exactly
   * the model that fills the rest in from general knowledge — the thing
   * sources-only mode exists to prevent. The same reasoning as `renderNotes`. */
  const note =
    trimmed.length > 0
      ? `\n[These were longer than one request can carry and were cut short: ${trimmed.join(", ")}. Teach only what is above; do not guess at the rest, and say in "uncovered" what you could not see.]`
      : "";

  return `SOURCES (${blocks.length} document${blocks.length === 1 ? "" : "s"}):

${blocks.join("\n\n")}
${note}`;
}

/**
 * Cut to `limit`, preferring a paragraph or sentence end near it.
 *
 * A document severed mid-word is a document a model may finish from its own
 * knowledge. Only a boundary in the last fifth counts, so a wall of text with
 * no paragraph breaks does not lose most of its allowance to the search.
 */
function trimAtBoundary(text: string, limit: number): string {
  if (text.length <= limit) return text;
  const head = text.slice(0, limit);
  const breakAt = Math.max(head.lastIndexOf("\n\n"), head.lastIndexOf(". "));
  return head.slice(0, breakAt > limit * 0.8 ? breakAt + 1 : limit).trim();
}

function escapeAttr(value: string) {
  return value.replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/**
 * Text extracted from a scanned PDF is often a handful of stray ligatures.
 * Below this, treat the file as image-only rather than handing the model a
 * fragment and letting it fill the rest in from general knowledge.
 */
const MIN_USEFUL_CHARS = 40;

/**
 * Pulls plain text out of an upload.
 *
 * PDFs go through unpdf (a serverless-safe pdf.js build) and .docx through
 * mammoth. Anything binary that yields no real text is refused outright —
 * feeding a grounded model garbage is worse than refusing the file, because
 * it produces confident nonsense with a citation attached.
 */
export async function extractText(
  file: File,
): Promise<{ ok: true; text: string } | { ok: false; reason: string }> {
  const name = file.name.toLowerCase();
  const bytes = new Uint8Array(await file.arrayBuffer());

  let text: string;

  try {
    if (name.endsWith(".pdf") || file.type === "application/pdf") {
      const { extractText: extractPdf, getDocumentProxy } = await import(
        "unpdf"
      );
      const pdf = await getDocumentProxy(bytes);
      const { text: pages } = await extractPdf(pdf, { mergePages: true });
      text = (Array.isArray(pages) ? pages.join("\n\n") : pages).trim();

      if (text.length < MIN_USEFUL_CHARS) {
        return {
          ok: false,
          reason:
            "That PDF has no selectable text. It looks like a scan or images. Export a text PDF, or paste the text in as notes.",
        };
      }
    } else if (name.endsWith(".docx")) {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({
        buffer: Buffer.from(bytes),
      });
      text = result.value.trim();
    } else if (name.endsWith(".doc")) {
      return {
        ok: false,
        reason:
          "Old .doc files aren't supported. Save it as .docx or PDF and try again.",
      };
    } else {
      const isPlain =
        file.type.startsWith("text/") ||
        /\.(txt|md|markdown|csv|tsv|json|rtf|tex|html?|xml)$/.test(name);

      if (!isPlain) {
        return {
          ok: false,
          reason:
            "Unsupported file type. Upload a PDF, Word document, or text file.",
        };
      }
      text = new TextDecoder().decode(bytes).trim();
    }
  } catch {
    return {
      ok: false,
      reason: "Couldn't read that file. It may be corrupt or password-locked.",
    };
  }

  if (text.length < MIN_USEFUL_CHARS) {
    return {
      ok: false,
      reason: "That file has almost no readable text in it.",
    };
  }

  return { ok: true, text };
}
