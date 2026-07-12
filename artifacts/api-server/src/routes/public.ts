import { Router, type IRouter } from "express";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import QRCode from "qrcode";
import {
  db,
  eventsTable,
  invitationsTable,
  tablesTable,
  guestbookMessagesTable,
  memoryUploadsTable,
  type Event,
} from "@workspace/db";

const router: IRouter = Router();

function publicEvent(event: Event) {
  let invitationConfig: unknown = null;
  if (event.invitationConfig) {
    try {
      invitationConfig = JSON.parse(event.invitationConfig);
    } catch {
      invitationConfig = null;
    }
  }
  return {
    name: event.name,
    slug: event.slug,
    coupleNames: event.coupleNames,
    dateTime: event.dateTime,
    venueName: event.venueName,
    venueMapUrl: event.venueMapUrl,
    language: event.language,
    status: event.status,
    welcomeMessage: event.welcomeMessage,
    thankYouMessage: event.thankYouMessage,
    guestbookPublic: event.guestbookPublic,
    tablesEnabled: event.tablesEnabled,
    invitationConfig,
  };
}

async function getLiveEvent(): Promise<Event | undefined> {
  const [event] = await db.select().from(eventsTable).limit(1);
  return event;
}

/** Public event details for the landing invitation page. */
router.get("/event", async (_req, res, next) => {
  try {
    const event = await getLiveEvent();
    if (!event) {
      res.status(404).json({ error: "No event configured" });
      return;
    }
    res.json({ event: publicEvent(event) });
  } catch (err) {
    next(err);
  }
});

/** Personalized invitation lookup (FR-004, FR-013). */
router.get("/invite/:token", async (req, res, next) => {
  try {
    const [row] = await db
      .select({
        invitation: invitationsTable,
        event: eventsTable,
        tableName: tablesTable.name,
      })
      .from(invitationsTable)
      .innerJoin(eventsTable, eq(invitationsTable.eventId, eventsTable.id))
      .leftJoin(tablesTable, eq(invitationsTable.tableId, tablesTable.id))
      .where(eq(invitationsTable.token, req.params.token));
    if (!row || row.invitation.status === "cancelled") {
      res.status(404).json({ error: "Invitation not found or cancelled" });
      return;
    }
    res.json({
      event: publicEvent(row.event),
      invitation: {
        guestName: row.invitation.guestName,
        allowedCount: row.invitation.allowedCount,
        rsvpStatus: row.invitation.rsvpStatus,
        rsvpCount: row.invitation.rsvpCount,
        tableName: row.tableName,
      },
    });
  } catch (err) {
    next(err);
  }
});

const rsvpSchema = z.object({
  status: z.enum(["confirmed", "declined"]),
  count: z.number().int().min(1).optional(),
  note: z.string().max(500).optional(),
});

/** Guest RSVP within allowed count (FR-010). */
router.post("/invite/:token/rsvp", async (req, res, next) => {
  try {
    const parsed = rsvpSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid RSVP payload" });
      return;
    }
    const [invitation] = await db
      .select()
      .from(invitationsTable)
      .where(eq(invitationsTable.token, req.params.token));
    if (!invitation || invitation.status === "cancelled") {
      res.status(404).json({ error: "Invitation not found or cancelled" });
      return;
    }
    const { status, count, note } = parsed.data;
    const rsvpCount =
      status === "confirmed" ? (count ?? invitation.allowedCount) : 0;
    if (status === "confirmed" && rsvpCount > invitation.allowedCount) {
      res.status(400).json({
        error: `This invitation allows up to ${invitation.allowedCount} guests`,
      });
      return;
    }
    const [updated] = await db
      .update(invitationsTable)
      .set({ rsvpStatus: status, rsvpCount, rsvpNote: note ?? null })
      .where(eq(invitationsTable.id, invitation.id))
      .returning();
    res.json({
      rsvpStatus: updated!.rsvpStatus,
      rsvpCount: updated!.rsvpCount,
    });
  } catch (err) {
    next(err);
  }
});

/** Table interaction page details (FR-020, FR-021). */
router.get("/table/:tableToken", async (req, res, next) => {
  try {
    const [row] = await db
      .select({ table: tablesTable, event: eventsTable })
      .from(tablesTable)
      .innerJoin(eventsTable, eq(tablesTable.eventId, eventsTable.id))
      .where(eq(tablesTable.token, req.params.tableToken));
    if (!row) {
      res.status(404).json({ error: "Table not found" });
      return;
    }
    res.json({
      table: { name: row.table.name },
      event: publicEvent(row.event),
    });
  } catch (err) {
    next(err);
  }
});

