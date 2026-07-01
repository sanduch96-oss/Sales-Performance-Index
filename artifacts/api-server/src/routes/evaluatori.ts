import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

function removeDiacritics(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[șş]/g, "s")
    .replace(/[țţ]/g, "t")
    .replace(/[ăâ]/g, "a")
    .replace(/[î]/g, "i");
}

function generateUsername(numeComplet: string): string {
  const parts = removeDiacritics(numeComplet.trim().toLowerCase()).split(/\s+/);
  if (parts.length === 1) return parts[0];
  const [first, ...rest] = parts;
  return `${first}.${rest.join(".")}`;
}

function generatePassword(length = 10): string {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let pass = "";
  for (let i = 0; i < length; i++) {
    pass += chars[Math.floor(Math.random() * chars.length)];
  }
  return pass;
}

async function requireAdmin(req: any, res: any, next: any) {
  const userId = req.session?.userId;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user || user.role !== "admin") { res.status(403).json({ error: "Admin only" }); return; }
  next();
}

router.get("/evaluatori", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const evaluatori = await db
    .select({
      id: usersTable.id,
      username: usersTable.username,
      email: usersTable.email,
      emailVerified: usersTable.emailVerified,
    })
    .from(usersTable)
    .where(eq(usersTable.role, "evaluator"));

  res.json(evaluatori);
});

router.post("/evaluatori", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const { numeComplet } = req.body as { numeComplet?: string };

  if (!numeComplet || numeComplet.trim().length < 3) {
    res.status(400).json({ error: "Nume și prenume obligatoriu (minim 3 caractere)" });
    return;
  }

  let username = generateUsername(numeComplet);
  const plainPassword = generatePassword();
  const passwordHash = await bcrypt.hash(plainPassword, 10);

  // Ensure username uniqueness
  let attempt = 0;
  while (true) {
    const candidate = attempt === 0 ? username : `${username}${attempt}`;
    const [existing] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.username, candidate));
    if (!existing) {
      username = candidate;
      break;
    }
    attempt++;
    if (attempt > 99) {
      res.status(500).json({ error: "Nu s-a putut genera un username unic" });
      return;
    }
  }

  const [newUser] = await db
    .insert(usersTable)
    .values({
      username,
      passwordHash,
      role: "evaluator",
      emailVerified: true,
      lastPlainPassword: plainPassword,
    })
    .returning({ id: usersTable.id });

  res.status(201).json({ id: newUser.id, username, password: plainPassword });
});

export default router;
