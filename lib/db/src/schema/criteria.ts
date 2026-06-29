import { pgTable, text, serial, real, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const criteriaSectionsTable = pgTable("criteria_sections", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  channel: text("channel").notNull().default("call"),
  displayOrder: integer("display_order").notNull().default(0),
});

export const criteriaTable = pgTable("criteria", {
  id: serial("id").primaryKey(),
  sectionId: integer("section_id").notNull().references(() => criteriaSectionsTable.id),
  name: text("name").notNull(),
  weight: real("weight").notNull(),
  displayOrder: integer("display_order").notNull().default(0),
});

export const insertCriteriaSectionSchema = createInsertSchema(criteriaSectionsTable).omit({ id: true });
export type InsertCriteriaSection = z.infer<typeof insertCriteriaSectionSchema>;
export type CriteriaSection = typeof criteriaSectionsTable.$inferSelect;

export const insertCriterionSchema = createInsertSchema(criteriaTable).omit({ id: true });
export type InsertCriterion = z.infer<typeof insertCriterionSchema>;
export type Criterion = typeof criteriaTable.$inferSelect;
