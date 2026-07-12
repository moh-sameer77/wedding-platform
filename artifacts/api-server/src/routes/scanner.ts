import { Router, type IRouter } from "express";
import { z } from "zod";
import { and, desc, eq, sql } from "drizzle-orm";
import {
  db,
  invitationsTable,
  checkinsTable,
  tablesTable,
  usersTable,
  type Invitation,
} from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { createRateLimit } from "../middlewares/rate-limit";
import { verifyQrTokenSignature } from "../lib/crypto";

const router: IRouter = Router();
router.use(
  createRateLimit({
    id: "scanner",
    max: 90,
    windowMs: 60_000,
  }),
);

type ParsedScan = {
  token: string;
  hasSignedQr: boolean;
  signatureValid: boolean;
};

/** Tokens may arrive as a raw token or a full scanned URL like https://host/i/<token>?qr=<sig>. */
function normalizeToken(raw: string): ParsedScan {
  const trimmed = raw.trim();
  try {
    const url = new URL(trimmed);
    const inviteMatch = url.pathname.match(/\/i\/([A-Za-z0-9_-]+)/);
    if (inviteMatch?.[1]) {
      const signature = url.searchParams.get("qr");
      return {
        token: inviteMatch[1],
        hasSignedQr: Boolean(signature),
        signatureValid: signature
          ? verifyQrTokenSignature("invite", inviteMatch[1], signature)
          : false,
      };
    }
  } catch {
    // Raw token/manual code input falls through below.
  }
  const match = trimmed.match(/\/i\/([A-Za-z0-9_-]+)/);
  if (match?.[1]) {
    return { token: match[1], hasSignedQr: false, signatureValid: false };
  }
  return { token: trimmed, hasSignedQr: false, signatureValid: false };
}

async function checkedInCount(invitationId: number): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`coalesce(sum(${checkinsTable.count}), 0)` })
    .from(checkinsTable)
    .where(eq(checkinsTable.invitationId, invitationId));
  return Number(row?.total ?? 0);
}

async function invitationStatus(invitation: Invitation) {
  const checkedIn = await checkedInCount(invitation.id);
  const remaining = Math.max(0, invitation.allowedCount - checkedIn);
  let tableName: string | null = null;
  if (invitation.tableId) {
    const [table] = await db
      .select()
      .from(tablesTable)
      .where(eq(tablesTable.id, invitation.tableId));
    tableName = table?.name ?? null;
  }
  return {
    invitationId: invitation.id,
    guestName: invitation.guestName,
    allowedCount: invitation.allowedCount,
    rsvpStatus: invitation.rsvpStatus,
    rsvpCount: invitation.rsvpCount,
    checkedIn,
    remaining,
    tableName,
  };
}

/** Resolve a scanned QR for the guard (FR-015, FR-016). */
router.get(
  "/checkin/resolve/:token",
  requireAuth("guard"),
  async (req, res, next) => {
    try {
      const parsed = normalizeToken(String(req.params.token));
      if (parsed.hasSignedQr && !parsed.signatureValid) {
        res.json({ status: "invalid" });
        return;
      }
      const [invitation] = await db
        .select()
        .from(invitationsTable)
        .where(eq(invitationsTable.token, parsed.token));
      if (!invitation) {
        res.json({ status: "invalid" });
        return;
      }
      if (invitation.status === "cancelled") {
        res.json({ status: "cancelled", guestName: invitation.guestName });
        return;
      }
      const details = await invitationStatus(invitation);
      res.json({
        status: details.remaining <= 0 ? "full" : "valid",
        token: parsed.token,
        ...details,
      });
    } catch (err) {
      next(err);
    }
  },
);

const checkinSchema = z.object({
  token: z.string().min(1),
  count: z.number().int().min(1).max(50),
  override: z.boolean().optional(),
  overrideReason: z.string().max(200).optional(),
  overrideNote: z.string().max(500).optional(),
  notes: z.string().max(500).optional(),
});

/** Record a check-in with extra-guest override handling (FR-017, FR-018). */
router.post("/checkin", requireAuth("guard"), async (req, res, next) => {
  try {
    const parsed = checkinSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid check-in payload" });
      return;
    }
    const normalized = normalizeToken(parsed.data.token);
    if (normalized.hasSignedQr && !normalized.signatureValid) {
      res.status(400).json({ error: "Invalid QR signature" });
      return;
    }
    const token = normalized.token;
    const [invitation] = await db
      .select()
      .from(invitationsTable)
      .where(eq(invitationsTable.token, token));
    if (!invitation || invitation.status === "cancelled") {
      res.status(404).json({ error: "Invitation not found or cancelled" });
      return;
    }
    const checkedIn = await checkedInCount(invitation.id);
    const remaining = Math.max(0, invitation.allowedCount - checkedIn);
    const isOverCapacity = parsed.data.count > remaining;
    if (isOverCapacity && !parsed.data.override) {
      res.status(409).json({
        error: "EXTRA GUEST DETECTED",
        requiresOverride: true,
        allowedCount: invitation.allowedCount,
        checkedIn,
        remaining,
        requested: parsed.data.count,
      });
      return;
    }
    const overrideReason = parsed.data.overrideReason?.trim() ?? "";
    const overrideNote =
      parsed.data.overrideNote?.trim() ?? parsed.data.notes?.trim() ?? "";
    if (isOverCapacity && !overrideNote) {
      res
        .status(400)
        .json({
          error: "A note is required when overriding extra guests",
        });
      return;
    }
    const notes = isOverCapacity
      ? overrideReason
        ? `Reason: ${overrideReason}\nNote: ${overrideNote}`
        : `Note: ${overrideNote}`
      : parsed.data.notes ?? null;
    await db.insert(checkinsTable).values({
      eventId: invitation.eventId,
      invitationId: invitation.id,
      count: parsed.data.count,
      scannedByUserId: req.user!.id,
      isOverride: isOverCapacity,
      notes,
    });
    const details = await invitationStatus(invitation);
    res.status(201).json({ ok: true, isOverride: isOverCapacity, ...details });
  } catch (err) {
    next(err);
  }
});

/** Recent check-ins feed for the guard/admin screens. */
router.get("/checkin/recent", requireAuth("guard"), async (_req, res, next) => {
  try {
    const rows = await db
      .select({
        id: checkinsTable.id,
        count: checkinsTable.count,
        isOverride: checkinsTable.isOverride,
        notes: checkinsTable.notes,
        createdAt: checkinsTable.createdAt,
        guestName: invitationsTable.guestName,
        scannedBy: usersTable.name,
      })
      .from(checkinsTable)
      .innerJoin(
        invitationsTable,
        eq(checkinsTable.invitationId, invitationsTable.id),
      )
      .leftJoin(usersTable, eq(checkinsTable.scannedByUserId, usersTable.id))
      .orderBy(desc(checkinsTable.createdAt))
      .limit(20);
    res.json({ checkins: rows });
  } catch (err) {
    next(err);
  }
});

export default router;
