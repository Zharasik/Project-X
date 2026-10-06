import "server-only";
import { localStorageDriver } from "./local";

/**
 * Storage abstraction for uploaded files. Records in the DB keep only a
 * `storageKey`; swapping the driver (e.g. to S3) needs no migration.
 */
export interface StorageDriver {
  put(key: string, data: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<Buffer | null>;
  delete(key: string): Promise<void>;
}

export const storage: StorageDriver = localStorageDriver;

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

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

export const ALLOWED_EXTENSIONS = ["png", "jpg", "jpeg", "webp", "gif", "svg", "pdf", "zip", "psd", "ai"];

export function extensionOf(name: string) {
  return name.split(".").pop()?.toLowerCase() ?? "";
}
