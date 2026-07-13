import { Router, type IRouter } from "express";
import { z } from "zod";
import { and, desc, eq, ne, sql } from "drizzle-orm";
import {
  db,
  eventsTable,
  invitationsTable,
  checkinsTable,
  tablesTable,
  usersTable,
  memoryUploadsTable,
  guestbookMessagesTable,
} from "@workspace/db";
import { generateToken, hashPassword } from "../lib/crypto";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

async function currentEvent() {
  const [event] = await db.select().from(eventsTable).limit(1);
  return event;
}

/** Team management: admins can add/edit/remove admin, guard and moderator accounts. */
function publicUser(u: typeof usersTable.$inferSelect) {
  return {
    id: u.id,
    username: u.username,
    name: u.name,
    role: u.role,
    active: u.active,
    createdAt: u.createdAt,
  };
}

async function activeAdminCount(excludingUserId?: number): Promise<number> {
  const conditions = [eq(usersTable.role, "admin"), eq(usersTable.active, true)];
  if (excludingUserId !== undefined) conditions.push(ne(usersTable.id, excludingUserId));
  const rows = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(and(...conditions));
  return rows.length;
}

router.get("/admin/users", requireAuth("admin"), async (_req, res, next) => {
  try {
    const rows = await db.select().from(usersTable).orderBy(usersTable.createdAt);
    res.json({ users: rows.map(publicUser) });
  } catch (err) {
    next(err);
  }
});

const userCreateSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3)
    .max(50)
    .regex(/^[a-z0-9._-]+$/i, "Letters, numbers, dots, dashes and underscores only")
    .transform((v) => v.toLowerCase()),
  name: z.string().trim().min(1).max(100),
  password: z.string().min(6).max(200),
  role: z.enum(["admin", "guard", "moderator"]),
});

router.post("/admin/users", requireAuth("admin"), async (req, res, next) => {
  try {
    const parsed = userCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid team member" });
      return;
    }
    const [existing] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.username, parsed.data.username));
    if (existing) {
      res.status(409).json({ error: "That username is already taken" });
      return;
    }
    const [created] = await db
      .insert(usersTable)
      .values({
        username: parsed.data.username,
        name: parsed.data.name,
        passwordHash: hashPassword(parsed.data.password),
        role: parsed.data.role,
      })
      .returning();
    res.status(201).json({ user: publicUser(created!) });
  } catch (err) {
    next(err);
  }
});

const userPatchSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  role: z.enum(["admin", "guard", "moderator"]).optional(),
  active: z.boolean().optional(),
  password: z.string().min(6).max(200).optional(),
});

router.patch("/admin/users/:id", requireAuth("admin"), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const parsed = userPatchSchema.safeParse(req.body);
    if (!Number.isInteger(id) || !parsed.success) {
      res.status(400).json({ error: "Invalid update" });
      return;
    }
    const [target] = await db.select().from(usersTable).where(eq(usersTable.id, id));
    if (!target) {
      res.status(404).json({ error: "Team member not found" });
      return;
    }
    const demotingOrDeactivatingSelf =
      target.id === req.user!.id &&
      ((parsed.data.role && parsed.data.role !== "admin") || parsed.data.active === false);
    if (demotingOrDeactivatingSelf) {
      res.status(400).json({
        error: "You can't remove your own admin access — ask another admin to do it",
      });
      return;
    }
    const losingAdminAccess =
      target.role === "admin" &&
      target.active &&
      ((parsed.data.role && parsed.data.role !== "admin") || parsed.data.active === false);
    if (losingAdminAccess && (await activeAdminCount(target.id)) === 0) {
      res.status(400).json({ error: "Can't remove the last remaining admin" });
      return;
    }
    const { password, ...rest } = parsed.data;
    const patch: Record<string, unknown> = { ...rest };
    if (password) patch.passwordHash = hashPassword(password);
    const [updated] = await db
      .update(usersTable)
      .set(patch)
      .where(eq(usersTable.id, id))
      .returning();
    res.json({ user: publicUser(updated!) });
  } catch (err) {
    next(err);
  }
});

