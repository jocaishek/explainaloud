/**
 * Browser recording format helpers.
 *
 * Shared by the session recorder and the onboarding warm-up so both hand the
 * transcription API a filename whose extension matches the container the
 * browser actually produced — Groq rejects a mismatch, and Safari does not
 * produce WebM.
 */

/** File extension matching a MediaRecorder mime type. */
export function audioExtension(type: string) {
  if (type.includes("mp4")) return "m4a";
  if (type.includes("ogg")) return "ogg";
  if (type.includes("wav")) return "wav";
  return "webm";
}

/**
 * Opus in WebM where available, otherwise whatever the browser defaults to.
 *
 * Returns undefined rather than a fallback string on purpose: passing an
 * unsupported mime type to the MediaRecorder constructor throws, while passing
 * no options at all lets the browser pick something it can definitely encode.
 */
export function preferredRecorderMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
    ? "audio/webm;codecs=opus"
    : undefined;
}
