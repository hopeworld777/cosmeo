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

export const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5 MB

export const FORMAT_ERROR =
  "Unsupported image format. Please upload a JPG, PNG, WEBP, or GIF image.";

/**
 * Validates and prepares an image file for avatar upload:
 *   - Enforces 5 MB size limit.
 *   - Converts HEIC/HEIF (iPhone photos) to JPEG automatically.
 *   - Rejects unsupported formats with a user-friendly message.
 *
 * Returns a File ready to pass to api.upload.avatar(), or throws an Error
 * with a message safe to show directly to the user.
 */
export async function prepareImageFile(file) {
  if (file.size > MAX_AVATAR_BYTES) {
    throw new Error("Image must be smaller than 5 MB.");
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
