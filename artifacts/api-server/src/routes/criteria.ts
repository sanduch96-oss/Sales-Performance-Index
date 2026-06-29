import { Router, type IRouter } from "express";
import { db, criteriaSectionsTable, criteriaTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  UpdateCriteriaSectionParams,
  UpdateCriteriaSectionBody,
  UpdateCriterionParams,
  UpdateCriterionBody,
  CreateCriteriaSectionBody,
  DeleteCriteriaSectionParams,
  CreateCriterionBody,
  DeleteCriterionParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

async function buildSectionResponse(sectionId: number) {
  const [section] = await db.select().from(criteriaSectionsTable).where(eq(criteriaSectionsTable.id, sectionId));
  if (!section) return null;
  const criteria = await db.select().from(criteriaTable).where(eq(criteriaTable.sectionId, sectionId)).orderBy(criteriaTable.displayOrder);
  const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);
  return {
    id: section.id,
    name: section.name,
    channel: section.channel,
    totalWeight: Math.round(totalWeight * 100) / 100,
    criteria: criteria.map((c) => ({ id: c.id, sectionId: c.sectionId, name: c.name, weight: c.weight })),
  };
}

router.get("/criteria-sections", requireAuth, async (req, res): Promise<void> => {
  const channel = typeof req.query.channel === "string" ? req.query.channel : undefined;
  const where = channel ? eq(criteriaSectionsTable.channel, channel) : undefined;
  const sections = where
    ? await db.select().from(criteriaSectionsTable).where(where).orderBy(criteriaSectionsTable.displayOrder)
    : await db.select().from(criteriaSectionsTable).orderBy(criteriaSectionsTable.displayOrder);

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
        channel: section.channel,
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

router.post("/criteria-sections", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateCriteriaSectionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const maxOrderResult = await db.select({ displayOrder: criteriaSectionsTable.displayOrder }).from(criteriaSectionsTable).orderBy(criteriaSectionsTable.displayOrder);
  const maxOrder = maxOrderResult.length > 0 ? Math.max(...maxOrderResult.map(r => r.displayOrder)) + 1 : 0;

  const channel = (parsed.data as any).channel ?? "call";
  const [section] = await db.insert(criteriaSectionsTable).values({ name: parsed.data.name, channel, displayOrder: maxOrder }).returning();
  res.status(201).json({ id: section.id, name: section.name, channel: section.channel, totalWeight: 0, criteria: [] });
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

  const built = await buildSectionResponse(section.id);
  res.json(built);
});

router.delete("/criteria-sections/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteCriteriaSectionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [section] = await db.select().from(criteriaSectionsTable).where(eq(criteriaSectionsTable.id, params.data.id));
  if (!section) {
    res.status(404).json({ error: "Section not found" });
    return;
  }

  await db.delete(criteriaTable).where(eq(criteriaTable.sectionId, params.data.id));
  await db.delete(criteriaSectionsTable).where(eq(criteriaSectionsTable.id, params.data.id));
  res.sendStatus(204);
});

router.post("/criteria", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateCriterionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const existing = await db.select().from(criteriaTable).where(eq(criteriaTable.sectionId, parsed.data.sectionId)).orderBy(criteriaTable.displayOrder);
  const maxOrder = existing.length > 0 ? Math.max(...existing.map(c => c.displayOrder)) + 1 : 0;

  const [criterion] = await db.insert(criteriaTable).values({
    sectionId: parsed.data.sectionId,
    name: parsed.data.name,
    weight: parsed.data.weight,
    displayOrder: maxOrder,
  }).returning();

  res.status(201).json({ id: criterion.id, sectionId: criterion.sectionId, name: criterion.name, weight: criterion.weight });
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

router.delete("/criteria/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteCriterionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [criterion] = await db.select().from(criteriaTable).where(eq(criteriaTable.id, params.data.id));
  if (!criterion) {
    res.status(404).json({ error: "Criterion not found" });
    return;
  }

  await db.delete(criteriaTable).where(eq(criteriaTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
