import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

async function requireAdmin(req: any, res: any, next: any) {
  const userId = req.session?.userId;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user || user.role !== "admin") { res.status(403).json({ error: "Admin only" }); return; }
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

export default router;