router.delete("/admin/users/:id", requireAuth("admin"), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      res.status(400).json({ error: "Invalid team member" });
      return;
    }
    if (id === req.user!.id) {
      res.status(400).json({ error: "You can't remove your own account while signed in as it" });
      return;
    }
    const [target] = await db.select().from(usersTable).where(eq(usersTable.id, id));
    if (!target) {
      res.status(404).json({ error: "Team member not found" });
      return;
    }
    if (target.role === "admin" && target.active && (await activeAdminCount(target.id)) === 0) {
      res.status(400).json({ error: "Can't remove the last remaining admin" });
      return;
    }
    await db.delete(usersTable).where(eq(usersTable.id, id));
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

/** Dashboard metrics (FR-035). */
router.get("/admin/dashboard", requireAuth("admin"), async (_req, res, next) => {
  try {
    const event = await currentEvent();
    if (!event) {
      res.status(404).json({ error: "No event configured" });
      return;
    }
    const invitations = await db
      .select()
      .from(invitationsTable)
      .where(eq(invitationsTable.eventId, event.id));
    const [checkinAgg] = await db
      .select({
        total: sql<number>`coalesce(sum(${checkinsTable.count}), 0)`,
        overrides: sql<number>`coalesce(sum(case when ${checkinsTable.isOverride} then ${checkinsTable.count} else 0 end), 0)`,
      })
      .from(checkinsTable)
      .where(eq(checkinsTable.eventId, event.id));
    const [pendingUploads] = await db
      .select({ count: sql<number>`count(*)` })
      .from(memoryUploadsTable)
      .where(
        and(
          eq(memoryUploadsTable.eventId, event.id),
          eq(memoryUploadsTable.status, "pending"),
        ),
      );
    const [pendingMessages] = await db
      .select({ count: sql<number>`count(*)` })
      .from(guestbookMessagesTable)
      .where(
        and(
          eq(guestbookMessagesTable.eventId, event.id),
          eq(guestbookMessagesTable.status, "pending"),
        ),
      );
    const [totalUploads] = await db
      .select({ count: sql<number>`count(*)` })
      .from(memoryUploadsTable)
      .where(eq(memoryUploadsTable.eventId, event.id));
    const [totalMessages] = await db
      .select({ count: sql<number>`count(*)` })
      .from(guestbookMessagesTable)
      .where(eq(guestbookMessagesTable.eventId, event.id));

    const confirmed = invitations.filter((i) => i.rsvpStatus === "confirmed");
    res.json({
      event,
      metrics: {
        totalInvitations: invitations.length,
        confirmed: confirmed.length,
        declined: invitations.filter((i) => i.rsvpStatus === "declined").length,
        pending: invitations.filter((i) => i.rsvpStatus === "pending").length,
        expectedGuests: confirmed.reduce(
          (sum, i) => sum + (i.rsvpCount ?? i.allowedCount),
          0,
        ),
        invitedGuests: invitations.reduce((sum, i) => sum + i.allowedCount, 0),
        checkedIn: Number(checkinAgg?.total ?? 0),
        overrideGuests: Number(checkinAgg?.overrides ?? 0),
        pendingModeration:
          Number(pendingUploads?.count ?? 0) +
          Number(pendingMessages?.count ?? 0),
        totalUploads: Number(totalUploads?.count ?? 0),
        totalMessages: Number(totalMessages?.count ?? 0),
      },
    });
  } catch (err) {
    next(err);
  }
});

const eventPatchSchema = z.object({
  status: z.enum(["draft", "live", "archived"]).optional(),
  autoApprove: z.boolean().optional(),
  guestbookPublic: z.boolean().optional(),
  enableEnglish: z.boolean().optional(),
  enableArabic: z.boolean().optional(),
  tablesEnabled: z.boolean().optional(),
  uploadsEnabled: z.boolean().optional(),
  maxUploadsPerGuest: z.number().int().min(1).max(20).optional(),
  welcomeMessage: z.string().max(1000).nullable().optional(),
  thankYouMessage: z.string().max(1000).nullable().optional(),
  venueMapUrl: z.string().max(500).nullable().optional(),
  // Couple-editable invitation layout/copy/backgrounds; stored as JSON text.
  invitationConfig: z.unknown().optional(),
});

