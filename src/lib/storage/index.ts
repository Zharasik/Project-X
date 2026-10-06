import "server-only";
import { blobStorageDriver } from "./blob";
import { localStorageDriver } from "./local";

/**
 * Storage abstraction for uploaded files. Records in the DB keep only a
 * `storageKey`; swapping the driver needs no migration.
 *
 * - local: files on disk (UPLOAD_DIR) — for development or a VPS with a volume
 * - blob:  Vercel Blob — used automatically when BLOB_READ_WRITE_TOKEN is set.
 *          Browsers upload directly to Blob (Vercel limits request bodies to 4.5 MB).
 */
export interface StoredFile {
  body: ReadableStream<Uint8Array> | Uint8Array;
}

export interface StorageDriver {
  put(key: string, data: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<StoredFile | null>;
  /** Size / type of an object the browser uploaded directly, or null if it doesn't exist. */
  stat(key: string): Promise<{ size: number; contentType: string } | null>;
  delete(key: string): Promise<void>;
}

export const storageMode: "blob" | "local" = process.env.BLOB_READ_WRITE_TOKEN ? "blob" : "local";

export const storage: StorageDriver = storageMode === "blob" ? blobStorageDriver : localStorageDriver;

export { ALLOWED_EXTENSIONS, ALLOWED_UPLOAD_TYPES, MAX_UPLOAD_BYTES, extensionOf } from "@/lib/uploads";
