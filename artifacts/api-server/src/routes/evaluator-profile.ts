import { Router, type IRouter } from "express";
import { db, usersTable, evaluationsTable, specialistsTable, evaluatorAssignmentsTable } from "@workspace/db";
import { eq, and, count, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

async function requireAdmin(req: any, res: any, next: any) {
  const userId = req.session?.userId;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user || user.role.toLowerCase() !== "admin") { res.status(403).json({ error: "Admin only" }); return; }
  (req as any).adminId = userId;
  next();
}

// GET /api/evaluatori/:id/profile
router.get("/evaluatori/:id/profile", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [evaluator] = await db
    .select({ id: usersTable.id, username: usersTable.username, email: usersTable.email, createdAt: usersTable.createdAt })
    .from(usersTable)
    .where(and(eq(usersTable.id, id), eq(usersTable.role, "evaluator")));

  if (!evaluator) { res.status(404).json({ error: "Evaluator not found" }); return; }

  const [{ total }] = await db
    .select({ total: count() })
    .from(evaluationsTable)
    .where(eq(evaluationsTable.evaluatorId, id));

  const evaluations = await db
    .select({
      id: evaluationsTable.id,
      date: evaluationsTable.date,
      clientName: evaluationsTable.clientName,
      status: evaluationsTable.status,
      totalScore: evaluationsTable.totalScore,
      specialistFirstName: specialistsTable.firstName,
      specialistLastName: specialistsTable.lastName,
    })
    .from(evaluationsTable)
    .leftJoin(specialistsTable, eq(evaluationsTable.specialistId, specialistsTable.id))
    .where(eq(evaluationsTable.evaluatorId, id))
    .orderBy(desc(evaluationsTable.createdAt))
    .limit(50);

  const assignments = await db
    .select({
      id: evaluatorAssignmentsTable.id,
      specialistId: evaluatorAssignmentsTable.specialistId,
      specialistFirstName: specialistsTable.firstName,
      specialistLastName: specialistsTable.lastName,
      dayOfMonth: evaluatorAssignmentsTable.dayOfMonth,
      evaluationsCount: evaluatorAssignmentsTable.evaluationsCount,
    })
    .from(evaluatorAssignmentsTable)
    .leftJoin(specialistsTable, eq(evaluatorAssignmentsTable.specialistId, specialistsTable.id))
    .where(eq(evaluatorAssignmentsTable.evaluatorId, id));

  res.json({ evaluator: { ...evaluator, totalEvaluations: Number(total) }, evaluations, assignments });
});

// GET /api/specialists/list — lightweight list for assignment dropdown
router.get("/specialists/list", requireAuth, requireAdmin, async (_req, res): Promise<void> => {
  const specialists = await db
    .select({ id: specialistsTable.id, firstName: specialistsTable.firstName, lastName: specialistsTable.lastName, position: specialistsTable.position })
    .from(specialistsTable)
    .where(eq(specialistsTable.archived, false));
  res.json(specialists);
});

// POST /api/evaluatori/:id/assignments
router.post("/evaluatori/:id/assignments", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const evaluatorId = parseInt(String(req.params.id), 10);
  if (isNaN(evaluatorId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { specialistId, dayOfMonth, evaluationsCount } = req.body as {
    specialistId?: number; dayOfMonth?: number; evaluationsCount?: number;
  };

  if (!specialistId || !dayOfMonth || dayOfMonth < 1 || dayOfMonth > 31 || !evaluationsCount || evaluationsCount < 1) {
    res.status(400).json({ error: "specialistId, dayOfMonth (1-31), evaluationsCount (≥1) sunt obligatorii" });
    return;
  }

  const adminId = (req as any).adminId;

  const [existing] = await db
    .select({ id: evaluatorAssignmentsTable.id })
    .from(evaluatorAssignmentsTable)
    .where(and(eq(evaluatorAssignmentsTable.evaluatorId, evaluatorId), eq(evaluatorAssignmentsTable.specialistId, specialistId)));

  if (existing) {
    await db
      .update(evaluatorAssignmentsTable)
      .set({ dayOfMonth, evaluationsCount, updatedAt: new Date() })
      .where(eq(evaluatorAssignmentsTable.id, existing.id));
    res.json({ ok: true, updated: true });
  } else {
    await db.insert(evaluatorAssignmentsTable).values({ evaluatorId, specialistId, dayOfMonth, evaluationsCount, createdBy: adminId });
    res.json({ ok: true, created: true });
  }
});

// DELETE /api/evaluatori/:id/assignments/:assignmentId
router.delete("/evaluatori/:id/assignments/:assignmentId", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const assignmentId = parseInt(String(req.params.assignmentId), 10);
  if (isNaN(assignmentId)) { res.status(400).json({ error: "Invalid id" }); return; }

  await db.delete(evaluatorAssignmentsTable).where(eq(evaluatorAssignmentsTable.id, assignmentId));
  res.json({ ok: true });
});

export default router;
