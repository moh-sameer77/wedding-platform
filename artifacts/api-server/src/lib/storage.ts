import path from "node:path";
import fs from "node:fs";

/** Local media storage directory, served at /uploads (S3/R2 later). */
export const UPLOADS_DIR =
  process.env.UPLOADS_DIR || path.resolve(process.cwd(), "uploads");

export function ensureUploadsDir(): void {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
