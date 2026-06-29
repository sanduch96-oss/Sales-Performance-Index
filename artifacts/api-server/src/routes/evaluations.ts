import { Router, type IRouter } from "express";
import { db, evaluationsTable, criterionScoresTable, specialistsTable, usersTable, criteriaTable, criteriaSectionsTable, notificationsTable, evaluationCommentsTable, tasksTable } from "@workspace/db";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import {
  CreateEvaluationBody,
  UpdateEvaluationBody,
  UpdateEvaluationParams,
  GetEvaluationParams,
  DeleteEvaluationParams,
  FinalizeEvaluationParams,
  AttachEvaluationAudioParams,
  AttachEvaluationAudioBody,
  ListEvaluationsQueryParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

function levelToScore(level: string, weight: number): number {
  if (level === "good") return weight;
  if (level === "medium") return weight * 0.6;
  return 0;
}

async function computeTotalScore(evaluationId: number): Promise<number | null> {
  const scores = await db
    .select({ level: criterionScoresTable.level, weight: criteriaTable.weight })
    .from(criterionScoresTable)
    .innerJoin(criteriaTable, eq(criterionScoresTable.criterionId, criteriaTable.id))
    .where(eq(criterionScoresTable.evaluationId, evaluationId));

  if (scores.length === 0) return null;

  const earned = scores.reduce((sum, s) => sum + levelToScore(s.level, s.weight), 0);
  const total = scores.reduce((sum, s) => sum + s.weight, 0);

  if (total === 0) return null;
  return Math.round((earned / total) * 1000) / 10;
}

async function buildEvaluationDetail(evaluation: typeof evaluationsTable.$inferSelect) {
  const [specialist] = await db.select().from(specialistsTable).where(eq(specialistsTable.id, evaluation.specialistId));
  const [evaluator] = await db.select().from(usersTable).where(eq(usersTable.id, evaluation.evaluatorId));

  const scoreRows = await db
    .select({
      id: criterionScoresTable.id,
      criterionId: criterionScoresTable.criterionId,
      level: criterionScoresTable.level,
      score: criterionScoresTable.score,
      comment: criterionScoresTable.comment,
      criterionName: criteriaTable.name,
      weight: criteriaTable.weight,
      sectionId: criteriaTable.sectionId,
      sectionName: criteriaSectionsTable.name,
    })
    .from(criterionScoresTable)
    .innerJoin(criteriaTable, eq(criterionScoresTable.criterionId, criteriaTable.id))
    .innerJoin(criteriaSectionsTable, eq(criteriaTable.sectionId, criteriaSectionsTable.id))
    .where(eq(criterionScoresTable.evaluationId, evaluation.id));

  // Group by section
  const sectionMap = new Map<number, { sectionId: number; sectionName: string; earned: number; total: number }>();
  for (const row of scoreRows) {
    if (!sectionMap.has(row.sectionId)) {
      sectionMap.set(row.sectionId, { sectionId: row.sectionId, sectionName: row.sectionName, earned: 0, total: 0 });
    }
    const sec = sectionMap.get(row.sectionId)!;
    sec.earned += levelToScore(row.level, row.weight);
    sec.total += row.weight;
  }

  const sectionScores = Array.from(sectionMap.values()).map((s) => ({
    sectionId: s.sectionId,
    sectionName: s.sectionName,
    averageScore: s.total > 0 ? Math.round((s.earned / s.total) * 1000) / 10 : null,
  }));

  const [tasks, comments] = await Promise.all([
    db.select().from(tasksTable).where(eq(tasksTable.evaluationId, evaluation.id)),
    db.select().from(evaluationCommentsTable)
      .where(eq(evaluationCommentsTable.evaluationId, evaluation.id))
      .orderBy(evaluationCommentsTable.createdAt),
  ]);

  return {
    id: evaluation.id,
    specialistId: evaluation.specialistId,
    specialistName: specialist ? `${specialist.firstName} ${specialist.lastName}` : "",
    evaluatorId: evaluation.evaluatorId,
    evaluatorName: evaluator ? evaluator.username : "",
    date: evaluation.date,
    time: evaluation.time,
    clientName: evaluation.clientName,
    evaluationType: evaluation.evaluationType,
    status: evaluation.status,
    specialistStatus: evaluation.specialistStatus ?? null,
    totalScore: evaluation.totalScore,
    audioUrl: evaluation.audioUrl ?? null,
    sectionScores,
    criteriaScores: scoreRows.map((r) => ({
      id: r.id,
      criterionId: r.criterionId,
      criterionName: r.criterionName,
      sectionName: r.sectionName,
      weight: r.weight,
      level: r.level,
      score: r.score,
      comment: r.comment ?? null,
    })),
    tasks: tasks.map((t) => ({
      id: t.id,
      description: t.description,
      deadline: t.deadline,
      createdAt: t.createdAt.toISOString(),
    })),
    comments: comments.map((c) => ({
      id: c.id,
      authorName: c.authorName,
      authorRole: c.authorRole,
      message: c.message,
      createdAt: c.createdAt.toISOString(),
    })),
    createdAt: evaluation.createdAt.toISOString(),
  };
}

router.get("/evaluations", requireAuth, async (req, res): Promise<void> => {
  const params = ListEvaluationsQueryParams.safeParse(req.query);

  const conditions = [];

  // If user role, restrict to their specialist's evaluations only
  const sessionUserId = (req.session as any).userId as number;
  const [currentUser] = await db.select().from(usersTable).where(eq(usersTable.id, sessionUserId));
  if (currentUser?.role === "user" && currentUser.specialistId) {
    conditions.push(eq(evaluationsTable.specialistId, currentUser.specialistId));
  }

  if (params.success) {
    if (params.data.specialistId) {
      conditions.push(eq(evaluationsTable.specialistId, params.data.specialistId));
    }
    if (params.data.status) {
      conditions.push(eq(evaluationsTable.status, params.data.status));
    }
    if (params.data.dateFrom) {
      conditions.push(sql`${evaluationsTable.date} >= ${params.data.dateFrom}`);
    }
    if (params.data.dateTo) {
      conditions.push(sql`${evaluationsTable.date} <= ${params.data.dateTo}`);
    }
  }

  const evaluations = await db
    .select()
    .from(evaluationsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(evaluationsTable.createdAt));

  const result = await Promise.all(
    evaluations.map(async (e) => {
      const [specialist] = await db.select().from(specialistsTable).where(eq(specialistsTable.id, e.specialistId));
      const [evaluator] = await db.select().from(usersTable).where(eq(usersTable.id, e.evaluatorId));
      return {
        id: e.id,
        specialistId: e.specialistId,
        specialistName: specialist ? `${specialist.firstName} ${specialist.lastName}` : "",
        evaluatorId: e.evaluatorId,
        evaluatorName: evaluator ? evaluator.username : "",
        date: e.date,
        time: e.time,
        clientName: e.clientName,
        evaluationType: e.evaluationType,
        status: e.status,
        totalScore: e.totalScore ?? null,
        audioUrl: e.audioUrl ?? null,
        createdAt: e.createdAt.toISOString(),
      };
    }),
  );

  res.json(result);
});

router.post("/evaluations", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateEvaluationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [evaluation] = await db
    .insert(evaluationsTable)
    .values({
      specialistId: parsed.data.specialistId,
      evaluatorId: req.session.userId!,
      date: parsed.data.date,
      time: parsed.data.time,
      clientName: parsed.data.clientName,
      evaluationType: parsed.data.evaluationType,
      status: "draft",
    })
    .returning();

  const [specialist] = await db.select().from(specialistsTable).where(eq(specialistsTable.id, evaluation.specialistId));
  const [evaluator] = await db.select().from(usersTable).where(eq(usersTable.id, evaluation.evaluatorId));

  res.status(201).json({
    id: evaluation.id,
    specialistId: evaluation.specialistId,
    specialistName: specialist ? `${specialist.firstName} ${specialist.lastName}` : "",
    evaluatorId: evaluation.evaluatorId,
    evaluatorName: evaluator ? evaluator.username : "",
    date: evaluation.date,
    time: evaluation.time,
    clientName: evaluation.clientName,
    evaluationType: evaluation.evaluationType,
    status: evaluation.status,
    totalScore: null,
    audioUrl: null,
    createdAt: evaluation.createdAt.toISOString(),
  });
});

