import { Router, type IRouter } from "express";
import { db, criteriaSectionsTable, criteriaTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  UpdateCriteriaSectionParams,
  UpdateCriteriaSectionBody,
  UpdateCriterionParams,
  UpdateCriterionBody,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/criteria-sections", requireAuth, async (_req, res): Promise<void> => {
  const sections = await db
    .select()
    .from(criteriaSectionsTable)
    .orderBy(criteriaSectionsTable.displayOrder);

  const result = await Promise.all(
    sections.map(async (section) => {
      const criteria = await db
        .select()
        .from(criteriaTable)
        .where(eq(criteriaTable.sectionId, section.id))
        .orderBy(criteriaTable.displayOrder);

      const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);

      return {
        id: section.id,
        name: section.name,
        totalWeight: Math.round(totalWeight * 100) / 100,
        criteria: criteria.map((c) => ({
          id: c.id,
          sectionId: c.sectionId,
          name: c.name,
          weight: c.weight,
        })),
      };
    }),
  );

  res.json(result);
});

router.patch("/criteria-sections/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateCriteriaSectionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateCriteriaSectionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [section] = await db
    .update(criteriaSectionsTable)
    .set(parsed.data)
    .where(eq(criteriaSectionsTable.id, params.data.id))
    .returning();

  if (!section) {
    res.status(404).json({ error: "Section not found" });
    return;
  }

  const criteria = await db
    .select()
    .from(criteriaTable)
    .where(eq(criteriaTable.sectionId, section.id))
    .orderBy(criteriaTable.displayOrder);

  const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);

  res.json({
    id: section.id,
    name: section.name,
    totalWeight: Math.round(totalWeight * 100) / 100,
    criteria: criteria.map((c) => ({
      id: c.id,
      sectionId: c.sectionId,
      name: c.name,
      weight: c.weight,
    })),
  });
});

router.patch("/criteria/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateCriterionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateCriterionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [criterion] = await db
    .update(criteriaTable)
    .set(parsed.data)
    .where(eq(criteriaTable.id, params.data.id))
    .returning();

  if (!criterion) {
    res.status(404).json({ error: "Criterion not found" });
    return;
  }

  res.json({
    id: criterion.id,
    sectionId: criterion.sectionId,
    name: criterion.name,
    weight: criterion.weight,
  });
});

export default router;
