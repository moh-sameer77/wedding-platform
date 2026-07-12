import {
  db,
  eventsTable,
  usersTable,
  invitationsTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import { generateToken, hashPassword } from "./crypto";
import { logger } from "./logger";

/**
 * Idempotent bootstrap for the pilot wedding: creates the event, the
 * admin/guard accounts, sample tables and sample invitations on first run.
 */
export async function ensureSeedData(): Promise<void> {
  const [existingEvent] = await db.select().from(eventsTable).limit(1);
  let eventId: number;

  if (existingEvent) {
    eventId = existingEvent.id;
    if (!existingEvent.autoApprove) {
      await db
        .update(eventsTable)
        .set({ autoApprove: true })
        .where(eq(eventsTable.id, existingEvent.id));
    }
  } else {
    const [event] = await db
      .insert(eventsTable)
      .values({
        name: "Mohammad & Renad Wedding",
        slug: "mohammad-renad",
        coupleNames: "Mohammad & Renad",
        dateTime: new Date("2026-07-25T19:00:00+03:00"),
        venueName: "Tal Pine, Amman",
        venueMapUrl: "https://maps.google.com/?q=Tal+Pine+Amman+Jordan",
        language: "en",
        privacyMode: "link",
        status: "live",
        autoApprove: true,
        welcomeMessage:
          "With love and joy, we invite you to celebrate our wedding day with us. Your presence makes our happiness complete.",
        thankYouMessage:
          "Thank you for celebrating with us — your love and wishes made our day unforgettable.",
      })
      .returning();
    eventId = event!.id;
    logger.info({ eventId }, "Seeded pilot event");
  }

  const users = await db.select().from(usersTable).limit(1);
  if (users.length === 0) {
    await db.insert(usersTable).values([
      {
        username: "admin",
        name: "Event Admin",
        passwordHash: hashPassword(process.env.ADMIN_PASSWORD || "admin2026"),
        role: "admin",
      },
      {
        username: "guard",
        name: "Entrance Guard",
        passwordHash: hashPassword(process.env.GUARD_PASSWORD || "guard2026"),
        role: "guard",
      },
    ]);
    logger.info("Seeded admin and guard accounts");
  }

  const invitations = await db.select().from(invitationsTable).limit(1);
  if (invitations.length === 0) {
    await db.insert(invitationsTable).values([
      {
        eventId,
        guestName: "Ahmad Family",
        phone: "+962790000001",
        allowedCount: 4,
        token: generateToken(),
      },
      {
        eventId,
        guestName: "Sara & Omar",
        phone: "+962790000002",
        allowedCount: 2,
        token: generateToken(),
      },
      {
        eventId,
        guestName: "Khaled",
        phone: "+962790000003",
        allowedCount: 1,
        token: generateToken(),
      },
    ]);
    logger.info("Seeded sample invitations");
  }
}
