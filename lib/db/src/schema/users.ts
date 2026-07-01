import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { specialistsTable } from "./specialists";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("evaluator"),
  specialistId: integer("specialist_id").references(() => specialistsTable.id),
  lastPlainPassword: text("last_plain_password"),
  email: text("email").unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  emailVerificationCode: text("email_verification_code"),
  emailVerificationExpiry: timestamp("email_verification_expiry", { withTimezone: true }),
  passwordResetCode: text("password_reset_code"),
  passwordResetExpiry: timestamp("password_reset_expiry", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
