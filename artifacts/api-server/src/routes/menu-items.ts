import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, menuItemsTable } from "@workspace/db";
import {
  ListMenuItemsQueryParams,
  CreateMenuItemBody,
  GetMenuItemParams,
  UpdateMenuItemParams,
  UpdateMenuItemBody,
  DeleteMenuItemParams,
  ToggleMenuItemAvailabilityParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/menu-items", requireAuth, async (req, res): Promise<void> => {
  const query = ListMenuItemsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const conditions = [eq(menuItemsTable.isDeleted, false)];
  if (query.data.categoryId != null) {
    conditions.push(eq(menuItemsTable.categoryId, query.data.categoryId));
  }
  if (query.data.isAvailable != null) {
    conditions.push(eq(menuItemsTable.isAvailable, query.data.isAvailable));
  }

  const items = await db
    .select()
    .from(menuItemsTable)
    .where(and(...conditions));
  res.json(items);
});

router.post("/menu-items", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateMenuItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [item] = await db.insert(menuItemsTable).values(parsed.data).returning();
  res.status(201).json(item);
});

router.get("/menu-items/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetMenuItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [item] = await db
    .select()
    .from(menuItemsTable)
    .where(eq(menuItemsTable.id, params.data.id));
  if (!item || item.isDeleted) {
    res.status(404).json({ error: "Menu item not found" });
    return;
  }
  res.json(item);
});

router.patch("/menu-items/:id/toggle-availability", requireAuth, async (req, res): Promise<void> => {
  const params = ToggleMenuItemAvailabilityParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [existing] = await db
    .select()
    .from(menuItemsTable)
    .where(eq(menuItemsTable.id, params.data.id));
  if (!existing || existing.isDeleted) {
    res.status(404).json({ error: "Menu item not found" });
    return;
  }
  const [item] = await db
    .update(menuItemsTable)
    .set({ isAvailable: !existing.isAvailable })
    .where(eq(menuItemsTable.id, params.data.id))
    .returning();
  res.json(item);
});

router.patch("/menu-items/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateMenuItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateMenuItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [item] = await db
    .update(menuItemsTable)
    .set(parsed.data)
    .where(eq(menuItemsTable.id, params.data.id))
    .returning();
  if (!item) {
    res.status(404).json({ error: "Menu item not found" });
    return;
  }
  res.json(item);
});

router.delete("/menu-items/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteMenuItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [item] = await db
    .update(menuItemsTable)
    .set({ isDeleted: true })
    .where(eq(menuItemsTable.id, params.data.id))
    .returning();
  if (!item) {
    res.status(404).json({ error: "Menu item not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
