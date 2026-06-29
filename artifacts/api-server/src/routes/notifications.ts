import { Router, type IRouter } from "express";
import { db, notificationsTable, evaluationsTable, specialistsTable, usersTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/notifications", requireAuth, async (req, res): Promise<void> => {
  const userId = (req.session as any).userId as number;

  const rows = await db
    .select()
    .from(notificationsTable)
    .where(eq(notificationsTable.userId, userId))
    .orderBy(desc(notificationsTable.createdAt));

  const result = await Promise.all(
    rows.map(async (n) => {
      const [ev] = await db.select().from(evaluationsTable).where(eq(evaluationsTable.id, n.evaluationId));
      const [specialist] = ev ? await db.select().from(specialistsTable).where(eq(specialistsTable.id, ev.specialistId)) : [null];
      return {
        id: n.id,
        evaluationId: n.evaluationId,
        read: n.read,
        createdAt: n.createdAt.toISOString(),
        specialistName: specialist ? `${specialist.firstName} ${specialist.lastName}` : "",
        date: ev?.date ?? "",
        totalScore: ev?.totalScore ?? null,
      };
    }),
  );

  res.json(result);
});

router.post("/notifications/:id/read", requireAuth, async (req, res): Promise<void> => {
  const userId = (req.session as any).userId as number;
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  await db
    .update(notificationsTable)
    .set({ read: true })
    .where(and(eq(notificationsTable.id, id), eq(notificationsTable.userId, userId)));

  res.json({ ok: true });
});

router.post("/notifications/read-all", requireAuth, async (req, res): Promise<void> => {
  const userId = (req.session as any).userId as number;
  await db
    .update(notificationsTable)
    .set({ read: true })
    .where(eq(notificationsTable.userId, userId));
  res.json({ ok: true });
});

export default router;
