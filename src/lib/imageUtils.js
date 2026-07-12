import heic2any from "heic2any";

/** MIME types the backend and all major browsers can display. */
const SUPPORTED_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "image/bmp",
]);

const HEIC_TYPES = new Set(["image/heic", "image/heif"]);

export const MAX_AVATAR_BYTES   = 5  * 1024 * 1024; // 5 MB  — for avatars
export const MAX_LISTING_BYTES  = 20 * 1024 * 1024; // 20 MB — for listing photos (server compresses)
export const MAX_CHAT_IMAGE_BYTES = 15 * 1024 * 1024; // 15 MB — for chat attachments (server compresses)

// Keep in sync with MAX_IMAGES_PER_LISTING in server/routes/upload.js and the
// images.max(5) rule in server/routes/listings.js — this is the client-side
// mirror used to cap selection before it ever reaches the server.
export const MAX_IMAGES_PER_LISTING = 5;

export const FORMAT_ERROR =
  "Unsupported image format. Please upload a JPG, PNG, WEBP, AVIF, or GIF image.";

/**
 * Validates and prepares an image file for upload:
 *   - Enforces the supplied size limit.
 *   - Converts HEIC/HEIF (iPhone photos) to JPEG automatically.
 *   - Rejects unsupported formats with a user-friendly message.
 *
 * The server always re-compresses and converts to WebP, so the file sent from
 * the browser just needs to be decodable — original quality/size don't matter.
 *
 * Returns a File ready to pass to api.upload.*(), or throws an Error
 * with a message safe to show directly to the user.
 */
export async function prepareImageFile(file, { maxBytes = MAX_AVATAR_BYTES } = {}) {
  if (file.size > maxBytes) {
    const limitMB = Math.round(maxBytes / 1024 / 1024);
    throw new Error(`Image must be smaller than ${limitMB} MB.`);
  }

  const isHeic =
    HEIC_TYPES.has(file.type) || /\.(heic|heif)$/i.test(file.name);

  if (isHeic) {
    try {
      const result = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.85 });
      const blob = Array.isArray(result) ? result[0] : result;
      const newName = file.name.replace(/\.(heic|heif)$/i, ".jpg") || "photo.jpg";
      return new File([blob], newName, { type: "image/jpeg" });
    } catch {
      throw new Error(
        "Could not convert HEIC image. Please convert it to JPG or PNG first and try again."
      );
    }
  }

  if (!SUPPORTED_TYPES.has(file.type)) {
    throw new Error(FORMAT_ERROR);
  }

  return file;
}

/**
 * Derives the thumbnail URL from a full image URL.
 *
 * The server stores two WebP versions for every upload:
 *   full  → /api/media/<key>.webp          (max 1600 px wide)
 *   thumb → /api/media/thumb-<key>.webp    (max 600 px wide)
 *
 * The thumb key is simply "thumb-" prepended to the filename, so we can
 * reconstruct it from the full URL without an extra DB column.
 *
 * Works for both R2 URLs (/api/media/...) and local-disk fallback (/uploads/...).
 * Returns the original URL unchanged for any format it doesn't recognise,
 * so callers can safely pass any image URL without conditional checks.
 *
 * @param {string|null|undefined} url  Full image URL
 * @returns {string|null|undefined}    Thumbnail URL, or the input if unrecognised
 */
export function getThumbUrl(url) {
  if (!url) return url;
  // Insert "thumb-" before the last path segment:
  //   /api/media/1234-abc.webp  →  /api/media/thumb-1234-abc.webp
  //   /uploads/1234-abc.webp    →  /uploads/thumb-1234-abc.webp
  return url.replace(/\/([^/]+)$/, "/thumb-$1");
}
