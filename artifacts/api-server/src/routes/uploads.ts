import { Router, type IRouter } from "express";
import multer from "multer";
import path from "node:path";
import { and, count, eq, or } from "drizzle-orm";
import { promises as fs } from "node:fs";
import {
  db,
  eventsTable,
  tablesTable,
  invitationsTable,
  memoryUploadsTable,
  guestbookMessagesTable,
} from "@workspace/db";
import { generateToken } from "../lib/crypto";
import {
  detectFileType,
  isSafeDeclaredMime,
} from "../lib/file-validation";
import { UPLOADS_DIR, ensureUploadsDir } from "../lib/storage";
import { requireAuth } from "../middlewares/auth";
import { createRateLimit } from "../middlewares/rate-limit";

const router: IRouter = Router();
router.use(
  createRateLimit({
    id: "uploads",
    max: 24,
    windowMs: 60_000,
  }),
);
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const MAX_PUBLIC_UPLOADS_PER_ACTOR = 5;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    file.mimetype = file.mimetype.split(";")[0]!.trim().toLowerCase();
    cb(null, true);
  },
});

async function persistUpload(buffer: Buffer, ext: string): Promise<string> {
  ensureUploadsDir();
  const filename = `${Date.now()}-${generateToken(8)}${ext}`;
  await fs.writeFile(path.join(UPLOADS_DIR, filename), buffer);
  return `/uploads/${filename}`;
}

async function actorUploadCount(
  eventId: number,
  invitationId: number | null,
  tableId: number | null,
): Promise<number> {
  const filters = [];
  if (invitationId) filters.push(eq(memoryUploadsTable.invitationId, invitationId));
  if (tableId) filters.push(eq(memoryUploadsTable.tableId, tableId));
  if (filters.length === 0) return 0;
  const [memoryRow] = await db
    .select({ value: count() })
    .from(memoryUploadsTable)
    .where(and(eq(memoryUploadsTable.eventId, eventId), or(...filters)));
  const voiceFilters = [];
  if (invitationId) voiceFilters.push(eq(guestbookMessagesTable.invitationId, invitationId));
  if (tableId) voiceFilters.push(eq(guestbookMessagesTable.tableId, tableId));
  const [voiceRow] = await db
    .select({ value: count() })
    .from(guestbookMessagesTable)
    .where(
      and(
        eq(guestbookMessagesTable.eventId, eventId),
        eq(guestbookMessagesTable.messageType, "voice"),
        or(...voiceFilters),
      ),
    );
  return Number(memoryRow?.value ?? 0) + Number(voiceRow?.value ?? 0);
}

/**
 * Guest memory upload (photo/video) or voice guestbook note (FR-022, FR-025).
 * Fields: file, tableToken?, inviteToken?, uploadedByName?, caption?,
 * target: "memory" (default) | "voice".
 */
router.post("/uploads", (req, res, next) => {
  upload.single("file")(req, res, async (err: unknown) => {
    try {
      if (err) {
        const message =
          err instanceof Error ? err.message : "Upload rejected";
        res.status(400).json({ error: message });
        return;
      }
      if (!req.file) {
        res.status(400).json({ error: "A file is required" });
        return;
      }
      const detected = detectFileType(req.file.buffer);
      if (!detected || !isSafeDeclaredMime(req.file.mimetype, detected)) {
        res.status(400).json({
          error:
            "Unsupported or unsafe file type. Please upload a standard image, video, or audio recording from your device.",
        });
        return;
      }
      const [event] = await db.select().from(eventsTable).limit(1);
      if (!event) {
        res.status(404).json({ error: "No event configured" });
        return;
      }
      if (!event.uploadsEnabled) {
        res.status(403).json({
          error: "Uploads are currently locked by the couple.",
        });
        return;
      }

      const body = req.body as Record<string, string | undefined>;
      let tableId: number | null = null;
      if (body.tableToken && event.tablesEnabled) {
        const [table] = await db
          .select()
          .from(tablesTable)
          .where(eq(tablesTable.token, body.tableToken));
        tableId = table?.id ?? null;
      }
      let invitationId: number | null = null;
      if (body.inviteToken) {
        const [invitation] = await db
          .select()
          .from(invitationsTable)
          .where(eq(invitationsTable.token, body.inviteToken));
        invitationId = invitation?.id ?? null;
      }
      if (!invitationId && !tableId) {
        res.status(400).json({
          error: "Uploads must come from a valid invitation link or table link.",
        });
        return;
      }

      const existingUploads = await actorUploadCount(
        event.id,
        invitationId,
        tableId,
      );
      const maxUploads = Math.max(
        1,
        event.maxUploadsPerGuest || MAX_PUBLIC_UPLOADS_PER_ACTOR,
      );
      if (existingUploads >= maxUploads) {
        res.status(429).json({
          error: `This guest has already shared the maximum of ${maxUploads} upload items.`,
        });
        return;
      }

      const fileUrl = await persistUpload(req.file.buffer, detected.ext);
      const status = event.autoApprove ? "approved" : "pending";
      const uploadedByName = body.uploadedByName?.slice(0, 120) ?? null;

      if (body.target === "voice" && detected.kind === "audio") {
        const [created] = await db
          .insert(guestbookMessagesTable)
          .values({
            eventId: event.id,
            tableId,
            invitationId,
            messageType: "voice",
            fileUrl,
            guestName: uploadedByName,
            status,
          })
          .returning();
        res.status(201).json({ id: created!.id, status, fileUrl });
        return;
      }

      const [created] = await db
        .insert(memoryUploadsTable)
        .values({
          eventId: event.id,
          tableId,
          invitationId,
          fileUrl,
          fileType: detected.kind,
          status,
          uploadedByName,
          caption: body.caption?.slice(0, 300) ?? null,
        })
        .returning();
      res.status(201).json({ id: created!.id, status, fileUrl });
    } catch (e) {
      next(e);
    }
  });
});

/** Admin-only design asset upload (invitation backgrounds etc.). */
router.post("/admin/asset", requireAuth("admin"), (req, res) => {
  upload.single("file")(req, res, (err: unknown) => {
    if (err) {
      const message = err instanceof Error ? err.message : "Upload rejected";
      res.status(400).json({ error: message });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: "A file is required" });
      return;
    }
    const detected = detectFileType(req.file.buffer);
    if (!detected || !isSafeDeclaredMime(req.file.mimetype, detected) || detected.kind !== "image") {
      res.status(400).json({ error: "Only image files are allowed here" });
      return;
    }
    void persistUpload(req.file.buffer, detected.ext)
      .then((url) => {
        res.status(201).json({ url });
      })
      .catch(() => {
        res.status(500).json({ error: "Could not store uploaded image" });
      });
  });
});

export default router;
