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
 *
 * **Was 8,000, which was sized for a provider that is no longer first.** That
 * number came from Groq's free tier billing 12,000 tokens a minute: a longer
 * prompt could not succeed there on any retry. Gemini leads every call now, on
 * a million-token window, and the chain already handles a prompt Groq cannot
 * hold by falling past it. Ten thousand words of revision notes is a normal
 * thing to paste and was being cut to about two thousand.
 */
export const MAX_NOTES_CHARS = 40_000;

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

/**
 * Kept under the hosting platform's 4.5 MB request-body cap, with room for the
 * multipart envelope. Above that cap the request never reaches the route: the
 * platform answers with its own plain-text 413, which a client parsing JSON
 * reads as "couldn't reach the server". 4 MB is the largest round number that
 * the route, not the platform, gets to refuse.
 */
export const MAX_SOURCE_BYTES = 4 * 1024 * 1024;

/** The limit as a person reads it, so no message can drift from the number. */
export const MAX_SOURCE_LABEL = `${MAX_SOURCE_BYTES / (1024 * 1024)} MB`;

/**
 * Sources one topic can hold on the free tier. Each upload is a parse plus a
 * slice of every prompt's context, so this is a cost ceiling as much as a
 * product one. Admins are exempt — see `sourceLimitFor`.
 */
export const FREE_SOURCES_PER_COURSE = 3;

export function sourceLimitFor(unlimited: boolean) {
  return unlimited ? Number.POSITIVE_INFINITY : FREE_SOURCES_PER_COURSE;
}
