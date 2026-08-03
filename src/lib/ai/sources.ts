import "server-only";

export { ACCEPT_ATTRIBUTE, ACCEPTED_EXTENSIONS } from "~/lib/uploads";

import { MAX_NOTES_CHARS } from "~/lib/uploads";

/** Hard ceiling on how much source text we hand a model in one request. */
const MAX_SOURCE_CHARS = 8_000;

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
export function renderSources(sources: SourceRow[]): string {
  if (sources.length === 0) {
    // Sources are optional. The prompt already swapped in the open-knowledge
    // rule, so this just states the situation rather than forcing a refusal.
    return `SOURCES: none provided. Teach from established knowledge, and be
explicit in "uncovered" about anything you are not confident in.`;
  }

  let budget = MAX_SOURCE_CHARS;
  const blocks: string[] = [];
  let truncated = false;

  for (const source of sources) {
    if (budget <= 0) {
      truncated = true;
      break;
    }
    const body = source.content.slice(0, budget);
    if (body.length < source.content.length) truncated = true;
    budget -= body.length;
    const urlAttribute = source.url ? ` url="${escapeAttr(source.url)}"` : "";
    blocks.push(
      `<source filename="${escapeAttr(source.filename)}"${urlAttribute}>\n${body}\n</source>`,
    );
  }

  return `SOURCES (${blocks.length} document${blocks.length === 1 ? "" : "s"}):

${blocks.join("\n\n")}
${truncated ? "\n[Some sources were omitted for length.]" : ""}`;
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
