import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db, appSettingsTable, usersTable, discountRulesTable, ordersTable, billsTable, inventoryLogsTable, scheduledOrdersTable } from "@workspace/db";
import {
  UpdateSettingsBody,
  CreateUserBody,
  UpdateUserParams,
  UpdateUserBody,
  DeleteUserParams,
  CreateDiscountRuleBody,
  UpdateDiscountRuleParams,
  UpdateDiscountRuleBody,
  DeleteDiscountRuleParams,
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
  if (req.user && params.data.id === req.user.id) {
    res.status(400).json({ error: "You cannot delete your own account" });
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

router.get("/settings/discount-rules", requireAuth, requireOwner, async (_req, res): Promise<void> => {
  const rules = await db
    .select()
    .from(discountRulesTable)
    .where(eq(discountRulesTable.isDeleted, false))
    .orderBy(discountRulesTable.createdAt);

  res.json(rules.map((r) => ({
    id: r.id,
    name: r.name,
    type: r.type,
    discountType: r.discountType,
    amount: String(r.amount),
    minOrderValue: r.minOrderValue != null ? String(r.minOrderValue) : null,
    active: r.active,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  })));
});

router.post("/settings/discount-rules", requireAuth, requireOwner, async (req, res): Promise<void> => {
  const parsed = CreateDiscountRuleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [rule] = await db
    .insert(discountRulesTable)
    .values({
      name: parsed.data.name,
      type: parsed.data.type,
      discountType: parsed.data.discountType,
      amount: parsed.data.amount,
      minOrderValue: parsed.data.minOrderValue ?? null,
      active: parsed.data.active ?? true,
    })
    .returning();

  res.status(201).json({
    id: rule.id,
    name: rule.name,
    type: rule.type,
    discountType: rule.discountType,
    amount: String(rule.amount),
    minOrderValue: rule.minOrderValue != null ? String(rule.minOrderValue) : null,
    active: rule.active,
    createdAt: rule.createdAt,
    updatedAt: rule.updatedAt,
  });
});

router.patch("/settings/discount-rules/:id", requireAuth, requireOwner, async (req, res): Promise<void> => {
  const params = UpdateDiscountRuleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateDiscountRuleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
  if (parsed.data.type !== undefined) updateData.type = parsed.data.type;
  if (parsed.data.discountType !== undefined) updateData.discountType = parsed.data.discountType;
  if (parsed.data.amount !== undefined) updateData.amount = parsed.data.amount;
  if ("minOrderValue" in parsed.data) updateData.minOrderValue = parsed.data.minOrderValue ?? null;
  if (parsed.data.active !== undefined) updateData.active = parsed.data.active;

  const [rule] = await db
    .update(discountRulesTable)
    .set(updateData)
    .where(and(eq(discountRulesTable.id, params.data.id), eq(discountRulesTable.isDeleted, false)))
    .returning();

  if (!rule) {
    res.status(404).json({ error: "Discount rule not found" });
    return;
  }

  res.json({
    id: rule.id,
    name: rule.name,
    type: rule.type,
    discountType: rule.discountType,
    amount: String(rule.amount),
    minOrderValue: rule.minOrderValue != null ? String(rule.minOrderValue) : null,
    active: rule.active,
    createdAt: rule.createdAt,
    updatedAt: rule.updatedAt,
  });
});

router.delete("/settings/discount-rules/:id", requireAuth, requireOwner, async (req, res): Promise<void> => {
  const params = DeleteDiscountRuleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [rule] = await db
    .update(discountRulesTable)
    .set({ isDeleted: true })
    .where(and(eq(discountRulesTable.id, params.data.id), eq(discountRulesTable.isDeleted, false)))
    .returning();

  if (!rule) {
    res.status(404).json({ error: "Discount rule not found" });
    return;
  }

  res.sendStatus(204);
});

router.get("/settings/discount-rules/active", requireAuth, async (_req, res): Promise<void> => {
  const rules = await db
    .select()
    .from(discountRulesTable)
    .where(and(eq(discountRulesTable.isDeleted, false), eq(discountRulesTable.active, true)));

  res.json(rules.map((r) => ({
    id: r.id,
    name: r.name,
    type: r.type,
    discountType: r.discountType,
    amount: String(r.amount),
    minOrderValue: r.minOrderValue != null ? String(r.minOrderValue) : null,
    active: r.active,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  })));
});

router.post("/settings/clear-data", requireAuth, requireOwner, async (_req, res): Promise<void> => {
  await db.update(ordersTable).set({ isDeleted: true }).where(eq(ordersTable.isDeleted, false));
  await db.update(billsTable).set({ isDeleted: true }).where(eq(billsTable.isDeleted, false));
  await db.update(inventoryLogsTable).set({ isDeleted: true }).where(eq(inventoryLogsTable.isDeleted, false));
  await db.update(scheduledOrdersTable).set({ isDeleted: true }).where(eq(scheduledOrdersTable.isDeleted, false));
  res.json({ message: "All orders, bills, inventory logs, and scheduled orders have been cleared." });
});

export default router;
