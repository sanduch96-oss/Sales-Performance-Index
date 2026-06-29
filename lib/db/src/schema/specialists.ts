import { pgTable, text, serial, timestamp, boolean, date, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const specialistsTable = pgTable("specialists", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  position: text("position").notNull(),
  department: text("department").notNull(),
  hireDate: date("hire_date", { mode: "string" }).notNull(),
  manager: text("manager"),
  status: text("status").notNull().default("active"),
  archived: boolean("archived").notNull().default(false),
  monthlyTarget: integer("monthly_target"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSpecialistSchema = createInsertSchema(specialistsTable).omit({ id: true, createdAt: true });
export type InsertSpecialist = z.infer<typeof insertSpecialistSchema>;
export type Specialist = typeof specialistsTable.$inferSelect;
