import { Router, type IRouter } from "express";
import multer from "multer";
import path from "node:path";
import { eq } from "drizzle-orm";
import {
  db,
  eventsTable,
  tablesTable,
  invitationsTable,
  memoryUploadsTable,
  guestbookMessagesTable,
} from "@workspace/db";
import { generateToken } from "../lib/crypto";
import { UPLOADS_DIR, ensureUploadsDir } from "../lib/storage";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

const ALLOWED: Record<string, { type: "image" | "video" | "audio"; ext: string[] }> = {
  "image/jpeg": { type: "image", ext: [".jpg", ".jpeg"] },
  "image/png": { type: "image", ext: [".png"] },
  "image/webp": { type: "image", ext: [".webp"] },
  "image/heic": { type: "image", ext: [".heic"] },
  "image/gif": { type: "image", ext: [".gif"] },
  "video/mp4": { type: "video", ext: [".mp4"] },
  "video/quicktime": { type: "video", ext: [".mov"] },
  "video/webm": { type: "video", ext: [".webm"] },
  "audio/webm": { type: "audio", ext: [".webm"] },
  "audio/mp4": { type: "audio", ext: [".m4a", ".mp4"] },
  "audio/mpeg": { type: "audio", ext: [".mp3"] },
  "audio/ogg": { type: "audio", ext: [".ogg"] },
  "audio/wav": { type: "audio", ext: [".wav"] },
};

const MAX_FILE_SIZE = 60 * 1024 * 1024; // hard cap; per-type checks below

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    ensureUploadsDir();
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const spec = ALLOWED[file.mimetype];
    const ext =
      spec?.ext[0] ?? path.extname(file.originalname).toLowerCase() ?? ".bin";
    cb(null, `${Date.now()}-${generateToken(8)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    // Strip codec parameters, e.g. "audio/webm;codecs=opus"
    const mime = file.mimetype.split(";")[0]!.trim();
    if (!ALLOWED[mime]) {
      cb(new Error(`File type ${mime} is not allowed`));
      return;
    }
    file.mimetype = mime;
    cb(null, true);
  },
});

const TYPE_LIMITS: Record<string, number> = {
  image: 15 * 1024 * 1024,
  video: 60 * 1024 * 1024,
  audio: 15 * 1024 * 1024,
};

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
      const spec = ALLOWED[req.file.mimetype];
      if (!spec || req.file.size > (TYPE_LIMITS[spec.type] ?? 0)) {
        res.status(400).json({ error: "File too large for its type" });
        return;
      }
      const [event] = await db.select().from(eventsTable).limit(1);
      if (!event) {
        res.status(404).json({ error: "No event configured" });
        return;
      }

      const body = req.body as Record<string, string | undefined>;
      let tableId: number | null = null;
      if (body.tableToken) {
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

      const fileUrl = `/uploads/${req.file.filename}`;
      const status = event.autoApprove ? "approved" : "pending";
      const uploadedByName = body.uploadedByName?.slice(0, 120) ?? null;

      if (body.target === "voice" && spec.type === "audio") {
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
          fileType: spec.type,
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
    const spec = ALLOWED[req.file.mimetype];
    if (!spec || spec.type !== "image") {
      res.status(400).json({ error: "Only image files are allowed here" });
      return;
    }
    res.status(201).json({ url: `/uploads/${req.file.filename}` });
  });
});

export default router;