const messageSchema = z.object({
  guestName: z.string().max(120).optional(),
  text: z.string().min(1).max(1000),
  tableToken: z.string().optional(),
  inviteToken: z.string().optional(),
});

/** Written guestbook wish (FR-024). Goes to the moderation queue. */
router.post("/guestbook", async (req, res, next) => {
  try {
    const parsed = messageSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "A message is required" });
      return;
    }
    const event = await getLiveEvent();
    if (!event) {
      res.status(404).json({ error: "No event configured" });
      return;
    }
    let tableId: number | null = null;
    if (parsed.data.tableToken) {
      const [table] = await db
        .select()
        .from(tablesTable)
        .where(eq(tablesTable.token, parsed.data.tableToken));
      tableId = table?.id ?? null;
    }
    let invitationId: number | null = null;
    if (parsed.data.inviteToken) {
      const [invitation] = await db
        .select()
        .from(invitationsTable)
        .where(eq(invitationsTable.token, parsed.data.inviteToken));
      invitationId = invitation?.id ?? null;
    }
    const [created] = await db
      .insert(guestbookMessagesTable)
      .values({
        eventId: event.id,
        tableId,
        invitationId,
        messageType: "text",
        text: parsed.data.text,
        guestName: parsed.data.guestName ?? null,
        status: event.autoApprove ? "approved" : "pending",
      })
      .returning();
    res.status(201).json({ id: created!.id, status: created!.status });
  } catch (err) {
    next(err);
  }
});

/** Live wall feed — approved content only (FR-027, FR-028). */
router.get("/wall/items", async (_req, res, next) => {
  try {
    const event = await getLiveEvent();
    if (!event) {
      res.status(404).json({ error: "No event configured" });
      return;
    }
    const uploads = await db
      .select({
        id: memoryUploadsTable.id,
        fileUrl: memoryUploadsTable.fileUrl,
        fileType: memoryUploadsTable.fileType,
        uploadedByName: memoryUploadsTable.uploadedByName,
        caption: memoryUploadsTable.caption,
        createdAt: memoryUploadsTable.createdAt,
      })
      .from(memoryUploadsTable)
      .where(
        and(
          eq(memoryUploadsTable.eventId, event.id),
          eq(memoryUploadsTable.status, "approved"),
        ),
      );
    const messages = await db
      .select({
        id: guestbookMessagesTable.id,
        text: guestbookMessagesTable.text,
        guestName: guestbookMessagesTable.guestName,
        messageType: guestbookMessagesTable.messageType,
        createdAt: guestbookMessagesTable.createdAt,
      })
      .from(guestbookMessagesTable)
      .where(
        and(
          eq(guestbookMessagesTable.eventId, event.id),
          eq(guestbookMessagesTable.status, "approved"),
          eq(guestbookMessagesTable.messageType, "text"),
        ),
      );
    res.json({
      event: { coupleNames: event.coupleNames, name: event.name },
      photos: uploads.filter((u) => u.fileType === "image"),
      messages,
    });
  } catch (err) {
    next(err);
  }
});

/** After-wedding archive: approved gallery + guestbook (FR-031, FR-033). */
router.get("/archive", async (_req, res, next) => {
  try {
    const event = await getLiveEvent();
    if (!event) {
      res.status(404).json({ error: "No event configured" });
      return;
    }
    const uploads = await db
      .select()
      .from(memoryUploadsTable)
      .where(
        and(
          eq(memoryUploadsTable.eventId, event.id),
          eq(memoryUploadsTable.status, "approved"),
        ),
      );
    const messages = event.guestbookPublic
      ? await db
          .select()
          .from(guestbookMessagesTable)
          .where(
            and(
              eq(guestbookMessagesTable.eventId, event.id),
              eq(guestbookMessagesTable.status, "approved"),
            ),
          )
      : [];
    res.json({ event: publicEvent(event), uploads, messages });
  } catch (err) {
    next(err);
  }
});

/**
 * QR PNG for an invitation or table link. Public: possessing the token
 * already grants access to the page the QR encodes.
 */
router.get("/qr/:kind/:token", async (req, res, next) => {
  try {
    const { kind, token } = req.params as { kind: string; token: string };
    if (kind !== "invite" && kind !== "table") {
      res.status(400).json({ error: "Unknown QR kind" });
      return;
    }
    const base =
      process.env.PUBLIC_BASE_URL ||
      `${req.protocol}://${req.get("host") ?? "localhost"}`;
    const url = `${base}/${kind === "invite" ? "i" : "t"}/${token}`;
    const png = await QRCode.toBuffer(url, {
      width: 512,
      margin: 2,
      color: { dark: "#3C3228", light: "#FAF7F2" },
    });
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(png);
  } catch (err) {
    next(err);
  }
});

export default router;
