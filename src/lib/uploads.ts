/**
 * Upload constants shared by the client picker and the server parser.
 *
 * Kept out of `lib/ai/sources.ts` because that module is `server-only` — the
 * parsers pull in Node built-ins, and importing it from a client component
 * would fail the build.
 */

/**
 * How much of the pasted notes reaches the course builder.
 *
 * Here rather than beside the source budget in `lib/ai/sources.ts` for the
 * reason this file exists at all: that module is `server-only`, and the form
 * needs this number to tell somebody their notes are longer than one request
 * can carry. Two copies of a limit drift; the trimmer imports it from here.
 *
 * Everything typed is still saved and still shown on the topic page — this
 * bounds the prompt, not the record.
 */
export const MAX_NOTES_CHARS = 8_000;

export const ACCEPTED_EXTENSIONS = [
  ".pdf",
  ".docx",
  ".txt",
  ".md",
  ".markdown",
  ".csv",
  ".tsv",
  ".html",
  ".htm",
  ".rtf",
  ".tex",
  ".json",
] as const;

export const ACCEPT_ATTRIBUTE = ACCEPTED_EXTENSIONS.join(",");

export const MAX_SOURCE_BYTES = 5 * 1024 * 1024;

/**
 * Sources one topic can hold on the free tier. Each upload is a parse plus a
 * slice of every prompt's context, so this is a cost ceiling as much as a
 * product one. Admins are exempt — see `sourceLimitFor`.
 */
export const FREE_SOURCES_PER_COURSE = 3;

export function sourceLimitFor(unlimited: boolean) {
  return unlimited ? Number.POSITIVE_INFINITY : FREE_SOURCES_PER_COURSE;
}
