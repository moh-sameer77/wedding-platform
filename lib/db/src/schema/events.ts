import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const eventsTable = pgTable("events", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  coupleNames: text("couple_names").notNull(),
  dateTime: timestamp("date_time", { withTimezone: true }).notNull(),
  venueName: text("venue_name").notNull(),
  venueMapUrl: text("venue_map_url"),
  language: text("language").notNull().default("en"),
  privacyMode: text("privacy_mode").notNull().default("link"), // public | link | invitation-only
  status: text("status").notNull().default("live"), // draft | live | archived
  welcomeMessage: text("welcome_message"),
  thankYouMessage: text("thank_you_message"),
  autoApprove: boolean("auto_approve").notNull().default(false),
  guestbookPublic: boolean("guestbook_public").notNull().default(false),
  tablesEnabled: boolean("tables_enabled").notNull().default(false),
  uploadsEnabled: boolean("uploads_enabled").notNull().default(true),
  maxUploadsPerGuest: integer("max_uploads_per_guest").notNull().default(5),
  // Couple-editable invitation layout/copy/backgrounds (JSON string):
  // { sections: [{id, enabled}], texts: {key: {en, ar}}, backgrounds: {...} }
  invitationConfig: text("invitation_config"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertEventSchema = createInsertSchema(eventsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof eventsTable.$inferSelect;
