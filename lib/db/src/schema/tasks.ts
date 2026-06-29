import { pgTable, text, serial, timestamp, date, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { specialistsTable } from "./specialists";
import { evaluationsTable } from "./evaluations";

export const tasksTable = pgTable("tasks", {
  id: serial("id").primaryKey(),
  evaluationId: integer("evaluation_id").references(() => evaluationsTable.id),
  specialistId: integer("specialist_id").references(() => specialistsTable.id),
  description: text("description").notNull(),
  deadline: date("deadline", { mode: "string" }).notNull(),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTaskSchema = createInsertSchema(tasksTable).omit({ id: true, createdAt: true });
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasksTable.$inferSelect;