router.get("/evaluations/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetEvaluationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [evaluation] = await db
    .select()
    .from(evaluationsTable)
    .where(eq(evaluationsTable.id, params.data.id));

  if (!evaluation) {
    res.status(404).json({ error: "Evaluation not found" });
    return;
  }

  res.json(await buildEvaluationDetail(evaluation));
});

router.patch("/evaluations/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateEvaluationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateEvaluationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db
    .select()
    .from(evaluationsTable)
    .where(eq(evaluationsTable.id, params.data.id));

  if (!existing) {
    res.status(404).json({ error: "Evaluation not found" });
    return;
  }

  // Update basic fields (only if there are fields to update beyond criteriaScores)
  const { criteriaScores, ...basicFields } = parsed.data;

  if (Object.keys(basicFields).length > 0) {
    await db
      .update(evaluationsTable)
      .set(basicFields)
      .where(eq(evaluationsTable.id, params.data.id));
  }

  // Update criterion scores if provided
  if (criteriaScores && criteriaScores.length > 0) {
    // Delete existing scores
    await db
      .delete(criterionScoresTable)
      .where(eq(criterionScoresTable.evaluationId, params.data.id));

    // Get criterion weights
    const criterionIds = criteriaScores.map((cs) => cs.criterionId);
    const criteria = await db
      .select()
      .from(criteriaTable)
      .where(inArray(criteriaTable.id, criterionIds));

    const weightMap = new Map(criteria.map((c) => [c.id, c.weight]));

    await db.insert(criterionScoresTable).values(
      criteriaScores.map((cs) => ({
        evaluationId: params.data.id,
        criterionId: cs.criterionId,
        level: cs.level,
        score: levelToScore(cs.level, weightMap.get(cs.criterionId) ?? 0),
        comment: cs.comment ?? null,
      })),
    );

    // Recompute total score
    const totalScore = await computeTotalScore(params.data.id);
    await db
      .update(evaluationsTable)
      .set({ totalScore })
      .where(eq(evaluationsTable.id, params.data.id));
  }

  const [updated] = await db
    .select()
    .from(evaluationsTable)
    .where(eq(evaluationsTable.id, params.data.id));

  res.json(await buildEvaluationDetail(updated));
});

