import "server-only";
import { promises as fs } from "fs";
import path from "path";
import type { StorageDriver } from "./index";

const root = path.resolve(process.env.UPLOAD_DIR ?? "./storage/uploads");

function resolveKey(key: string) {
  const full = path.resolve(root, key);
  if (!full.startsWith(root + path.sep)) throw new Error("Invalid storage key");
  return full;
}

export const localStorageDriver: StorageDriver = {
  async put(key, data) {
    const full = resolveKey(key);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, data);
  },
  async get(key) {
    try {
      return await fs.readFile(resolveKey(key));
    } catch {
      return null;
    }
  },
  async delete(key) {
    await fs.rm(resolveKey(key), { force: true });
  },
};