/** Event settings incl. after-wedding archive mode (FR-033). */
router.patch("/admin/event", requireAuth("admin"), async (req, res, next) => {
  try {
    const parsed = eventPatchSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid event settings" });
      return;
    }
    const event = await currentEvent();
    if (!event) {
      res.status(404).json({ error: "No event configured" });
      return;
    }
    const nextEnableEnglish = parsed.data.enableEnglish ?? event.enableEnglish;
    const nextEnableArabic = parsed.data.enableArabic ?? event.enableArabic;
    if (!nextEnableEnglish && !nextEnableArabic) {
      res.status(400).json({ error: "At least one language must stay enabled" });
      return;
    }
    const { invitationConfig, ...rest } = parsed.data;
    const patch: Record<string, unknown> = { ...rest };
    if (invitationConfig !== undefined) {
      const serialized =
        invitationConfig === null ? null : JSON.stringify(invitationConfig);
      if (serialized && serialized.length > 100_000) {
        res.status(400).json({ error: "Invitation configuration is too large" });
        return;
      }
      patch.invitationConfig = serialized;
    }
    const [updated] = await db
      .update(eventsTable)
      .set(patch)
      .where(eq(eventsTable.id, event.id))
      .returning();
    if (parsed.data.tablesEnabled === false) {
      await db
        .update(invitationsTable)
        .set({ tableId: null })
        .where(eq(invitationsTable.eventId, event.id));
    }
    res.json({ event: updated });
  } catch (err) {
    next(err);
  }
});

/** Guest list with live check-in totals (FR-011). Optionally scoped to
 * whoever added each guest via ?createdBy=me|<userId>. */
router.get(
  "/admin/invitations",
  requireAuth("admin"),
  async (req, res, next) => {
    try {
      const createdByParam = req.query["createdBy"];
      const conditions = [];
      if (typeof createdByParam === "string" && createdByParam.length > 0) {
        const creatorId =
          createdByParam === "me" ? req.user!.id : Number(createdByParam);
        if (Number.isInteger(creatorId)) {
          conditions.push(eq(invitationsTable.createdByUserId, creatorId));
        }
      }
      const rows = await db
        .select({
          invitation: invitationsTable,
          tableName: tablesTable.name,
          createdByName: usersTable.name,
          checkedIn: sql<number>`coalesce((select sum(${checkinsTable.count}) from ${checkinsTable} where ${checkinsTable.invitationId} = ${invitationsTable.id}), 0)`,
        })
        .from(invitationsTable)
        .leftJoin(tablesTable, eq(invitationsTable.tableId, tablesTable.id))
        .leftJoin(usersTable, eq(invitationsTable.createdByUserId, usersTable.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(invitationsTable.guestName);
      res.json({
        invitations: rows.map((r) => ({
          ...r.invitation,
          tableName: r.tableName,
          createdByName: r.createdByName,
          checkedIn: Number(r.checkedIn),
        })),
      });
    } catch (err) {
      next(err);
    }
  },
);

const invitationCreateSchema = z.object({
  guestName: z.string().min(1).max(200),
  phone: z.string().max(30).nullable().optional(),
  allowedCount: z.number().int().min(1).max(50).default(1),
  tableId: z.number().int().nullable().optional(),
});

router.post(
  "/admin/invitations",
  requireAuth("admin"),
  async (req, res, next) => {
    try {
      const parsed = invitationCreateSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "Guest name is required" });
        return;
      }
      const event = await currentEvent();
      if (!event) {
        res.status(404).json({ error: "No event configured" });
        return;
      }
      const [created] = await db
        .insert(invitationsTable)
        .values({
          eventId: event.id,
          guestName: parsed.data.guestName,
          phone: parsed.data.phone ?? null,
          allowedCount: parsed.data.allowedCount,
          tableId: event.tablesEnabled ? (parsed.data.tableId ?? null) : null,
          token: generateToken(),
          createdByUserId: req.user!.id,
        })
        .returning();
      res.status(201).json({ invitation: created });
    } catch (err) {
      next(err);
    }
  },
);

