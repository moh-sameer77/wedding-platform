import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { eventsTable } from "./events";
import { tablesTable } from "./tables";
import { usersTable } from "./users";

export const invitationsTable = pgTable("invitations", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id")
    .notNull()
    .references(() => eventsTable.id),
  guestName: text("guest_name").notNull(),
  phone: text("phone"),
  allowedCount: integer("allowed_count").notNull().default(1),
  rsvpStatus: text("rsvp_status").notNull().default("pending"), // pending | confirmed | declined
  rsvpCount: integer("rsvp_count"),
  rsvpNote: text("rsvp_note"),
  tableId: integer("table_id").references(() => tablesTable.id),
  token: text("token").notNull().unique(),
  status: text("status").notNull().default("active"), // active | cancelled
  messageSent: boolean("message_sent").notNull().default(false),
  createdByUserId: integer("created_by_user_id").references(
    () => usersTable.id,
    { onDelete: "set null" },
  ),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const checkinsTable = pgTable("checkins", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id")
    .notNull()
    .references(() => eventsTable.id),
  invitationId: integer("invitation_id")
    .notNull()
    .references(() => invitationsTable.id),
  count: integer("count").notNull(),
  scannedByUserId: integer("scanned_by_user_id").references(
    () => usersTable.id,
    { onDelete: "set null" },
  ),
  isOverride: boolean("is_override").notNull().default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertInvitationSchema = createInsertSchema(
  invitationsTable,
).omit({ id: true, createdAt: true });
export type InsertInvitation = z.infer<typeof insertInvitationSchema>;
export type Invitation = typeof invitationsTable.$inferSelect;
export type CheckIn = typeof checkinsTable.$inferSelect;
