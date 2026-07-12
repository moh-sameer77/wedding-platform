import { Router, type IRouter } from "express";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, usersTable, sessionsTable } from "@workspace/db";
import { generateToken, verifyPassword } from "../lib/crypto";
import { requireAuth } from "../middlewares/auth";
import { createRateLimit } from "../middlewares/rate-limit";

const router: IRouter = Router();
router.use(
  createRateLimit({
    id: "auth",
    max: 20,
    windowMs: 60_000,
  }),
);

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

router.post("/auth/login", async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Username and password are required" });
      return;
    }
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.username, parsed.data.username.toLowerCase()));
    if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
      res.status(401).json({ error: "Invalid username or password" });
      return;
    }
    if (!user.active) {
      res.status(403).json({ error: "This account has been deactivated" });
      return;
    }
    const token = generateToken(24);
    await db.insert(sessionsTable).values({
      token,
      userId: user.id,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    });
    res.json({
      token,
      user: { id: user.id, name: user.name, role: user.role },
    });
  } catch (err) {
    next(err);
  }
});

router.post("/auth/logout", requireAuth(), async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
    if (token) {
      await db.delete(sessionsTable).where(eq(sessionsTable.token, token));
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.get("/auth/me", requireAuth(), (req, res) => {
  const user = req.user!;
  res.json({ user: { id: user.id, name: user.name, role: user.role } });
});

export default router;