/** Bulk import from CSV rows parsed client-side (FR-008). */
router.post(
  "/admin/invitations/import",
  requireAuth("admin"),
  async (req, res, next) => {
    try {
      const rowsSchema = z.array(
        z.object({
          guestName: z.string().min(1).max(200),
          phone: z.string().max(30).optional(),
          allowedCount: z.coerce.number().int().min(1).max(50).default(1),
          tableName: z.string().max(100).optional(),
        }),
      );
      const parsed = rowsSchema.safeParse(req.body?.rows);
      if (!parsed.success || parsed.data.length === 0) {
        res.status(400).json({ error: "No valid rows to import" });
        return;
      }
      const event = await currentEvent();
      if (!event) {
        res.status(404).json({ error: "No event configured" });
        return;
      }
      const tables = await db
        .select()
        .from(tablesTable)
        .where(eq(tablesTable.eventId, event.id));
      const byName = new Map(
        tables.map((t) => [t.name.trim().toLowerCase(), t.id]),
      );
      const created = await db
        .insert(invitationsTable)
        .values(
          parsed.data.map((row) => ({
            eventId: event.id,
            guestName: row.guestName,
            phone: row.phone ?? null,
            allowedCount: row.allowedCount,
            tableId: event.tablesEnabled && row.tableName
              ? (byName.get(row.tableName.trim().toLowerCase()) ?? null)
              : null,
            token: generateToken(),
            createdByUserId: req.user!.id,
          })),
        )
        .returning();
      res.status(201).json({ imported: created.length });
    } catch (err) {
      next(err);
    }
  },
);

const invitationPatchSchema = z.object({
  guestName: z.string().min(1).max(200).optional(),
  phone: z.string().max(30).nullable().optional(),
  allowedCount: z.number().int().min(1).max(50).optional(),
  tableId: z.number().int().nullable().optional(),
  status: z.enum(["active", "cancelled"]).optional(),
  rsvpStatus: z.enum(["pending", "confirmed", "declined"]).optional(),
});

router.patch(
  "/admin/invitations/:id",
  requireAuth("admin"),
  async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const parsed = invitationPatchSchema.safeParse(req.body);
      if (!Number.isInteger(id) || !parsed.success) {
        res.status(400).json({ error: "Invalid update" });
        return;
      }
      const event = await currentEvent();
      const patch = { ...parsed.data };
      if (patch.tableId !== undefined && !event?.tablesEnabled) {
        patch.tableId = null;
      }
      const [updated] = await db
        .update(invitationsTable)
        .set(patch)
        .where(eq(invitationsTable.id, id))
        .returning();
      if (!updated) {
        res.status(404).json({ error: "Invitation not found" });
        return;
      }
      res.json({ invitation: updated });
    } catch (err) {
      next(err);
    }
  },
);

router.delete(
  "/admin/invitations/:id",
  requireAuth("admin"),
  async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      await db.delete(checkinsTable).where(eq(checkinsTable.invitationId, id));
      await db.delete(invitationsTable).where(eq(invitationsTable.id, id));
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
);

/** Tables CRUD (FR-019, FR-021). */
router.get("/admin/tables", requireAuth("admin"), async (_req, res, next) => {
  try {
    const rows = await db
      .select({
        table: tablesTable,
        assigned: sql<number>`coalesce((select sum(${invitationsTable.allowedCount}) from ${invitationsTable} where ${invitationsTable.tableId} = ${tablesTable.id} and ${invitationsTable.status} = 'active'), 0)`,
      })
      .from(tablesTable)
      .orderBy(tablesTable.id);
    res.json({
      tables: rows.map((r) => ({ ...r.table, assigned: Number(r.assigned) })),
    });
  } catch (err) {
    next(err);
  }
});

const tableCreateSchema = z.object({
  name: z.string().min(1).max(100),
  capacity: z.number().int().min(1).max(100).default(10),
  notes: z.string().max(300).nullable().optional(),
});

router.post("/admin/tables", requireAuth("admin"), async (req, res, next) => {
  try {
    const parsed = tableCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Table name is required" });
      return;
    }
    const event = await currentEvent();
    if (!event) {
      res.status(404).json({ error: "No event configured" });
      return;
    }
    const [created] = await db
      .insert(tablesTable)
      .values({
        eventId: event.id,
        name: parsed.data.name,
        capacity: parsed.data.capacity,
        notes: parsed.data.notes ?? null,
        token: generateToken(),
      })
      .returning();
    res.status(201).json({ table: created });
  } catch (err) {
    next(err);
  }
});

