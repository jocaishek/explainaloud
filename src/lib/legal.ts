/**
 * Facts the Terms and the Privacy Policy both depend on.
 *
 * These live in one module rather than inline in the prose because the same
 * value appears in several clauses across two documents, and a policy that
 * contradicts itself is worse than no policy. Change the constant, not the
 * paragraphs.
 */

/**
 * Where legal, privacy, and account-deletion requests go.
 *
 * A role address rather than a person's. These documents promise a reply to
 * deletion and access requests, and a promise made to a personal inbox is one
 * that breaks the day the person is unreachable or the account is renamed —
 * both of which happen, and neither of which is a reason a data request should
 * go unanswered.
 */
export const LEGAL_CONTACT_EMAIL = "hello@explainaloud.com";

/** The trading name the documents bind. */
export const LEGAL_ENTITY_NAME = "Explainaloud";

/**
 * Minimum age to hold an account.
 *
 * 13 is the floor set by COPPA in the United States, which is what makes it
 * the operative number here: below it, an operator collecting personal
 * information from a child needs verifiable parental consent, and this service
 * has no mechanism for obtaining it. The signup checkbox asserts this, and the
 * Terms make it a condition of the account rather than a suggestion.
 */
export const MINIMUM_AGE = 13;

/**
 * Governing law. Kept as a constant because it is named in both documents and
 * is the single most likely thing to change on review by an actual lawyer.
 */
export const GOVERNING_JURISDICTION = "the State of California, United States";

/**
 * Effective dates, shown at the top of each document.
 *
 * Material changes require a new date *and* notice to existing users — see the
 * "Changes to these Terms" section. Bumping these silently defeats the point.
 */
export const TERMS_EFFECTIVE_DATE = "August 18, 2026";
export const PRIVACY_EFFECTIVE_DATE = "August 18, 2026";

/**
 * How long we keep an account's content after a deletion request. Named in the
 * Privacy Policy; also the promise the deletion flow has to actually keep.
 */
export const DELETION_GRACE_PERIOD_DAYS = 30;
