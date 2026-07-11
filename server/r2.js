import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
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

export async function uploadToR2(buffer, key, contentType) {
  if (!r2) {
    // Local fallback (dev workspaces without R2 credentials configured):
    // write under server/uploads/, served statically at /uploads/<key>.
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
