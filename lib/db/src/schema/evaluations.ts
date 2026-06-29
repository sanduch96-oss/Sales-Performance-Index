import { pgTable, text, serial, timestamp, integer, real, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { specialistsTable } from "./specialists";
import { usersTable } from "./users";
import { criteriaTable } from "./criteria";

export const evaluationsTable = pgTable("evaluations", {
  id: serial("id").primaryKey(),
  specialistId: integer("specialist_id").notNull().references(() => specialistsTable.id),
  evaluatorId: integer("evaluator_id").notNull().references(() => usersTable.id),
  date: date("date", { mode: "string" }).notNull(),
  time: text("time").notNull(),
  clientName: text("client_name").notNull(),
  evaluationType: text("evaluation_type").notNull().default("call"),
  status: text("status").notNull().default("draft"),
  totalScore: real("total_score"),
  audioUrl: text("audio_url"),
  specialistStatus: text("specialist_status"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const criterionScoresTable = pgTable("criterion_scores", {
  id: serial("id").primaryKey(),
  evaluationId: integer("evaluation_id").notNull().references(() => evaluationsTable.id, { onDelete: "cascade" }),
  criterionId: integer("criterion_id").notNull().references(() => criteriaTable.id),
  level: text("level").notNull(),
  score: real("score").notNull(),
  comment: text("comment"),
});

export const insertEvaluationSchema = createInsertSchema(evaluationsTable).omit({ id: true, createdAt: true });
export type InsertEvaluation = z.infer<typeof insertEvaluationSchema>;
export type Evaluation = typeof evaluationsTable.$inferSelect;

export const insertCriterionScoreSchema = createInsertSchema(criterionScoresTable).omit({ id: true });
export type InsertCriterionScore = z.infer<typeof insertCriterionScoreSchema>;
export type CriterionScore = typeof criterionScoresTable.$inferSelect;
