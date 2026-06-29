import { Router, type IRouter } from "express";
import { db, tasksTable, specialistsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { z } from "zod";

const router: IRouter = Router();

const CreateTaskBody = z.object({
  evaluationId: z.number().int().optional(),
  specialistId: z.number().int(),
  description: z.string().min(1),
  deadline: z.string(),
});

const ListTasksQuery = z.object({
  specialistId: z.coerce.number().int().optional(),
  evaluationId: z.coerce.number().int().optional(),
});

const DeleteTaskParams = z.object({
  id: z.coerce.number().int(),
});

router.get("/tasks", requireAuth, async (req, res): Promise<void> => {
  const parsed = ListTasksQuery.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const conditions = [];
  if (parsed.data.specialistId !== undefined) {
    conditions.push(eq(tasksTable.specialistId, parsed.data.specialistId));
  }
  if (parsed.data.evaluationId !== undefined) {
    conditions.push(eq(tasksTable.evaluationId, parsed.data.evaluationId));
  }

  const tasks = conditions.length > 0
    ? await db.select().from(tasksTable).where(and(...conditions)).orderBy(tasksTable.createdAt)
    : await db.select().from(tasksTable).orderBy(tasksTable.createdAt);

  res.json(tasks.map(t => ({
    id: t.id,
    evaluationId: t.evaluationId ?? null,
    specialistId: t.specialistId,
    description: t.description,
    deadline: t.deadline,
    createdBy: t.createdBy,
    createdAt: t.createdAt.toISOString(),
  })));
});

router.post("/tasks", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const user = (req as any).user;

  const [task] = await db.insert(tasksTable).values({
    evaluationId: parsed.data.evaluationId ?? null,
    specialistId: parsed.data.specialistId,
    description: parsed.data.description,
    deadline: parsed.data.deadline,
    createdBy: user.id,
  }).returning();

  res.status(201).json({
    id: task.id,
    evaluationId: task.evaluationId ?? null,
    specialistId: task.specialistId,
    description: task.description,
    deadline: task.deadline,
    createdBy: task.createdBy,
    createdAt: task.createdAt.toISOString(),
  });
});

router.delete("/tasks/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteTaskParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  await db.delete(tasksTable).where(eq(tasksTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
