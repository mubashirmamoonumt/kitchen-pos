import { Router, type IRouter } from "express";
import { eq, asc, and } from "drizzle-orm";
import { db, categoriesTable } from "@workspace/db";
import {
  CreateCategoryBody,
  UpdateCategoryBody,
  GetCategoryParams,
  UpdateCategoryParams,
  DeleteCategoryParams,
  ReorderCategoriesBody,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/categories", requireAuth, async (_req, res): Promise<void> => {
  const categories = await db
    .select()
    .from(categoriesTable)
    .where(eq(categoriesTable.isDeleted, false))
    .orderBy(asc(categoriesTable.sortOrder), asc(categoriesTable.id));
  res.json(categories);
});

router.post("/categories", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateCategoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [category] = await db
    .insert(categoriesTable)
    .values(parsed.data)
    .returning();
  res.status(201).json(category);
});

router.patch("/categories/reorder", requireAuth, async (req, res): Promise<void> => {
  const parsed = ReorderCategoriesBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  for (const item of parsed.data.order) {
    await db
      .update(categoriesTable)
      .set({ sortOrder: item.sortOrder })
      .where(and(eq(categoriesTable.id, item.id), eq(categoriesTable.isDeleted, false)));
  }
  res.json({ message: "Reordered successfully" });
});

router.get("/categories/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetCategoryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [category] = await db
    .select()
    .from(categoriesTable)
    .where(and(eq(categoriesTable.id, params.data.id), eq(categoriesTable.isDeleted, false)));

  if (!category) {
    res.status(404).json({ error: "Category not found" });
    return;
  }
  res.json(category);
});

router.patch("/categories/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateCategoryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateCategoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [category] = await db
    .update(categoriesTable)
    .set(parsed.data)
    .where(and(eq(categoriesTable.id, params.data.id), eq(categoriesTable.isDeleted, false)))
    .returning();

  if (!category) {
    res.status(404).json({ error: "Category not found" });
    return;
  }
  res.json(category);
});

router.delete("/categories/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteCategoryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [category] = await db
    .update(categoriesTable)
    .set({ isDeleted: true })
    .where(and(eq(categoriesTable.id, params.data.id), eq(categoriesTable.isDeleted, false)))
    .returning();

  if (!category) {
    res.status(404).json({ error: "Category not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
