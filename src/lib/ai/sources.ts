import "server-only";

/** Hard ceiling on how much source text we hand a model in one request. */
const MAX_SOURCE_CHARS = 120_000;

export type SourceRow = { filename: string; content: string };

/**
 * Renders the uploaded sources into the prompt.
 *
 * When a course has no sources the model is told so explicitly and instructed
 * to refuse — silently falling back to general knowledge is exactly the
 * failure mode source-grounding exists to prevent.
 */
export function renderSources(sources: SourceRow[]): string {
  if (sources.length === 0) {
    return `SOURCES: none provided.

Because there are no sources, you must NOT generate content from general
knowledge. Return the JSON shape requested, but with empty "sections" and a
"summary" explaining that sources are required first.`;
  }

  let budget = MAX_SOURCE_CHARS;
  const blocks: string[] = [];

  for (const source of sources) {
    if (budget <= 0) break;
    const body = source.content.slice(0, budget);
    budget -= body.length;
    blocks.push(
      `<source filename="${escapeAttr(source.filename)}">\n${body}\n</source>`,
    );
  }

  const truncated = sources.length > blocks.length;

  return `SOURCES (${blocks.length} document${blocks.length === 1 ? "" : "s"}):

${blocks.join("\n\n")}
${truncated ? "\n[Some sources were omitted for length.]" : ""}`;
}

function escapeAttr(value: string) {
  return value.replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/**
 * Pulls plain text out of an upload.
 *
 * Deliberately limited to formats we can extract *reliably* without a parsing
 * dependency. A PDF or DOCX read as raw bytes yields binary noise, and
 * feeding that to a grounded model is worse than refusing the file — it
 * produces confident nonsense sourced from garbage.
 */
export async function extractText(
  file: File,
): Promise<{ ok: true; text: string } | { ok: false; reason: string }> {
  const name = file.name.toLowerCase();
  const isPlain =
    file.type.startsWith("text/") ||
    /\.(txt|md|markdown|csv|tsv|json|rtf|tex|html?|xml)$/.test(name);

  if (!isPlain) {
    return {
      ok: false,
      reason:
        "Only text files work right now (.txt, .md, .csv, .html). PDF, Word and slide decks need a parser that isn't wired up yet.",
    };
  }

  const text = (await file.text()).trim();
  if (!text) return { ok: false, reason: "That file is empty." };

  return { ok: true, text };
}