router.delete("/evaluations/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteEvaluationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [evaluation] = await db
    .select()
    .from(evaluationsTable)
    .where(eq(evaluationsTable.id, params.data.id));

  if (!evaluation) {
    res.status(404).json({ error: "Evaluation not found" });
    return;
  }

  await db.delete(evaluationsTable).where(eq(evaluationsTable.id, params.data.id));
  res.sendStatus(204);
});

router.post("/evaluations/:id/finalize", requireAuth, async (req, res): Promise<void> => {
  const params = FinalizeEvaluationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const totalScore = await computeTotalScore(params.data.id);

  const [evaluation] = await db
    .update(evaluationsTable)
    .set({ status: "finalized", totalScore })
    .where(eq(evaluationsTable.id, params.data.id))
    .returning();

  if (!evaluation) {
    res.status(404).json({ error: "Evaluation not found" });
    return;
  }

  // Notify the specialist's linked user account
  const [specialistUser] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.specialistId, evaluation.specialistId));
  if (specialistUser) {
    await db.insert(notificationsTable).values({
      userId: specialistUser.id,
      evaluationId: evaluation.id,
    });
  }

  res.json(await buildEvaluationDetail(evaluation));
});

router.post("/evaluations/:id/agree", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const userId = (req.session as any).userId as number;

  const [evaluation] = await db.update(evaluationsTable)
    .set({ specialistStatus: "agreed" })
    .where(eq(evaluationsTable.id, id))
    .returning();
  if (!evaluation) { res.status(404).json({ error: "Not found" }); return; }

  // Notify the evaluator
  await db.insert(notificationsTable).values({
    userId: evaluation.evaluatorId,
    evaluationId: id,
  });

  // Add comment entry in conversation
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (user) {
    await db.insert(evaluationCommentsTable).values({
      evaluationId: id,
      userId,
      authorName: user.username,
      authorRole: "specialist",
      message: "✅ Sunt de acord cu evaluarea.",
    });
  }

  res.json({ ok: true });
});

