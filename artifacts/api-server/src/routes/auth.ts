import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  RegisterBody,
  LoginBody,
  GetMeResponse,
  RegisterResponse,
  LoginResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { sendVerificationCode, sendPasswordResetCode } from "../services/email";

declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}

const router: IRouter = Router();

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

router.post("/auth/register", async (req, res): Promise<void> => {
  const { username, password, role, email } = req.body as {
    username?: string; password?: string; role?: string; email?: string;
  };

  if (!username || username.length < 3) {
    res.status(400).json({ error: "Username must be at least 3 characters" });
    return;
  }
  if (!password || password.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters" });
    return;
  }
  if (!email || !email.includes("@")) {
    res.status(400).json({ error: "Valid email required" });
    return;
  }

  const [existingUsername] = await db.select().from(usersTable).where(eq(usersTable.username, username));
  if (existingUsername) {
    res.status(400).json({ error: "Username already taken" });
    return;
  }

  const [existingEmail] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existingEmail) {
    if (existingEmail.emailVerified) {
      res.status(400).json({ error: "Email already registered" });
      return;
    }
    // Cont neconfirmat cu același email — actualizăm datele și retrimitem codul
    const passwordHash = await bcrypt.hash(password, 10);
    const code = generateCode();
    const expiry = new Date(Date.now() + 15 * 60 * 1000);
    await db.update(usersTable)
      .set({ username, passwordHash, role: role || "evaluator", emailVerificationCode: code, emailVerificationExpiry: expiry })
      .where(eq(usersTable.id, existingEmail.id));
    try { await sendVerificationCode(email, code); } catch (err) { console.error("Email send failed:", err); }
    const devResp: any = { ok: true, email, username };
    if (process.env.NODE_ENV !== "production") devResp.devCode = code;
    res.status(201).json(devResp);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const code = generateCode();
  const expiry = new Date(Date.now() + 15 * 60 * 1000);

  await db.insert(usersTable).values({
    username,
    passwordHash,
    role: role || "evaluator",
    email,
    emailVerified: false,
    emailVerificationCode: code,
    emailVerificationExpiry: expiry,
  });

  try {
    await sendVerificationCode(email, code);
  } catch (err) {
    console.error("Email send failed:", err);
  }

  const devResp: any = { ok: true, email };
  if (process.env.NODE_ENV !== "production") devResp.devCode = code;
  res.status(201).json(devResp);
});

router.post("/auth/verify-email", async (req, res): Promise<void> => {
  const { username, code } = req.body as { username?: string; code?: string };
  if (!username || !code) {
    res.status(400).json({ error: "Username and code required" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.username, username));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (user.emailVerified) {
    req.session.userId = user.id;
    res.json(RegisterResponse.parse({ user: { id: user.id, username: user.username, role: user.role } }));
    return;
  }

  if (!user.emailVerificationCode || user.emailVerificationCode !== code) {
    res.status(400).json({ error: "Cod incorect" });
    return;
  }

  if (!user.emailVerificationExpiry || new Date() > user.emailVerificationExpiry) {
    res.status(400).json({ error: "Codul a expirat" });
    return;
  }

  await db.update(usersTable)
    .set({ emailVerified: true, emailVerificationCode: null, emailVerificationExpiry: null })
    .where(eq(usersTable.id, user.id));

  req.session.userId = user.id;
  res.json(RegisterResponse.parse({ user: { id: user.id, username: user.username, role: user.role } }));
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { username, password } = parsed.data;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.username, username));

  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  req.session.userId = user.id;
  res.json(LoginResponse.parse({ user: { id: user.id, username: user.username, role: user.role } }));
});

router.post("/auth/forgot-password", async (req, res): Promise<void> => {
  const { email } = req.body as { email?: string };
  if (!email) {
    res.status(400).json({ error: "Email required" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (!user) {
    res.json({ ok: true });
    return;
  }

  const code = generateCode();
  const expiry = new Date(Date.now() + 30 * 60 * 1000);

  await db.update(usersTable)
    .set({ passwordResetCode: code, passwordResetExpiry: expiry })
    .where(eq(usersTable.id, user.id));

  try {
    await sendPasswordResetCode(email, code);
  } catch (err) {
    console.error("Email send failed:", err);
  }

  res.json({ ok: true });
});

router.post("/auth/reset-password", async (req, res): Promise<void> => {
  const { email, code, newPassword } = req.body as {
    email?: string; code?: string; newPassword?: string;
  };

  if (!email || !code || !newPassword || newPassword.length < 6) {
    res.status(400).json({ error: "All fields required, password min 6 chars" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (!user || !user.passwordResetCode || user.passwordResetCode !== code) {
    res.status(400).json({ error: "Cod incorect" });
    return;
  }

  if (!user.passwordResetExpiry || new Date() > user.passwordResetExpiry) {
    res.status(400).json({ error: "Codul a expirat" });
    return;
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await db.update(usersTable)
    .set({ passwordHash, passwordResetCode: null, passwordResetExpiry: null })
    .where(eq(usersTable.id, user.id));

  res.json({ ok: true });
});

router.post("/auth/logout", async (req, res): Promise<void> => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

router.post("/auth/change-password", requireAuth, async (req, res): Promise<void> => {
  const { currentPassword, newPassword } = req.body as { currentPassword?: string; newPassword?: string };
  if (!currentPassword || !newPassword || newPassword.length < 4) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId!));
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    res.status(400).json({ error: "wrong_current" });
    return;
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await db.update(usersTable).set({ passwordHash }).where(eq(usersTable.id, user.id));

  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

router.get("/auth/me", async (req, res): Promise<void> => {
  if (!req.session.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId));
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  res.json(GetMeResponse.parse({ id: user.id, username: user.username, role: user.role, specialistId: user.specialistId ?? null }));
});

export default router;
