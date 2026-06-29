import { Router, type IRouter } from "express";
import { db, specialistsTable, evaluationsTable, criteriaSectionsTable, criteriaTable, criterionScoresTable } from "@workspace/db";
import { eq, and, avg, count, isNull, sql } from "drizzle-orm";
import {
  CreateSpecialistBody,
  UpdateSpecialistBody,
  UpdateSpecialistParams,
  GetSpecialistParams,
  DeleteSpecialistParams,
  ArchiveSpecialistParams,
  ArchiveSpecialistBody,
  GetSpecialistStatsParams,
  ListSpecialistsQueryParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/specialists", requireAuth, async (req, res): Promise<void> => {
  const params = ListSpecialistsQueryParams.safeParse(req.query);
  const archived = params.success && params.data.archived === true;

  const specialists = await db
    .select()
    .from(specialistsTable)
    .where(eq(specialistsTable.archived, archived));

  // Compute SPI score and evaluation count for each specialist
  const result = await Promise.all(
    specialists.map(async (s) => {
      const [row] = await db
        .select({
          avgScore: avg(evaluationsTable.totalScore),
          cnt: count(evaluationsTable.id),
        })
        .from(evaluationsTable)
        .where(
          and(
            eq(evaluationsTable.specialistId, s.id),
            eq(evaluationsTable.status, "finalized"),
          ),
        );

      return {
        id: s.id,
        firstName: s.firstName,
        lastName: s.lastName,
        position: s.position,
        department: s.department,
        hireDate: s.hireDate,
        manager: s.manager ?? null,
        status: s.status,
        archived: s.archived,
        spiScore: row?.avgScore != null ? parseFloat(String(row.avgScore)) : null,
        evaluationCount: Number(row?.cnt ?? 0),
        createdAt: s.createdAt.toISOString(),
      };
    }),
  );

  res.json(result);
});

router.post("/specialists", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateSpecialistBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [specialist] = await db
    .insert(specialistsTable)
    .values({
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      position: parsed.data.position,
      department: parsed.data.department,
      hireDate: parsed.data.hireDate,
      manager: parsed.data.manager ?? null,
      status: parsed.data.status,
    })
    .returning();

  res.status(201).json({
    id: specialist.id,
    firstName: specialist.firstName,
    lastName: specialist.lastName,
    position: specialist.position,
    department: specialist.department,
    hireDate: specialist.hireDate,
    manager: specialist.manager ?? null,
    status: specialist.status,
    archived: specialist.archived,
    spiScore: null,
    evaluationCount: 0,
    createdAt: specialist.createdAt.toISOString(),
  });
});

router.get("/specialists/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetSpecialistParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [s] = await db
    .select()
    .from(specialistsTable)
    .where(eq(specialistsTable.id, params.data.id));

  if (!s) {
    res.status(404).json({ error: "Specialist not found" });
    return;
  }

  const [row] = await db
    .select({ avgScore: avg(evaluationsTable.totalScore), cnt: count(evaluationsTable.id) })
    .from(evaluationsTable)
    .where(and(eq(evaluationsTable.specialistId, s.id), eq(evaluationsTable.status, "finalized")));

  res.json({
    id: s.id,
    firstName: s.firstName,
    lastName: s.lastName,
    position: s.position,
    department: s.department,
    hireDate: s.hireDate,
    manager: s.manager ?? null,
    status: s.status,
    archived: s.archived,
    spiScore: row?.avgScore != null ? parseFloat(String(row.avgScore)) : null,
    evaluationCount: Number(row?.cnt ?? 0),
    createdAt: s.createdAt.toISOString(),
  });
});

router.patch("/specialists/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateSpecialistParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateSpecialistBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [s] = await db
    .update(specialistsTable)
    .set(parsed.data)
    .where(eq(specialistsTable.id, params.data.id))
    .returning();

  if (!s) {
    res.status(404).json({ error: "Specialist not found" });
    return;
  }

  const [row] = await db
    .select({ avgScore: avg(evaluationsTable.totalScore), cnt: count(evaluationsTable.id) })
    .from(evaluationsTable)
    .where(and(eq(evaluationsTable.specialistId, s.id), eq(evaluationsTable.status, "finalized")));

  res.json({
    id: s.id,
    firstName: s.firstName,
    lastName: s.lastName,
    position: s.position,
    department: s.department,
    hireDate: s.hireDate,
    manager: s.manager ?? null,
    status: s.status,
    archived: s.archived,
    spiScore: row?.avgScore != null ? parseFloat(String(row.avgScore)) : null,
    evaluationCount: Number(row?.cnt ?? 0),
    createdAt: s.createdAt.toISOString(),
  });
});

router.delete("/specialists/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteSpecialistParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  await db.delete(specialistsTable).where(eq(specialistsTable.id, params.data.id));
  res.sendStatus(204);
});

