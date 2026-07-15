/**
 * cleanup-test-users.js
 * ─────────────────────────────────────────────────────────────────────────────
 * One-time admin-only script that identifies development/test accounts by
 * well-known patterns and either reports them (--dry-run) or soft-deletes them
 * (--confirm) using the same anonymisation pipeline as self-service deletion.
 *
 * Usage:
 *   npm run cleanup:test-users -- --dry-run     # list matches, touch nothing
 *   npm run cleanup:test-users -- --confirm     # actually remove them
 *
 * Safety rules
 * ─────────────────────────────────────────────────────────────────────────────
 *  • Accounts with is_admin = true or access_status = 'ADMIN' are ALWAYS
 *    skipped, even if their email looks like a test address.
 *  • Without --confirm the script always exits after printing the candidate
 *    list. It never mutates anything.
 *  • A second --confirm prompt is shown so a copy-paste accident won't fire.
 *
 * What "remove" means (mirrors the self-service deletion route in auth.js)
 * ─────────────────────────────────────────────────────────────────────────────
 *  • User row is scrubbed in-place (email, username, PII fields → sentinels,
 *    deleted_at = NOW()) — hard deletion would cascade and destroy message
 *    history for the other party in every conversation.
 *  • Listings are deactivated (status='deleted', is_active=false).
 *  • listing_images rows are deleted from the DB and the underlying files are
 *    removed from R2 (or local disk).
 *  • waitlist entries matching the original email are deleted.
 *  • An account_deletion_log row is inserted for every removed user.
 */

import "dotenv/config";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import pool from "../db.js";
import { deleteFromStorage } from "../r2.js";

// ─── TEST-ACCOUNT DETECTION ───────────────────────────────────────────────────

/**
 * Disposable / bulk-mail domains that are universally recognised as test /
 * throwaway addresses and should never appear in production.
 */
const TEST_DOMAINS = new Set([
  "example.com",
  "example.org",
  "example.net",
  "test.com",
  "test.org",
  "mailinator.com",
  "yopmail.com",
  "guerrillamail.com",
  "guerrillamail.net",
  "guerrillamail.org",
  "sharklasers.com",
  "grr.la",
  "guerrillamailblock.com",
  "spam4.me",
  "trashmail.com",
  "trashmail.me",
  "trashmail.at",
  "throwam.com",
  "fakeinbox.com",
  "dispostable.com",
  "maildrop.cc",
  "tempmail.com",
  "temp-mail.org",
  "throwaway.email",
  "getnada.com",
  "inboxkitten.com",
  "10minutemail.com",
  "10minutemail.net",
  "mohmal.com",
  "mailnull.com",
  "spamgourmet.com",
  "invalid",        // sentinel domain used by the self-deletion pipeline itself
]);

/**
 * Substrings that, when found in the LOCAL PART (before @) of an email address,
 * flag it as a test/dev/placeholder account.  All checks are case-insensitive.
 *
 * Intentionally conservative — common first names like "tester" would produce
 * false positives on a real marketplace, so we focus on patterns that are
 * essentially never legitimate buyer/seller emails.
 */
const TEST_LOCAL_PATTERNS = [
  /^test(\d+)?$/,          // test, test1, test42
  /^testuser/,             // testuser, testuser1
  /^devuser/,              // devuser, devuser_01
  /^demo(\d+)?$/,          // demo, demo2
  /^dummy(\d+)?$/,         // dummy, dummy_user
  /^fake(\d+)?$/,          // fake, fake1
  /^placeholder/,          // placeholder, placeholder_acct
  /^probe(\d+)?$/,         // probe, probe1
  /^sample(\d+)?$/,        // sample, sample_account
  /^temp(\d+)?$/,          // temp, temp2
  /^noreply/,              // noreply, no-reply
  /^no.?reply/,
  /^admin(\d+)?@/,         // guard: only if local-part IS exactly "admin[N]"
  /^bot(\d+)?$/,           // bot, bot1
  /^automated/,
  /^seed(\d+)?$/,          // seed data accounts
  /^smoketest/,
  /^e2etest/,
  /^integration.?test/,
  /^qa(\d+)?$/,            // qa, qa1
  /^staging/,
  /^localhost/,
];

/**
 * Known one-off test emails from development (extend this list as needed).
 * Case-insensitive exact match against the full email address.
 */
const KNOWN_TEST_EMAILS = new Set([
  // Add known dev/test addresses here, e.g.:
  // "dev@cosmeo.ge",
  // "tester@cosmeo.ge",
]);

