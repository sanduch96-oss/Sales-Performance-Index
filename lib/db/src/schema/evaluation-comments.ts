import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { evaluationsTable } from "./evaluations";
import { usersTable } from "./users";

export const evaluationCommentsTable = pgTable("evaluation_comments", {
  id: serial("id").primaryKey(),
  evaluationId: integer("evaluation_id").notNull().references(() => evaluationsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  authorName: text("author_name").notNull(),
  authorRole: text("author_role").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type EvaluationComment = typeof evaluationCommentsTable.$inferSelect;
