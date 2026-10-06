import "server-only";
import { BlobNotFoundError, del, get, head, put } from "@vercel/blob";
import type { StorageDriver } from "./index";

/** Store access mode; must match how the Blob store was created in Vercel. */
export const BLOB_ACCESS: "private" | "public" = process.env.BLOB_ACCESS === "public" ? "public" : "private";

/** Keys are blob pathnames, so DB rows stay driver-neutral. */
export const blobStorageDriver: StorageDriver = {
  async put(key, data, contentType) {
    await put(key, data, { access: BLOB_ACCESS, contentType, addRandomSuffix: false });
  },
  async get(key) {
    const res = await get(key, { access: BLOB_ACCESS });
    if (!res || res.statusCode !== 200) return null;
    return { body: res.stream };
  },
  async stat(key) {
    try {
      const h = await head(key);
      return { size: h.size, contentType: h.contentType };
    } catch (e) {
      if (e instanceof BlobNotFoundError) return null;
      throw e;
    }
  },
  async delete(key) {
    await del(key);
  },
};
