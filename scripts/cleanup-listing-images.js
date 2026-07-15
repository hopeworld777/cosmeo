/**
 * cleanup-listing-images.js
 *
 * Removes all listing photo data from the beta environment:
 *   1. Every record in listing_images
 *   2. The corresponding R2 objects (full + thumb) referenced by those records
 *   3. Orphaned R2 objects (uploaded but listing creation failed) — excluding
 *      avatars (avatars/ prefix), chat attachments (message_attachments table),
 *      and user avatar_url references
 *   4. Non-.gitkeep files in the local uploads/ directory
 *
 * Run with --dry-run (default) to preview. Pass --execute to apply.
 *
 * Usage:
 *   node scripts/cleanup-listing-images.js            # dry-run (safe)
 *   node scripts/cleanup-listing-images.js --execute  # live deletion
 */

import {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import pg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.resolve(__dirname, "../uploads");
const DRY_RUN = !process.argv.includes("--execute");

// ── DB ────────────────────────────────────────────────────────────────────────
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

// ── R2 ────────────────────────────────────────────────────────────────────────
const R2_ACCOUNT_ID        = process.env.R2_ACCOUNT_ID?.trim();
const R2_ACCESS_KEY_ID     = process.env.R2_ACCESS_KEY_ID?.trim();
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY?.trim();
const R2_BUCKET_NAME       = process.env.R2_BUCKET_NAME?.trim();

const r2 = R2_ACCOUNT_ID
  ? new S3Client({
      region: "auto",
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    })
  : null;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Extract R2 key from a stored image URL. Returns null for unrecognised URLs. */
function urlToKey(url) {
  if (!url) return null;
  if (url.startsWith("/api/media/")) return url.slice("/api/media/".length);
  if (url.startsWith("/uploads/"))   return url.slice("/uploads/".length);
  return null;
}

/** Derive the thumbnail key from a full-size key (prepend "thumb-" to filename). */
function thumbKey(key) {
  const parts = key.split("/");
  parts[parts.length - 1] = "thumb-" + parts[parts.length - 1];
  return parts.join("/");
}

/**
 * List every object in the R2 bucket, paginating through all continuation tokens.
 * Returns an array of { Key, Size } objects.
 */
async function listAllR2Objects() {
  const objects = [];
  let token;
  do {
    const resp = await r2.send(
      new ListObjectsV2Command({ Bucket: R2_BUCKET_NAME, ContinuationToken: token })
    );
    for (const obj of resp.Contents ?? []) objects.push(obj);
    token = resp.IsTruncated ? resp.NextContinuationToken : undefined;
  } while (token);
  return objects;
}

/**
 * Delete a batch of R2 keys (max 1000 per call — S3 API limit).
 * Returns the number of objects successfully deleted.
 */
async function deleteR2Keys(keys) {
  if (keys.length === 0) return 0;
  let deleted = 0;
  for (let i = 0; i < keys.length; i += 1000) {
    const batch = keys.slice(i, i + 1000).map(k => ({ Key: k }));
    const resp = await r2.send(
      new DeleteObjectsCommand({ Bucket: R2_BUCKET_NAME, Delete: { Objects: batch, Quiet: false } })
    );
    deleted += resp.Deleted?.length ?? 0;
    if (resp.Errors?.length) {
      console.warn(`  ⚠  ${resp.Errors.length} R2 deletion error(s):`, resp.Errors.map(e => `${e.Key}: ${e.Message}`).join(", "));
    }
  }
  return deleted;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  Listing-image cleanup — ${DRY_RUN ? "DRY RUN (no changes)" : "⚠  LIVE EXECUTION"}`);
  console.log(`${"=".repeat(60)}\n`);

  // ── 1. Gather DB data ──────────────────────────────────────────────────────

  const [liRows, maRows, avatarRows] = await Promise.all([
    // All listing image URLs
    pool.query("SELECT id, listing_id, image_url FROM listing_images ORDER BY listing_id, sort_order"),
    // Chat attachment URLs — must NOT be deleted
    pool.query("SELECT image_url, thumb_url FROM message_attachments"),
    // User avatar URLs — must NOT be deleted
    pool.query("SELECT avatar_url FROM users WHERE avatar_url IS NOT NULL"),
  ]);

  const listingImageRows = liRows.rows;             // [{id, listing_id, image_url}]
  const safeUrls = new Set([
    ...maRows.rows.flatMap(r => [r.image_url, r.thumb_url].filter(Boolean)),
    ...avatarRows.rows.map(r => r.avatar_url).filter(Boolean),
  ]);
  const safeKeys = new Set([...safeUrls].map(urlToKey).filter(Boolean));

  console.log(`DATABASE`);
  console.log(`  listing_images rows   : ${listingImageRows.length}`);
  console.log(`  message_attachments   : ${maRows.rows.length}  (protected — will NOT be touched)`);
  console.log(`  user avatars          : ${avatarRows.rows.length}  (protected — will NOT be touched)`);

  // ── 2. Derive R2 keys from listing_images ──────────────────────────────────

  const listedKeys = new Set();
  for (const row of listingImageRows) {
    const k = urlToKey(row.image_url);
    if (k) {
      listedKeys.add(k);
      listedKeys.add(thumbKey(k));   // always delete the paired thumbnail
    }
  }

  // ── 3. Find orphaned R2 objects ────────────────────────────────────────────

  let orphanKeys = [];
  let r2TotalObjects = 0;

  if (r2) {
    const allObjects = await listAllR2Objects();
    r2TotalObjects = allObjects.length;

    for (const obj of allObjects) {
      const k = obj.Key;
      if (k.startsWith("avatars/")) continue;          // avatar — skip
      if (safeKeys.has(k))          continue;          // chat attachment — skip
      if (!listedKeys.has(k))       orphanKeys.push(k); // not in listing_images — orphan
    }
  } else {
    console.warn("  ⚠  R2 not configured — skipping R2 operations");
  }

  const allR2KeysToDelete = [...new Set([...listedKeys, ...orphanKeys])].filter(k => !safeKeys.has(k));

  // ── 4. Local uploads/ files ───────────────────────────────────────────────

  const localFiles = fs.existsSync(UPLOADS_DIR)
    ? fs.readdirSync(UPLOADS_DIR, { recursive: true })
        .filter(f => f !== ".gitkeep" && !fs.statSync(path.join(UPLOADS_DIR, f)).isDirectory())
    : [];

  // ── DRY-RUN REPORT ────────────────────────────────────────────────────────

  console.log(`\nSCOPE SUMMARY`);
  console.log(`  listing_images DB rows to delete : ${listingImageRows.length}`);
  console.log(`  R2 objects in bucket (total)     : ${r2TotalObjects}`);
  console.log(`    — from listing_images refs      : ${[...listedKeys].filter(k => !safeKeys.has(k)).length} keys`);
  console.log(`    — orphaned (no DB reference)    : ${orphanKeys.length} keys`);
  console.log(`    — TOTAL R2 deletions            : ${allR2KeysToDelete.length} keys`);
  console.log(`  local uploads/ files to delete   : ${localFiles.length}`);

  if (listingImageRows.length > 0) {
    console.log(`\nLISTING IMAGE URLs (first 20):`);
    listingImageRows.slice(0, 20).forEach(r =>
      console.log(`  listing ${r.listing_id}  →  ${r.image_url}`)
    );
    if (listingImageRows.length > 20) console.log(`  … and ${listingImageRows.length - 20} more`);
  }

  if (orphanKeys.length > 0) {
    console.log(`\nORPHANED R2 KEYS (first 10):`);
    orphanKeys.slice(0, 10).forEach(k => console.log(`  ${k}`));
    if (orphanKeys.length > 10) console.log(`  … and ${orphanKeys.length - 10} more`);
  }

  if (localFiles.length > 0) {
    console.log(`\nLOCAL uploads/ FILES:`);
    localFiles.forEach(f => console.log(`  ${f}`));
  }

  if (DRY_RUN) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`  DRY RUN complete — nothing was changed.`);
    console.log(`  Re-run with --execute to apply.`);
    console.log(`${"=".repeat(60)}\n`);
    await pool.end();
    return;
  }

  // ── LIVE EXECUTION ────────────────────────────────────────────────────────

  console.log(`\n${"=".repeat(60)}`);
  console.log(`  Executing cleanup…`);
  console.log(`${"=".repeat(60)}`);

  // Step 1: Delete from DB first (inside a transaction for atomicity)
  console.log(`\n[1/3] Deleting listing_images rows from database…`);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const del = await client.query("DELETE FROM listing_images RETURNING id");
    await client.query("COMMIT");
    console.log(`  ✓  Deleted ${del.rowCount} rows from listing_images`);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  // Step 2: Delete R2 objects
  if (r2 && allR2KeysToDelete.length > 0) {
    console.log(`\n[2/3] Deleting ${allR2KeysToDelete.length} R2 objects…`);
    const deleted = await deleteR2Keys(allR2KeysToDelete);
    console.log(`  ✓  Deleted ${deleted} R2 objects`);
  } else {
    console.log(`\n[2/3] R2: nothing to delete`);
  }

  // Step 3: Delete local uploads/ files
  console.log(`\n[3/3] Removing local uploads/ files…`);
  let localDeleted = 0;
  for (const f of localFiles) {
    try {
      fs.unlinkSync(path.join(UPLOADS_DIR, f));
      localDeleted++;
    } catch (err) {
      console.warn(`  ⚠  Could not delete uploads/${f}: ${err.message}`);
    }
  }
  console.log(`  ✓  Removed ${localDeleted} local file(s)`);

  // ── VERIFICATION ─────────────────────────────────────────────────────────

  console.log(`\nVERIFICATION`);
  const [countRow] = (await pool.query("SELECT COUNT(*) FROM listing_images")).rows;
  console.log(`  listing_images rows remaining : ${countRow.count}`);

  let r2Remaining = 0;
  if (r2) {
    const remaining = await listAllR2Objects();
    const listingObjects = remaining.filter(o => !o.Key.startsWith("avatars/") && !safeKeys.has(o.Key));
    r2Remaining = listingObjects.length;
    console.log(`  R2 listing objects remaining  : ${r2Remaining}`);
    console.log(`  R2 protected objects (kept)   : ${remaining.length - r2Remaining}`);
  }

  const localRemaining = fs.existsSync(UPLOADS_DIR)
    ? fs.readdirSync(UPLOADS_DIR).filter(f => f !== ".gitkeep").length
    : 0;
  console.log(`  local uploads/ files remaining: ${localRemaining}`);

  console.log(`\n${"=".repeat(60)}`);
  if (countRow.count === "0" && r2Remaining === 0 && localRemaining === 0) {
    console.log(`  ✓  Clean state confirmed. New uploads will start fresh.`);
  } else {
    console.log(`  ⚠  Some objects may remain — check warnings above.`);
  }
  console.log(`${"=".repeat(60)}\n`);

  await pool.end();
}

main().catch(err => {
  console.error("\nFatal error:", err.message);
  process.exit(1);
});