router.patch("/specialists/:id/archive", requireAuth, async (req, res): Promise<void> => {
  const params = ArchiveSpecialistParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = ArchiveSpecialistBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [s] = await db
    .update(specialistsTable)
    .set({ archived: parsed.data.archived })
    .where(eq(specialistsTable.id, params.data.id))
    .returning();

  if (!s) {
    res.status(404).json({ error: "Specialist not found" });
    return;
  }

  const [row] = await db
    .select({ avgScore: avg(evaluationsTable.totalScore), cnt: count(evaluationsTable.id) })
    .from(evaluationsTable)
    .where(and(eq(evaluationsTable.specialistId, s.id), eq(evaluationsTable.status, "finalized")));

  res.json({
    id: s.id,
    firstName: s.firstName,
    lastName: s.lastName,
    position: s.position,
    department: s.department,
    hireDate: s.hireDate,
    manager: s.manager ?? null,
    status: s.status,
    archived: s.archived,
    spiScore: row?.avgScore != null ? parseFloat(String(row.avgScore)) : null,
    evaluationCount: Number(row?.cnt ?? 0),
    createdAt: s.createdAt.toISOString(),
  });
});

router.get("/specialists/:id/stats", requireAuth, async (req, res): Promise<void> => {
  const params = GetSpecialistStatsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const specialistId = params.data.id;

  const [avgRow] = await db
    .select({ avgScore: avg(evaluationsTable.totalScore), cnt: count(evaluationsTable.id) })
    .from(evaluationsTable)
    .where(and(eq(evaluationsTable.specialistId, specialistId), eq(evaluationsTable.status, "finalized")));

  // Monthly trend (last 6 months)
  const monthlyRows = await db.execute(sql`
    SELECT
      TO_CHAR(DATE_TRUNC('month', e.date::date), 'YYYY-MM') as month,
      AVG(e.total_score) as average_score,
      COUNT(e.id) as count
    FROM evaluations e
    WHERE e.specialist_id = ${specialistId}
      AND e.status = 'finalized'
      AND e.date::date >= DATE_TRUNC('month', NOW()) - INTERVAL '5 months'
    GROUP BY DATE_TRUNC('month', e.date::date)
    ORDER BY DATE_TRUNC('month', e.date::date)
  `);

  // Section scores
  const sectionRows = await db.execute(sql`
    SELECT
      cs.id as section_id,
      cs.name as section_name,
      AVG(
        CASE
          WHEN csc.level = 'good' THEN cr.weight
          WHEN csc.level = 'medium' THEN cr.weight * 0.6
          ELSE 0
        END
      ) / MAX(cs_total.total_weight) * 100 as avg_score
    FROM evaluations e
    JOIN criterion_scores csc ON csc.evaluation_id = e.id
    JOIN criteria cr ON cr.id = csc.criterion_id
    JOIN criteria_sections cs ON cs.id = cr.section_id
    JOIN (
      SELECT section_id, SUM(weight) as total_weight
      FROM criteria
      GROUP BY section_id
    ) cs_total ON cs_total.section_id = cs.id
    WHERE e.specialist_id = ${specialistId}
      AND e.status = 'finalized'
    GROUP BY cs.id, cs.name
    ORDER BY cs.id
  `);

  const sections = (sectionRows.rows as Array<{ section_id: number; section_name: string; avg_score: number | null }>)
    .map((r) => ({
      sectionId: Number(r.section_id),
      sectionName: String(r.section_name),
      averageScore: r.avg_score != null ? Math.round(parseFloat(String(r.avg_score)) * 10) / 10 : null,
    }));

  const bestSection = sections.reduce(
    (best, s) =>
      s.averageScore != null && (best === null || (best.averageScore ?? -1) < (s.averageScore ?? -1)) ? s : best,
    null as (typeof sections)[0] | null,
  );

  const worstSection = sections.reduce(
    (worst, s) =>
      s.averageScore != null && (worst === null || (worst.averageScore ?? 101) > (s.averageScore ?? 101)) ? s : worst,
    null as (typeof sections)[0] | null,
  );

  const monthlyTrend = (monthlyRows.rows as Array<{ month: string; average_score: number | null; count: number }>).map(
    (r) => ({
      month: String(r.month),
      averageScore: r.average_score != null ? Math.round(parseFloat(String(r.average_score)) * 10) / 10 : null,
      count: Number(r.count),
    }),
  );

  const radarData = sections.map((s) => ({
    subject: s.sectionName,
    score: s.averageScore ?? 0,
    fullMark: 100,
  }));

  res.json({
    specialistId,
    averageScore: avgRow?.avgScore != null ? Math.round(parseFloat(String(avgRow.avgScore)) * 10) / 10 : null,
    evaluationCount: Number(avgRow?.cnt ?? 0),
    bestSection: bestSection?.sectionName ?? null,
    worstSection: worstSection?.sectionName ?? null,
    monthlyTrend,
    sectionScores: sections,
    radarData,
  });
});

export default router;