router.post("/evaluations/:id/disagree", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const userId = (req.session as any).userId as number;

  const { message } = req.body as { message?: string };
  if (!message?.trim()) { res.status(400).json({ error: "Message required" }); return; }

  const [evaluation] = await db.update(evaluationsTable)
    .set({ specialistStatus: "disagreed" })
    .where(eq(evaluationsTable.id, id))
    .returning();
  if (!evaluation) { res.status(404).json({ error: "Not found" }); return; }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (user) {
    await db.insert(evaluationCommentsTable).values({
      evaluationId: id,
      userId,
      authorName: user.username,
      authorRole: "specialist",
      message: message.trim(),
    });
  }

  // Notify the evaluator
  await db.insert(notificationsTable).values({
    userId: evaluation.evaluatorId,
    evaluationId: id,
  });

  res.json({ ok: true });
});

router.post("/evaluations/:id/comments", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const userId = (req.session as any).userId as number;

  const { message } = req.body as { message?: string };
  if (!message?.trim()) { res.status(400).json({ error: "Message required" }); return; }

  const [evaluation] = await db.select().from(evaluationsTable).where(eq(evaluationsTable.id, id));
  if (!evaluation) { res.status(404).json({ error: "Not found" }); return; }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  const authorRole = user?.role === "user" ? "specialist" : "evaluator";

  await db.insert(evaluationCommentsTable).values({
    evaluationId: id,
    userId,
    authorName: user?.username ?? "Unknown",
    authorRole,
    message: message.trim(),
  });

  // Notify the other party
  if (authorRole === "evaluator") {
    const [specialistUser] = await db.select().from(usersTable)
      .where(eq(usersTable.specialistId, evaluation.specialistId));
    if (specialistUser) {
      await db.insert(notificationsTable).values({ userId: specialistUser.id, evaluationId: id });
    }
  } else {
    await db.insert(notificationsTable).values({ userId: evaluation.evaluatorId, evaluationId: id });
  }

  res.json({ ok: true });
});

router.post("/evaluations/:id/audio", requireAuth, async (req, res): Promise<void> => {
  const params = AttachEvaluationAudioParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = AttachEvaluationAudioBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [evaluation] = await db
    .update(evaluationsTable)
    .set({ audioUrl: (parsed.data as any).audioUrl })
    .where(eq(evaluationsTable.id, params.data.id))
    .returning();

  if (!evaluation) {
    res.status(404).json({ error: "Evaluation not found" });
    return;
  }

  const [specialist] = await db.select().from(specialistsTable).where(eq(specialistsTable.id, evaluation.specialistId));
  const [evaluator] = await db.select().from(usersTable).where(eq(usersTable.id, evaluation.evaluatorId));

  res.json({
    id: evaluation.id,
    specialistId: evaluation.specialistId,
    specialistName: specialist ? `${specialist.firstName} ${specialist.lastName}` : "",
    evaluatorId: evaluation.evaluatorId,
    evaluatorName: evaluator ? evaluator.username : "",
    date: evaluation.date,
    time: evaluation.time,
    clientName: evaluation.clientName,
    evaluationType: evaluation.evaluationType,
    status: evaluation.status,
    totalScore: evaluation.totalScore ?? null,
    audioUrl: evaluation.audioUrl ?? null,
    createdAt: evaluation.createdAt.toISOString(),
  });
});

export default router;
