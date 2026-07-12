import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { eventsTable } from "./events";
import { tablesTable } from "./tables";
import { invitationsTable } from "./invitations";

export const memoryUploadsTable = pgTable("memory_uploads", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id")
    .notNull()
    .references(() => eventsTable.id),
  tableId: integer("table_id").references(() => tablesTable.id),
  invitationId: integer("invitation_id").references(() => invitationsTable.id),
  fileUrl: text("file_url").notNull(),
  fileType: text("file_type").notNull(), // image | video | audio
  status: text("status").notNull().default("pending"), // pending | approved | rejected
  uploadedByName: text("uploaded_by_name"),
  caption: text("caption"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const guestbookMessagesTable = pgTable("guestbook_messages", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id")
    .notNull()
    .references(() => eventsTable.id),
  tableId: integer("table_id").references(() => tablesTable.id),
  invitationId: integer("invitation_id").references(() => invitationsTable.id),
  messageType: text("message_type").notNull().default("text"), // text | voice
  text: text("text"),
  fileUrl: text("file_url"),
  guestName: text("guest_name"),
  status: text("status").notNull().default("pending"), // pending | approved | rejected
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertMemoryUploadSchema = createInsertSchema(
  memoryUploadsTable,
).omit({ id: true, createdAt: true });
export const insertGuestbookMessageSchema = createInsertSchema(
  guestbookMessagesTable,
).omit({ id: true, createdAt: true });
export type MemoryUpload = typeof memoryUploadsTable.$inferSelect;
export type GuestbookMessage = typeof guestbookMessagesTable.$inferSelect;
export type InsertMemoryUpload = z.infer<typeof insertMemoryUploadSchema>;
export type InsertGuestbookMessage = z.infer<
  typeof insertGuestbookMessageSchema
>;
