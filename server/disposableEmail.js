// Shared disposable/temporary-email blocking utility.
//
// Used by both POST /api/waitlist and POST /api/auth/register so the two
// signup entry points can never drift out of sync on which providers are
// blocked. Add new domains to DISPOSABLE_EMAIL_DOMAINS only — never
// duplicate this list elsewhere.

export const DISPOSABLE_EMAIL_DOMAINS = new Set([
  "mailinator.com",
  "yopmail.com",
  "guerrillamail.com",
  "guerrillamail.info",
  "guerrillamail.biz",
  "guerrillamail.de",
  "guerrillamail.org",
  "guerrillamail.net",
  "guerrillamailblock.com",
  "sharklasers.com",
  "grr.la",
  "tempmail.com",
  "temp-mail.org",
  "tempmail.net",
  "tempmailo.com",
  "throwawaymail.com",
  "trashmail.com",
  "trashmail.net",
  "trashmail.org",
  "trash-mail.com",
  "10minutemail.com",
  "10minutemail.net",
  "20minutemail.com",
  "getnada.com",
  "maildrop.cc",
  "mailnesia.com",
  "mailcatch.com",
  "moakt.com",
  "moakt.cc",
  "dispostable.com",
  "fakeinbox.com",
  "spamgourmet.com",
  "mytemp.email",
  "emailondeck.com",
  "mohmal.com",
  "mintemail.com",
  "discard.email",
  "discardmail.com",
  "spam4.me",
  "mailpoof.com",
  "burnermail.io",
  "tempinbox.com",
  "tempr.email",
  "inboxkitten.com",
  "luxusmail.org",
  "1secmail.com",
  "1secmail.net",
  "1secmail.org",
  "harakirimail.com",
  "no-spam.ws",
  "nowmymail.com",
  "tempmailaddress.com",
  "anonbox.net",
  "einrot.com",
  "wegwerfmail.de",
  "wegwerfmail.net",
  "wegwerfmail.org",
]);

/**
 * Extracts the lowercased domain from an email address.
 * Returns null if the input isn't shaped like an email.
 */
export function extractEmailDomain(email) {
  if (typeof email !== "string") return null;
  const normalized = email.trim().toLowerCase();
  const atIndex = normalized.lastIndexOf("@");
  if (atIndex === -1 || atIndex === normalized.length - 1) return null;
  return normalized.slice(atIndex + 1);
}

/**
 * Returns true if the given email's domain is a known disposable/temporary
 * email provider. Accepts a raw (non-normalized) email string.
 */
export function isDisposableEmail(email) {
  const domain = extractEmailDomain(email);
  if (!domain) return false;
  return DISPOSABLE_EMAIL_DOMAINS.has(domain);
}

export const DISPOSABLE_EMAIL_ERROR = "Please use a permanent email address.";
