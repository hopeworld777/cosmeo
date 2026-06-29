import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";

const {
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME,
} = process.env;

export const r2 = R2_ACCOUNT_ID
  ? new S3Client({
      region: "auto",
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    })
  : null;

export const BUCKET = R2_BUCKET_NAME || "cosmeo";

export async function uploadToR2(buffer, key, contentType) {
  if (!r2) throw new Error("R2 not configured");
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
