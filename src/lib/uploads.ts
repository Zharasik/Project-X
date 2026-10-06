/** Upload rules shared by the browser (pre-checks) and the server (enforcement). */
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

export const ALLOWED_EXTENSIONS = ["png", "jpg", "jpeg", "webp", "gif", "svg", "pdf", "zip", "psd", "ai"];

export const ALLOWED_UPLOAD_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "application/pdf",
  "application/zip",
  "application/x-zip-compressed",
  "image/vnd.adobe.photoshop",
  "application/postscript",
  "application/illustrator",
  "application/octet-stream", // .psd / .ai often arrive without a proper type
];

export function extensionOf(name: string) {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

/** Students upload into their own prefix; the server checks it before trusting a key. */
export function submissionPrefix(userId: string) {
  return `submissions/${userId}/`;
}

export function uploadError(file: { name: string; size: number }): string | null {
  if (file.size > MAX_UPLOAD_BYTES) return `Файл «${file.name}» больше 15 МБ`;
  if (!ALLOWED_EXTENSIONS.includes(extensionOf(file.name))) {
    return `Формат «${file.name}» не поддерживается. Разрешены: ${ALLOWED_EXTENSIONS.join(", ")}`;
  }
  return null;
}