/**
 * Returns true if the given email address matches any test/dev criterion.
 * Never returns true for falsy input.
 */
function isTestEmail(email) {
  if (!email || typeof email !== "string") return false;
  const lower = email.toLowerCase().trim();

  // 1) Already-anonymised sentinel emails from a prior soft-delete run
  if (lower.startsWith("deleted-") && lower.endsWith("@removed.invalid")) return true;

  // 2) Exact match against known test list
  if (KNOWN_TEST_EMAILS.has(lower)) return true;

  const atIdx = lower.indexOf("@");
  if (atIdx === -1) return false;

  const localPart = lower.slice(0, atIdx);
  const domain    = lower.slice(atIdx + 1);

  // 3) Disposable / bulk-mail domain
  if (TEST_DOMAINS.has(domain)) return true;

  // 4) Subdomain of a disposable domain (e.g. foo.mailinator.com)
  for (const d of TEST_DOMAINS) {
    if (domain.endsWith("." + d)) return true;
  }

  // 5) Suspicious local-part patterns
  for (const re of TEST_LOCAL_PATTERNS) {
    if (re.test(localPart)) return true;
  }

  return false;
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function formatTs() {
  return new Date().toISOString();
}

function log(msg) {
  process.stdout.write(`${msg}\n`);
}

function section(title) {
  const bar = "─".repeat(72);
  log(`\n${bar}\n  ${title}\n${bar}`);
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  const args     = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run");
  const isLive   = args.includes("--confirm");

  if (!isDryRun && !isLive) {
    log("Usage:");
    log("  npm run cleanup:test-users -- --dry-run   # preview matches, no changes");
    log("  npm run cleanup:test-users -- --confirm   # remove matched accounts");
    process.exit(0);
  }

  section("Cosmeo · Test-Account Cleanup Script");
  log(`Mode    : ${isDryRun ? "DRY RUN (no changes will be made)" : "LIVE — accounts will be removed"}`);
  log(`Started : ${formatTs()}`);

  // ── 1. Fetch all non-admin users ──────────────────────────────────────────
  log("\n[1/5] Fetching all non-admin user accounts from the database…");
  const { rows: allUsers } = await pool.query(`
    SELECT id, email, username, is_admin, access_status, created_at, deleted_at
    FROM   users
    WHERE  is_admin = false
      AND  access_status <> 'ADMIN'
    ORDER BY id
  `);
  log(`      ${allUsers.length} non-admin user(s) found.`);

  // ── 2. Filter to test accounts ────────────────────────────────────────────
  log("[2/5] Identifying test / dev accounts by email pattern…");
  const candidates = allUsers.filter((u) => isTestEmail(u.email));

  if (candidates.length === 0) {
    log("\n✅  No test accounts matched. Nothing to do.");
    await pool.end();
    return;
  }

  // ── 3. Print candidate list ───────────────────────────────────────────────
  section(`Matched ${candidates.length} test account(s) — review before proceeding`);
  log(
    [
      "  #  ",
      " User ID ".padEnd(10),
      " Email".padEnd(45),
      " Username".padEnd(22),
      " Created",
    ].join("│")
  );
  log("─────┼──────────┼" + "─".repeat(44) + "┼" + "─".repeat(21) + "┼─────────────────────");
  candidates.forEach((u, i) => {
    const n   = String(i + 1).padStart(3, " ");
    const id  = String(u.id).padEnd(9);
    const em  = (u.email || "").padEnd(44);
    const un  = (u.username || "").padEnd(21);
    const ts  = u.created_at ? u.created_at.toISOString().slice(0, 10) : "unknown";
    log(`  ${n}│ ${id}│ ${em}│ ${un}│ ${ts}`);
  });

  if (isDryRun) {
    section("DRY RUN complete — no data was modified");
    log(`Tip: re-run with --confirm to actually remove these ${candidates.length} account(s).`);
    await pool.end();
    return;
  }

  // ── 4. Confirmation prompt (live mode) ───────────────────────────────────
  const rl = readline.createInterface({ input, output });
  log(`\n⚠️   LIVE MODE — this will permanently remove ${candidates.length} account(s) and their data.`);
  const answer = await rl.question(
    `    Type "yes, delete all" to proceed (anything else aborts): `
  );
  rl.close();

  if (answer.trim() !== "yes, delete all") {
    log("\nAborted. No changes were made.");
    await pool.end();
    return;
  }

  // ── 5. Delete loop ────────────────────────────────────────────────────────
  section(`Removing ${candidates.length} account(s)…`);

  let totalListings = 0;
  let totalImages   = 0;
  let totalWaitlist = 0;
  const errors      = [];

  for (const user of candidates) {
    const startTs = formatTs();
    log(`\n[${startTs}]  Processing user #${user.id}  <${user.email}>`);

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // 5a. Collect listing images before we touch any rows
      const { rows: images } = await client.query(`
        SELECT li.image_url
        FROM   listing_images li
        JOIN   listings l ON l.id = li.listing_id
        WHERE  l.seller_id = $1
      `, [user.id]);

      // 5b. Collect listing ids for the log
      const { rows: listings } = await client.query(`
        SELECT id FROM listings WHERE seller_id = $1
      `, [user.id]);

      // 5c. Deactivate listings
      await client.query(`
        UPDATE listings
        SET    status    = 'deleted',
               is_active = false
        WHERE  seller_id = $1
      `, [user.id]);

      // 5d. Delete listing_images rows (storage deletion is after commit)
      const { rowCount: imgRows } = await client.query(`
        DELETE FROM listing_images
        WHERE  listing_id IN (
          SELECT id FROM listings WHERE seller_id = $1
        )
      `, [user.id]);

      // 5e. Delete waitlist entry (matched by the original email before scrub)
      const { rowCount: wlRows } = await client.query(`
        DELETE FROM waitlist WHERE email = $1
      `, [user.email]);

      // 5f. Scrub / anonymise user row (mirrors auth.js self-deletion)
      await client.query(`
        UPDATE users SET
          username      = $2,
          email         = $3,
          password_hash = NULL,
          google_id     = NULL,
          bio           = '',
          avatar_url    = NULL,
          location      = NULL,
          is_admin      = false,
          access_status = 'WAITLIST',
          deleted_at    = NOW()
        WHERE id = $1
      `, [
        user.id,
        `deleted_user_${user.id}`,
        `deleted-${user.id}@removed.invalid`,
      ]);

      // 5g. Write audit log row
      await client.query(`
        INSERT INTO account_deletion_log
          (user_id, email, username, was_admin, listings_removed, images_removed, waitlist_removed, deleted_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      `, [
        user.id,
        user.email,
        user.username,
        user.is_admin ?? false,
        listings.length,
        imgRows ?? 0,
        wlRows  ?? 0,
      ]);

      await client.query("COMMIT");

      totalListings += listings.length;
      totalImages   += imgRows   ?? 0;
      totalWaitlist += wlRows    ?? 0;

      log(`       ✓  DB committed`);
      log(`          listings deactivated : ${listings.length}`);
      log(`          image rows removed   : ${imgRows ?? 0}`);
      log(`          waitlist rows removed: ${wlRows  ?? 0}`);

      // 5h. Delete from R2 / local disk (best-effort, outside transaction)
      if (images.length > 0) {
        log(`          deleting ${images.length} file(s) from storage…`);
        const results = await Promise.allSettled(
          images.map((img) => deleteFromStorage(img.image_url))
        );
        const storeFailed = results.filter((r) => r.status === "rejected");
        if (storeFailed.length > 0) {
          log(`          ⚠️  ${storeFailed.length} storage deletion(s) failed (logged above by r2.js)`);
        } else {
          log(`          ✓  storage files deleted`);
        }
      }

    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      log(`       ✗  ERROR for user #${user.id}: ${err.message}`);
      errors.push({ userId: user.id, email: user.email, error: err.message });
    } finally {
      client.release();
    }
  }

  // ── 6. Summary ────────────────────────────────────────────────────────────
  section("Cleanup complete");
  const succeeded = candidates.length - errors.length;
  log(`  Accounts processed   : ${candidates.length}`);
  log(`  Successfully removed : ${succeeded}`);
  log(`  Errors               : ${errors.length}`);
  log(`  Listings deactivated : ${totalListings}`);
  log(`  Image rows removed   : ${totalImages}`);
  log(`  Waitlist rows removed: ${totalWaitlist}`);
  log(`  Finished at          : ${formatTs()}`);

  if (errors.length > 0) {
    section("Errors (these accounts were NOT modified)");
    errors.forEach((e) => log(`  User #${e.userId}  <${e.email}>  →  ${e.error}`));
    process.exitCode = 1;
  }

  await pool.end();
}

main()
  .then(() => process.exit(process.exitCode ?? 0))
  .catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
