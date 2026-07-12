import type { Request, Response, NextFunction } from "express";
import { eq, gt, and } from "drizzle-orm";
import { db, sessionsTable, usersTable, type User } from "@workspace/db";

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice(7);
  const query = req.query["session"];
  if (typeof query === "string" && query.length > 0) return query;
  return null;
}

/** Role-based auth: admins can do everything a guard/moderator can. */
export function requireAuth(...roles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = extractToken(req);
      if (!token) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }
      const [row] = await db
        .select({ user: usersTable })
        .from(sessionsTable)
        .innerJoin(usersTable, eq(sessionsTable.userId, usersTable.id))
        .where(
          and(
            eq(sessionsTable.token, token),
            gt(sessionsTable.expiresAt, new Date()),
          ),
        );
      if (!row) {
        res.status(401).json({ error: "Session expired or invalid" });
        return;
      }
      if (!row.user.active) {
        res.status(401).json({ error: "This account has been deactivated" });
        return;
      }
      if (
        roles.length > 0 &&
        !roles.includes(row.user.role) &&
        row.user.role !== "admin"
      ) {
        res.status(403).json({ error: "Insufficient permissions" });
        return;
      }
      req.user = row.user;
      next();
    } catch (err) {
      next(err);
    }
  };
}
