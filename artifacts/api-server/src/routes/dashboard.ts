import { Router, type IRouter } from "express";
import { db, evaluationsTable, criteriaSectionsTable, criteriaTable, criterionScoresTable, specialistsTable } from "@workspace/db";
import { eq, and, avg, count, lt, sql, desc } from "drizzle-orm";
import { GetRecentEvaluationsQueryParams } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

function levelToScore(level: string, weight: number): number {
  if (level === "good") return weight;
  if (level === "medium") return weight * 0.6;
  return 0;
}

router.get("/dashboard/summary", requireAuth, async (_req, res): Promise<void> => {
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonth = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, "0")}`;

  // Overall average
  const [avgRow] = await db
    .select({ avg: avg(evaluationsTable.totalScore), cnt: count(evaluationsTable.id) })
    .from(evaluationsTable)
    .where(eq(evaluationsTable.status, "finalized"));

  // This month count
  const [thisMonthRow] = await db
    .select({ cnt: count(evaluationsTable.id) })
    .from(evaluationsTable)
    .where(
      and(
        eq(evaluationsTable.status, "finalized"),
        sql`TO_CHAR(${evaluationsTable.date}::date, 'YYYY-MM') = ${thisMonth}`,
      ),
    );

  // Last month count
  const [lastMonthRow] = await db
    .select({ cnt: count(evaluationsTable.id) })
    .from(evaluationsTable)
    .where(
      and(
        eq(evaluationsTable.status, "finalized"),
        sql`TO_CHAR(${evaluationsTable.date}::date, 'YYYY-MM') = ${lastMonth}`,
      ),
    );

  // Last month avg
  const [lastMonthAvgRow] = await db
    .select({ avg: avg(evaluationsTable.totalScore) })
    .from(evaluationsTable)
    .where(
      and(
        eq(evaluationsTable.status, "finalized"),
        sql`TO_CHAR(${evaluationsTable.date}::date, 'YYYY-MM') = ${lastMonth}`,
      ),
    );

  // Section scores
  const sectionRows = await db.execute(sql`
    SELECT
      cs.id as section_id,
      cs.name as section_name,
      SUM(
        CASE
          WHEN csc.level = 'good' THEN cr.weight
          WHEN csc.level = 'medium' THEN cr.weight * 0.6
          ELSE 0
        END
      ) / NULLIF(SUM(cr.weight), 0) * 100 as avg_score
    FROM evaluations e
    JOIN criterion_scores csc ON csc.evaluation_id = e.id
    JOIN criteria cr ON cr.id = csc.criterion_id
    JOIN criteria_sections cs ON cs.id = cr.section_id
    WHERE e.status = 'finalized'
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
    (best, s) => (s.averageScore != null && (best === null || (best.averageScore ?? -1) < (s.averageScore ?? -1)) ? s : best),
    null as (typeof sections)[0] | null,
  );
  const worstSection = sections.reduce(
    (worst, s) => (s.averageScore != null && (worst === null || (worst.averageScore ?? 101) > (s.averageScore ?? 101)) ? s : worst),
    null as (typeof sections)[0] | null,
  );

  // Sum of monthly targets across all active specialists
  const activeSpecialists = await db
    .select({ monthlyTarget: specialistsTable.monthlyTarget })
    .from(specialistsTable)
    .where(eq(specialistsTable.archived, false));
  const totalMonthlyTarget = activeSpecialists.reduce((sum, s) => sum + (s.monthlyTarget ?? 0), 0);

  res.json({
    averageTeamScore: avgRow?.avg != null ? Math.round(parseFloat(String(avgRow.avg)) * 10) / 10 : null,
    averageScoreLastMonth: lastMonthAvgRow?.avg != null ? Math.round(parseFloat(String(lastMonthAvgRow.avg)) * 10) / 10 : null,
    totalEvaluations: Number(avgRow?.cnt ?? 0),
    evaluationsThisMonth: Number(thisMonthRow?.cnt ?? 0),
    evaluationsLastMonth: Number(lastMonthRow?.cnt ?? 0),
    totalMonthlyTarget,
    bestSection: bestSection?.sectionName ?? null,
    bestSectionScore: bestSection?.averageScore ?? null,
    worstSection: worstSection?.sectionName ?? null,
    worstSectionScore: worstSection?.averageScore ?? null,
    sectionScores: sections,
  });
});

