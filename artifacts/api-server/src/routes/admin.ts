import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();
const RESET_TOKEN = "spi-reset-2026-x9k2mP7q";

async function requireAdmin(req: any, res: any, next: any) {
  const userId = req.session?.userId;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user || user.role.toLowerCase() !== "admin") { res.status(403).json({ error: "Admin only" }); return; }
  next();
}

router.post("/admin/clear-email", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const { email } = req.body as { email?: string };
  if (!email) { res.status(400).json({ error: "email required" }); return; }

  const result = await db
    .update(usersTable)
    .set({ email: null })
    .where(eq(usersTable.email, email))
    .returning({ id: usersTable.id, username: usersTable.username });

  if (result.length === 0) {
    res.status(404).json({ error: "Email not found" });
    return;
  }

  res.json({ ok: true, cleared: result });
});

router.post("/admin/reset-users", async (req, res): Promise<void> => {
  const { token } = req.body as { token?: string };
  if (token !== RESET_TOKEN) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  await db.delete(usersTable);

  const passwordHash = await bcrypt.hash("password", 10);
  await db.insert(usersTable).values({
    username: "admin",
    passwordHash,
    role: "admin",
    emailVerified: true,
  });

  res.json({ ok: true, message: "All users deleted. Admin recreated (admin/password)." });
});

export default router;
