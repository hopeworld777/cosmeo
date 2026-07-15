import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// server/uploads is served statically at /uploads (see index.js) — this is
// the local fallback storage location used when R2 is not configured.
const LOCAL_UPLOADS_DIR = path.join(__dirname, "../uploads");

// Trim defensively: a stray trailing newline/space from copy-pasting a
// secret value silently breaks SigV4 signing and surfaces as an opaque
// "signature mismatch" error with no indication the credential itself is at fault.
const R2_ACCOUNT_ID        = process.env.R2_ACCOUNT_ID?.trim();
const R2_ACCESS_KEY_ID     = process.env.R2_ACCESS_KEY_ID?.trim();
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY?.trim();
const R2_BUCKET_NAME       = process.env.R2_BUCKET_NAME?.trim();

// Startup diagnostic — never logs actual secret values, only presence/length.
const _allSet = R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET_NAME;
if (_allSet) {
  console.log(`Storage provider initialized: R2 (bucket: ${R2_BUCKET_NAME})`);
} else {
  console.log("Storage provider initialized: local disk (R2 not configured — uploads will not persist across restarts)");
  console.log("[r2] missing vars →", {
    R2_ACCOUNT_ID:        R2_ACCOUNT_ID        ? "set" : "MISSING",
    R2_ACCESS_KEY_ID:     R2_ACCESS_KEY_ID     ? "set" : "MISSING",
    R2_SECRET_ACCESS_KEY: R2_SECRET_ACCESS_KEY ? "set" : "MISSING",
    R2_BUCKET_NAME:       R2_BUCKET_NAME       ? "set" : "MISSING",
  });
}

export const r2 = R2_ACCOUNT_ID
  ? new S3Client({
      region: "auto",
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
      // AWS SDK v3 (>=3.729) defaults to adding a request checksum (CRC32)
      // header that Cloudflare R2 does not support in its signature
      // validation, which surfaces as a "signature mismatch" error on every
      // upload. Disabling automatic checksum calculation/validation restores
      // plain SigV4 requests that R2 accepts.
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    })
  : null;

export const BUCKET = R2_BUCKET_NAME || "cosmeo";

// ── Startup connectivity probe ────────────────────────────────────────────────
// Writes and immediately deletes a tiny sentinel object to verify that the R2
// credentials actually work.  Runs once, non-blocking (fire-and-forget).
// A failed probe means every subsequent upload will also fail, so we log a
// prominent actionable error rather than letting the first real upload blow up
// mid-form with an opaque "Unauthorized" message.
if (r2) {
  const sentinelKey = `__r2-probe-${Date.now()}.txt`;
  Promise.resolve()
    .then(async () => {
      await r2.send(new PutObjectCommand({
        Bucket: BUCKET, Key: sentinelKey, Body: Buffer.from("ok"), ContentType: "text/plain",
      }));
      await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: sentinelKey }));
      console.log("[r2] ✓ connectivity probe passed — writes to R2 are working");
    })
    .catch((err) => {
      const httpStatus = err.$metadata?.httpStatusCode ?? "unknown";
      console.error(
        `\n[r2] ✗ CONNECTIVITY PROBE FAILED (HTTP ${httpStatus}: ${err.message})\n` +
        `  All image uploads will fail until this is resolved.\n` +
        `  Common causes:\n` +
        `    • R2_ACCESS_KEY_ID is set to the Account ID instead of an API token key\n` +
        `      (they look the same — a 32-char hex string — but are different values)\n` +
        `    • The API token lacks "Object Read & Write" permission on bucket "${BUCKET}"\n` +
        `    • R2_SECRET_ACCESS_KEY does not match the access key\n` +
        `  Fix: Cloudflare Dashboard → R2 → Manage R2 API Tokens → Create API Token\n`
      );
    });
}

/**
 * Uploads a raw buffer to R2 (or local disk fallback).
 * Used by avatar uploads in auth.js which don't need sharp processing.
 * Listing-photo uploads go through processAndSave() in routes/upload.js instead.
 */
export async function uploadToR2(buffer, key, contentType) {
  if (!r2) {
    const destPath = path.join(LOCAL_UPLOADS_DIR, key);
    await fs.promises.mkdir(path.dirname(destPath), { recursive: true });
    await fs.promises.writeFile(destPath, buffer);
    return `/uploads/${key}`;
  }
  await r2.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );
  return `/api/media/${key}`;
}

export async function streamFromR2(key, res) {
  const { Body, ContentType, ContentLength } = await r2.send(
    new GetObjectCommand({ Bucket: BUCKET, Key: key })
  );
  if (ContentType)   res.setHeader("Content-Type", ContentType);
  if (ContentLength) res.setHeader("Content-Length", ContentLength);
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  Body.pipe(res);
}

/**
 * Deletes a stored image (full + thumbnail) from R2 or local disk.
 *
 * Accepts the URL returned by the upload endpoint:
 *   /api/media/<key>   → R2 storage
 *   /uploads/<key>     → local disk fallback
 *
 * Both the full-size file and its "thumb-<key>" counterpart are deleted.
 * Errors are logged but never re-thrown — callers can fire-and-forget.
 */
export async function deleteFromStorage(url) {
  if (!url) return;

  let key;
  if (url.startsWith("/api/media/")) {
    key = url.slice("/api/media/".length);
  } else if (url.startsWith("/uploads/")) {
    key = url.slice("/uploads/".length);
  } else {
    console.warn("[r2] deleteFromStorage — unrecognised URL, skipping:", url);
    return;
  }

  // The thumbnail always shares the same key with a "thumb-" prefix.
  // e.g. "1234-abc.webp" → "thumb-1234-abc.webp"
  const thumbKey = `thumb-${key}`;

  try {
    if (r2) {
      await Promise.allSettled([
        r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key })),
        r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: thumbKey })),
      ]);
      console.log(`[r2] deleted: ${key} + ${thumbKey}`);
    } else {
      await Promise.allSettled([
        fs.promises.unlink(path.join(LOCAL_UPLOADS_DIR, key)),
        fs.promises.unlink(path.join(LOCAL_UPLOADS_DIR, thumbKey)),
      ]);
      console.log(`[disk] deleted: ${key} + ${thumbKey}`);
    }
  } catch (err) {
    console.error("[r2] deleteFromStorage error:", err.message);
  }
}

/**
 * Lists all object keys currently in the R2 bucket (or local uploads dir).
 * Used by the admin orphan-cleanup endpoint to find unreferenced files.
 * Returns an array of key strings.
 */
export async function listAllStorageKeys() {
  if (r2) {
    const keys = [];
    let continuationToken;
    do {
      const resp = await r2.send(new ListObjectsV2Command({
        Bucket: BUCKET,
        ContinuationToken: continuationToken,
      }));
      for (const obj of resp.Contents ?? []) keys.push(obj.Key);
      continuationToken = resp.IsTruncated ? resp.NextContinuationToken : undefined;
    } while (continuationToken);
    return keys;
  } else {
    // Local disk: list files in uploads/
    try {
      return await fs.promises.readdir(LOCAL_UPLOADS_DIR);
    } catch {
      return [];
    }
  }
}
