import { pgTable, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { specialistsTable } from "./specialists";

export const evaluatorAssignmentsTable = pgTable("evaluator_assignments", {
  id: serial("id").primaryKey(),
  evaluatorId: integer("evaluator_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  specialistId: integer("specialist_id").notNull().references(() => specialistsTable.id, { onDelete: "cascade" }),
  dayOfMonth: integer("day_of_month").notNull(),
  evaluationsCount: integer("evaluations_count").notNull().default(1),
  createdBy: integer("created_by").notNull().references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertEvaluatorAssignmentSchema = createInsertSchema(evaluatorAssignmentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertEvaluatorAssignment = z.infer<typeof insertEvaluatorAssignmentSchema>;
export type EvaluatorAssignment = typeof evaluatorAssignmentsTable.$inferSelect;
