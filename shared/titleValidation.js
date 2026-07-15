// Shared listing-title validation, used by both the Express API
// (server/routes/listings.js) and the React form (src/pages/Sell.jsx).
// Keeping this logic in one place guarantees the frontend and backend
// always agree on what counts as a valid title.

export const TITLE_MIN_LENGTH = 5;
export const TITLE_MAX_LENGTH = 100;

// Single friendly message surfaced for every rejection reason below —
// callers don't need to know *why* a title was rejected, just what to do.
export const LISTING_TITLE_ERROR = "Please enter a descriptive title for your listing.";

// Obvious placeholder / test titles people type while filling out the form.
// Matched against the title with all non-alphanumeric characters stripped,
// so "Test!!!", "test 123", and "TEST" are all caught alike.
const PLACEHOLDER_WORDS = [
  "test", "testing", "tests", "testtitle", "asdf", "asdfasdf", "asdfg",
  "qwerty", "qwertyuiop", "aaaa", "aaaaa", "bbbb", "sample", "samples",
  "foo", "bar", "foobar", "xxxx", "xxxxx", "lorem", "loremipsum", "ipsum",
  "abc", "abcd", "abcde", "abcdef", "hello", "hi", "hey", "placeholder",
  "title", "untitled", "notitle", "item", "product", "listing", "none",
  "na", "nan", "temp", "temporary", "example", "demo", "new", "123", "1234",
  "12345", "123456",
];

/**
 * Counts Unicode letters (covers Latin, Georgian, and any other alphabet)
 * so multi-script titles ("ბალონი Costume") are handled correctly.
 */
function countLetters(str) {
  const matches = str.match(/\p{L}/gu);
  return matches ? matches.length : 0;
}

/**
 * Flags 5+ identical non-whitespace characters in a row, e.g.
 * "aaaaaaaaaa" or "!!!!!!!!!!".
 */
function hasExcessiveRepetition(str) {
  return /(\S)\1{4,}/u.test(str);
}

/**
 * Flags titles that are just a placeholder word (optionally repeated),
 * once punctuation/whitespace/case are normalized away.
 */
function isPlaceholder(str) {
  const normalized = str.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
  if (!normalized) return true;
  if (PLACEHOLDER_WORDS.includes(normalized)) return true;
  return PLACEHOLDER_WORDS.some((word) => {
    if (word.length < 2) return false;
    return new RegExp(`^(${word})+$`).test(normalized);
  });
}

/**
 * Validates a listing title.
 * Returns `null` when the title is valid, or the friendly error message
 * when it should be rejected.
 */
export function validateListingTitle(rawTitle) {
  const title = typeof rawTitle === "string" ? rawTitle.trim() : "";

  if (title.length < TITLE_MIN_LENGTH || title.length > TITLE_MAX_LENGTH) {
    return LISTING_TITLE_ERROR;
  }
  // Also implicitly rejects titles made only of numbers/punctuation,
  // since those contain zero letters.
  if (countLetters(title) < 2) {
    return LISTING_TITLE_ERROR;
  }
  if (hasExcessiveRepetition(title)) {
    return LISTING_TITLE_ERROR;
  }
  if (isPlaceholder(title)) {
    return LISTING_TITLE_ERROR;
  }
  return null;
}
