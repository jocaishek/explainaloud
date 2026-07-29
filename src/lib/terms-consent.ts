import { TERMS_EFFECTIVE_DATE } from "~/lib/legal";

/**
 * Carrying a Google signup's acceptance across the OAuth redirect.
 *
 * The email path can stamp acceptance directly, because `signUp` takes user
 * metadata in the same call. `signInWithOAuth` takes none, and the browser
 * leaves for Google's consent screen before the app has an account to write
 * to — so the tick has to be parked somewhere and applied on arrival.
 *
 * `sessionStorage`, not `localStorage`: this should die with the tab that did
 * the accepting, and must never be read by some unrelated later visit.
 */
const PENDING_TERMS_KEY = "explainaloud:pending-terms-consent";

export type TermsConsent = {
  terms_accepted_at: string;
  terms_version: string;
};

/** The consent record for someone accepting right now. */
export function newConsent(): TermsConsent {
  return {
    terms_accepted_at: new Date().toISOString(),
    terms_version: TERMS_EFFECTIVE_DATE,
  };
}

export function stashPendingConsent(consent: TermsConsent) {
  try {
    window.sessionStorage.setItem(PENDING_TERMS_KEY, JSON.stringify(consent));
  } catch {
    // Private browsing modes can refuse storage. The checkbox still gated the
    // button, so losing the receipt is not worth blocking the signup over.
  }
}

/**
 * Read and clear the parked consent. Returns null when there is nothing
 * pending, which is the normal case for every visit that is not the moment
 * right after a Google signup.
 */
export function takePendingConsent(): TermsConsent | null {
  let raw: string | null = null;
  try {
    raw = window.sessionStorage.getItem(PENDING_TERMS_KEY);
    if (raw) window.sessionStorage.removeItem(PENDING_TERMS_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof (parsed as TermsConsent).terms_accepted_at === "string" &&
      typeof (parsed as TermsConsent).terms_version === "string"
    ) {
      return parsed as TermsConsent;
    }
  } catch {
    // Corrupt value; already cleared above.
  }
  return null;
}
