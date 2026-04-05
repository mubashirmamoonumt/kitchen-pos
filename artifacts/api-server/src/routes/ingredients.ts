import { Router, type IRouter } from "express";
import { eq, and, desc, sql } from "drizzle-orm";
import { db, ingredientsTable, inventoryLogsTable } from "@workspace/db";
import {
  ListIngredientsQueryParams,
  CreateIngredientBody,
  GetIngredientParams,
  UpdateIngredientParams,
  UpdateIngredientBody,
  DeleteIngredientParams,
  AdjustIngredientStockParams,
  AdjustIngredientStockBody,
  ListInventoryLogsQueryParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/ingredients/inventory-logs", requireAuth, async (req, res): Promise<void> => {
  const query = ListInventoryLogsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const conditions = [eq(inventoryLogsTable.isDeleted, false)];
  if (query.data.ingredientId) {
    conditions.push(eq(inventoryLogsTable.ingredientId, query.data.ingredientId));
  }

  const logs = await db
    .select()
    .from(inventoryLogsTable)
    .where(and(...conditions))
    .orderBy(desc(inventoryLogsTable.createdAt))
    .limit(200);

  res.json(logs);
});

router.get("/ingredients", requireAuth, async (req, res): Promise<void> => {
  const query = ListIngredientsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const conditions = [eq(ingredientsTable.isDeleted, false)];
  if (query.data.lowStock) {
    conditions.push(
      sql`${ingredientsTable.stockQuantity}::numeric <= ${ingredientsTable.lowStockThreshold}::numeric`
    );
  }

  const ingredients = await db
    .select()
    .from(ingredientsTable)
    .where(and(...conditions));

  res.json(
    ingredients.map((i) => ({
      ...i,
      isLowStock: parseFloat(i.stockQuantity) <= parseFloat(i.lowStockThreshold),
    }))
  );
});

router.post("/ingredients", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateIngredientBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [ingredient] = await db.insert(ingredientsTable).values(parsed.data).returning();
  res.status(201).json({
    ...ingredient,
    isLowStock: parseFloat(ingredient.stockQuantity) <= parseFloat(ingredient.lowStockThreshold),
  });
});

router.get("/ingredients/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetIngredientParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [ingredient] = await db
    .select()
    .from(ingredientsTable)
    .where(and(eq(ingredientsTable.id, params.data.id), eq(ingredientsTable.isDeleted, false)));
  if (!ingredient) {
    res.status(404).json({ error: "Ingredient not found" });
    return;
  }
  res.json({
    ...ingredient,
    isLowStock: parseFloat(ingredient.stockQuantity) <= parseFloat(ingredient.lowStockThreshold),
  });
});

router.patch("/ingredients/:id/adjust-stock", requireAuth, async (req, res): Promise<void> => {
  const params = AdjustIngredientStockParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = AdjustIngredientStockBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [ingredient] = await db
    .select()
    .from(ingredientsTable)
    .where(and(eq(ingredientsTable.id, params.data.id), eq(ingredientsTable.isDeleted, false)));
  if (!ingredient) {
    res.status(404).json({ error: "Ingredient not found" });
    return;
  }
  const before = parseFloat(ingredient.stockQuantity);
  const adjustment = parseFloat(parsed.data.adjustment);
  const after = Math.max(0, before + adjustment);

  const [updated] = await db
    .update(ingredientsTable)
    .set({ stockQuantity: after.toString() })
    .where(and(eq(ingredientsTable.id, params.data.id), eq(ingredientsTable.isDeleted, false)))
    .returning();

  await db.insert(inventoryLogsTable).values({
    ingredientId: ingredient.id,
    ingredientName: ingredient.name,
    quantityBefore: before.toString(),
    quantityAfter: after.toString(),
    change: adjustment.toString(),
    reason: parsed.data.reason ?? "manual adjustment",
  });

  res.json({
    ...updated,
    isLowStock: parseFloat(updated.stockQuantity) <= parseFloat(updated.lowStockThreshold),
  });
});

router.patch("/ingredients/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateIngredientParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateIngredientBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [ingredient] = await db
    .update(ingredientsTable)
    .set(parsed.data)
    .where(and(eq(ingredientsTable.id, params.data.id), eq(ingredientsTable.isDeleted, false)))
    .returning();
  if (!ingredient) {
    res.status(404).json({ error: "Ingredient not found" });
    return;
  }
  res.json({
    ...ingredient,
    isLowStock: parseFloat(ingredient.stockQuantity) <= parseFloat(ingredient.lowStockThreshold),
  });
});

router.delete("/ingredients/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteIngredientParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [ingredient] = await db
    .update(ingredientsTable)
    .set({ isDeleted: true })
    .where(and(eq(ingredientsTable.id, params.data.id), eq(ingredientsTable.isDeleted, false)))
    .returning();
  if (!ingredient) {
    res.status(404).json({ error: "Ingredient not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
