/**
 * Upload constants shared by the client picker and the server parser.
 *
 * Kept out of `lib/ai/sources.ts` because that module is `server-only` — the
 * parsers pull in Node built-ins, and importing it from a client component
 * would fail the build.
 */

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
export const MAX_SOURCES_PER_COURSE = 10;
