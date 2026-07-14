// Shared disposable/temporary-email blocking utility.
//
// Used by both POST /api/waitlist and POST /api/auth/register so the two
// signup entry points can never drift out of sync on which providers are
// blocked. The actual domain list lives in
// server/config/disposableEmailDomains.json — add new domains there only,
// never duplicate the list in code.

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.join(__dirname, "config", "disposableEmailDomains.json");
const { domains } = JSON.parse(readFileSync(configPath, "utf-8"));

export const DISPOSABLE_EMAIL_DOMAINS = new Set(domains);

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
