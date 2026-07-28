/**
 * Sign-up email validation.
 *
 * This rejects addresses that are malformed, reserved by spec, or from
 * throwaway-inbox services. It is a real filter, not a guarantee: the only
 * way to prove an inbox exists is to send to it and have someone click the
 * link. Treat this as the first gate, not the last one.
 */

/** Disposable / throwaway inbox providers. */
const DISPOSABLE_DOMAINS = new Set([
  "0-mail.com",
  "10minutemail.com",
  "20minutemail.com",
  "33mail.com",
  "anonbox.net",
  "burnermail.io",
  "dispostable.com",
  "emailondeck.com",
  "fakeinbox.com",
  "getairmail.com",
  "getnada.com",
  "guerrillamail.com",
  "guerrillamail.info",
  "guerrillamail.net",
  "inboxbear.com",
  "mail-temp.com",
  "mail7.io",
  "mailcatch.com",
  "maildrop.cc",
  "mailinator.com",
  "mailnesia.com",
  "mintemail.com",
  "mohmal.com",
  "moakt.com",
  "mytemp.email",
  "sharklasers.com",
  "spam4.me",
  "temp-mail.io",
  "temp-mail.org",
  "tempail.com",
  "tempinbox.com",
  "tempmail.com",
  "tempmail.net",
  "tempmailo.com",
  "tempr.email",
  "throwawaymail.com",
  "trashmail.com",
  "trashmail.de",
  "yopmail.com",
  "yopmail.net",
]);

/**
 * Domains reserved by RFC 2606 / RFC 6761 for docs and testing. They resolve
 * nowhere, so mail to them always bounces.
 */
const RESERVED_DOMAINS = new Set([
  "example.com",
  "example.net",
  "example.org",
  "example.edu",
  "invalid",
  "local",
  "localhost",
  "test",
  "test.com",
]);

/**
 * TLDs that only ever appear in fake addresses. Kept deliberately short —
 * guessing at "weird-looking" TLDs blocks real people, since there are well
 * over a thousand legitimate ones.
 */
const RESERVED_TLDS = new Set([
  "example",
  "invalid",
  "internal",
  "local",
  "localdomain",
  "localhost",
  "test",
]);

/**
 * Deliberately stricter than the RFC: no quoted local parts, no address
 * literals, no consecutive/leading/trailing dots. Every address a real
 * provider will issue still passes.
 */
const EMAIL_PATTERN =
  /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$/i;

export type EmailCheck = { ok: true } | { ok: false; reason: string };

export function checkEmail(rawEmail: string): EmailCheck {
  const email = rawEmail.trim().toLowerCase();

  if (!email) {
    return { ok: false, reason: "Enter your email address." };
  }

  // 254 is the maximum length of a deliverable address path (RFC 5321).
  if (email.length > 254) {
    return { ok: false, reason: "That email address is too long." };
  }

  if (!EMAIL_PATTERN.test(email)) {
    return {
      ok: false,
      reason: "That doesn't look like a valid email address.",
    };
  }

  const domain = email.slice(email.lastIndexOf("@") + 1);
  const tld = domain.slice(domain.lastIndexOf(".") + 1);

  if (RESERVED_DOMAINS.has(domain) || RESERVED_TLDS.has(tld)) {
    return {
      ok: false,
      reason: "That domain can't receive mail. Use a real email address.",
    };
  }

  if (DISPOSABLE_DOMAINS.has(domain)) {
    return {
      ok: false,
      reason: "Temporary inboxes aren't supported. Use a permanent address.",
    };
  }

  // A label longer than 63 characters can never resolve (RFC 1035).
  if (domain.split(".").some((label) => label.length > 63)) {
    return {
      ok: false,
      reason: "That doesn't look like a valid email address.",
    };
  }

  return { ok: true };
}

/** Convenience wrapper: the error string, or null when the address passes. */
export function emailError(email: string): string | null {
  const result = checkEmail(email);
  return result.ok ? null : result.reason;
}
