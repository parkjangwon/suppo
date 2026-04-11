export const ALLOWED_IMAGE_UPLOAD_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/gif",
  "image/webp",
] as const;

export function isAllowedImageUploadMimeType(mimeType: string) {
  return ALLOWED_IMAGE_UPLOAD_MIME_TYPES.includes(
    mimeType as (typeof ALLOWED_IMAGE_UPLOAD_MIME_TYPES)[number]
  );
}