router.delete(
  "/admin/tables/:id",
  requireAuth("admin"),
  async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      await db
        .update(invitationsTable)
        .set({ tableId: null })
        .where(eq(invitationsTable.tableId, id));
      await db.delete(tablesTable).where(eq(tablesTable.id, id));
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
);

/** Moderation queue: pending uploads + messages (FR-029). */
router.get(
  "/admin/moderation",
  requireAuth("moderator"),
  async (req, res, next) => {
    try {
      const status =
        typeof req.query["status"] === "string"
          ? (req.query["status"] as string)
          : "pending";
      const uploads = await db
        .select()
        .from(memoryUploadsTable)
        .where(eq(memoryUploadsTable.status, status))
        .orderBy(desc(memoryUploadsTable.createdAt));
      const messages = await db
        .select()
        .from(guestbookMessagesTable)
        .where(eq(guestbookMessagesTable.status, status))
        .orderBy(desc(guestbookMessagesTable.createdAt));
      res.json({ uploads, messages });
    } catch (err) {
      next(err);
    }
  },
);

const moderationSchema = z.object({
  type: z.enum(["upload", "message"]),
  action: z.enum(["approve", "reject", "pending"]),
});

router.post(
  "/admin/moderation/:type/:id/:action",
  requireAuth("moderator"),
  async (req, res, next) => {
    try {
      const parsed = moderationSchema.safeParse({
        type: req.params.type,
        action: req.params.action,
      });
      const id = Number(req.params.id);
      if (!parsed.success || !Number.isInteger(id)) {
        res.status(400).json({ error: "Invalid moderation action" });
        return;
      }
      const status =
        parsed.data.action === "approve"
          ? "approved"
          : parsed.data.action === "reject"
            ? "rejected"
            : "pending";
      if (parsed.data.type === "upload") {
        await db
          .update(memoryUploadsTable)
          .set({ status })
          .where(eq(memoryUploadsTable.id, id));
      } else {
        await db
          .update(guestbookMessagesTable)
          .set({ status })
          .where(eq(guestbookMessagesTable.id, id));
      }
      res.json({ ok: true, status });
    } catch (err) {
      next(err);
    }
  },
);

/** Check-in audit list (FR-018). */
router.get("/admin/checkins", requireAuth("admin"), async (_req, res, next) => {
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
      .orderBy(desc(checkinsTable.createdAt));
    res.json({ checkins: rows });
  } catch (err) {
    next(err);
  }
});

function csvEscape(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Attendance/RSVP export (FR-012, UC-012). */
router.get(
  "/admin/export/attendance",
  requireAuth("admin"),
  async (_req, res, next) => {
    try {
      const rows = await db
        .select({
          invitation: invitationsTable,
          tableName: tablesTable.name,
          checkedIn: sql<number>`coalesce((select sum(${checkinsTable.count}) from ${checkinsTable} where ${checkinsTable.invitationId} = ${invitationsTable.id}), 0)`,
          overrides: sql<number>`coalesce((select sum(case when ${checkinsTable.isOverride} then ${checkinsTable.count} else 0 end) from ${checkinsTable} where ${checkinsTable.invitationId} = ${invitationsTable.id}), 0)`,
        })
        .from(invitationsTable)
        .leftJoin(tablesTable, eq(invitationsTable.tableId, tablesTable.id))
        .orderBy(invitationsTable.guestName);
      const header =
        "Guest,Phone,Allowed,RSVP Status,RSVP Count,Table,Checked In,Extra Guests,Invitation Status";
      const lines = rows.map((r) =>
        [
          r.invitation.guestName,
          r.invitation.phone,
          r.invitation.allowedCount,
          r.invitation.rsvpStatus,
          r.invitation.rsvpCount,
          r.tableName,
          Number(r.checkedIn),
          Number(r.overrides),
          r.invitation.status,
        ]
          .map(csvEscape)
          .join(","),
      );
      const csv = [header, ...lines].join("\r\n");
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="attendance.csv"',
      );
      res.send("﻿" + csv); // BOM so Excel opens UTF-8 correctly
    } catch (err) {
      next(err);
    }
  },
);

export default router;