router.get("/dashboard/monthly-trend", requireAuth, async (_req, res): Promise<void> => {
  const rows = await db.execute(sql`
    SELECT
      TO_CHAR(DATE_TRUNC('month', e.date::date), 'YYYY-MM') as month,
      AVG(e.total_score) as average_score,
      COUNT(e.id) as count
    FROM evaluations e
    WHERE e.status = 'finalized'
      AND e.date::date >= DATE_TRUNC('month', NOW()) - INTERVAL '23 months'
    GROUP BY DATE_TRUNC('month', e.date::date)
    ORDER BY DATE_TRUNC('month', e.date::date)
  `);

  const result = (rows.rows as Array<{ month: string; average_score: number | null; count: number }>).map((r) => ({
    month: String(r.month),
    averageScore: r.average_score != null ? Math.round(parseFloat(String(r.average_score)) * 10) / 10 : null,
    count: Number(r.count),
  }));

  res.json(result);
});

router.get("/dashboard/recent-evaluations", requireAuth, async (req, res): Promise<void> => {
  const params = GetRecentEvaluationsQueryParams.safeParse(req.query);
  const limit = (params.success && params.data.limit) ? params.data.limit : 10;

  const evaluations = await db
    .select()
    .from(evaluationsTable)
    .where(eq(evaluationsTable.status, "finalized"))
    .orderBy(desc(evaluationsTable.createdAt))
    .limit(limit);

  const result = await Promise.all(
    evaluations.map(async (e) => {
      const [specialist] = await db.select().from(specialistsTable).where(eq(specialistsTable.id, e.specialistId));
      return {
        id: e.id,
        specialistId: e.specialistId,
        specialistName: specialist ? `${specialist.firstName} ${specialist.lastName}` : "",
        evaluatorId: e.evaluatorId,
        evaluatorName: "",
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

router.get("/dashboard/low-performers", requireAuth, async (_req, res): Promise<void> => {
  // Specialists with average finalized score < 70
  const rows = await db.execute(sql`
    SELECT
      s.id,
      s.first_name,
      s.last_name,
      s.position,
      s.department,
      s.hire_date,
      s.manager,
      s.status,
      s.archived,
      s.created_at,
      AVG(e.total_score) as avg_score,
      COUNT(e.id) as eval_count
    FROM specialists s
    LEFT JOIN evaluations e ON e.specialist_id = s.id AND e.status = 'finalized'
    WHERE s.archived = false
    GROUP BY s.id, s.first_name, s.last_name, s.position, s.department, s.hire_date, s.manager, s.status, s.archived, s.created_at
    HAVING AVG(e.total_score) < 70
    ORDER BY AVG(e.total_score) ASC
  `);

  const result = (rows.rows as Array<{
    id: number; first_name: string; last_name: string; position: string; department: string;
    hire_date: string; manager: string | null; status: string; archived: boolean;
    created_at: Date; avg_score: number | null; eval_count: number;
  }>).map((r) => ({
    id: Number(r.id),
    firstName: String(r.first_name),
    lastName: String(r.last_name),
    position: String(r.position),
    department: String(r.department),
    hireDate: String(r.hire_date),
    manager: r.manager ?? null,
    status: String(r.status),
    archived: Boolean(r.archived),
    spiScore: r.avg_score != null ? Math.round(parseFloat(String(r.avg_score)) * 10) / 10 : null,
    evaluationCount: Number(r.eval_count),
    createdAt: new Date(r.created_at).toISOString(),
  }));

  res.json(result);
});

export default router;
