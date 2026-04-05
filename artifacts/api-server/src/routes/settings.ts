import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db, appSettingsTable, usersTable } from "@workspace/db";
import {
  UpdateSettingsBody,
  CreateUserBody,
  UpdateUserParams,
  UpdateUserBody,
  DeleteUserParams,
} from "@workspace/api-zod";
import { requireAuth, requireOwner } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/settings", requireAuth, requireOwner, async (_req, res): Promise<void> => {
  const settings = await db
    .select()
    .from(appSettingsTable)
    .where(eq(appSettingsTable.isDeleted, false));
  const map: Record<string, string> = {};
  for (const s of settings) {
    map[s.key] = s.value;
  }
  res.json(map);
});

router.patch("/settings", requireAuth, requireOwner, async (req, res): Promise<void> => {
  const parsed = UpdateSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  for (const [key, value] of Object.entries(parsed.data)) {
    const [existing] = await db
      .select()
      .from(appSettingsTable)
      .where(and(eq(appSettingsTable.key, key), eq(appSettingsTable.isDeleted, false)));

    if (existing) {
      await db
        .update(appSettingsTable)
        .set({ value })
        .where(eq(appSettingsTable.key, key));
    } else {
      await db.insert(appSettingsTable).values({ key, value });
    }
  }

  const settings = await db
    .select()
    .from(appSettingsTable)
    .where(eq(appSettingsTable.isDeleted, false));
  const map: Record<string, string> = {};
  for (const s of settings) {
    map[s.key] = s.value;
  }
  res.json(map);
});

router.get("/settings/users", requireAuth, requireOwner, async (_req, res): Promise<void> => {
  const users = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.isDeleted, false));

  res.json(
    users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      createdAt: u.createdAt,
    }))
  );
});

router.post("/settings/users", requireAuth, requireOwner, async (req, res): Promise<void> => {
  const parsed = CreateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const [user] = await db
    .insert(usersTable)
    .values({
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
      role: parsed.data.role,
    })
    .returning();

  res.status(201).json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  });
});

router.patch("/settings/users/:id", requireAuth, requireOwner, async (req, res): Promise<void> => {
  const params = UpdateUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.name) updateData.name = parsed.data.name;
  if (parsed.data.email) updateData.email = parsed.data.email;
  if (parsed.data.role) updateData.role = parsed.data.role;
  if (parsed.data.password) {
    updateData.passwordHash = await bcrypt.hash(parsed.data.password, 10);
  }

  const [user] = await db
    .update(usersTable)
    .set(updateData)
    .where(eq(usersTable.id, params.data.id))
    .returning();

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  });
});

router.delete("/settings/users/:id", requireAuth, requireOwner, async (req, res): Promise<void> => {
  const params = DeleteUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [user] = await db
    .update(usersTable)
    .set({ isDeleted: true })
    .where(eq(usersTable.id, params.data.id))
    .returning();
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
