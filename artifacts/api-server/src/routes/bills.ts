import { Router, type IRouter } from "express";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import {
  db,
  billsTable,
  billItemsTable,
  ordersTable,
  orderItemsTable,
  ingredientsTable,
  inventoryLogsTable,
  recipesTable,
  recipeIngredientsTable,
} from "@workspace/db";
import { ListBillsQueryParams, GenerateBillBody, GetBillParams } from "@workspace/api-zod";
import { requireAuth, requireOwner } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/bills", requireAuth, requireOwner, async (req, res): Promise<void> => {
  const query = ListBillsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const conditions = [];
  if (query.data.dateFrom) {
    conditions.push(gte(billsTable.createdAt, new Date(query.data.dateFrom)));
  }
  if (query.data.dateTo) {
    const end = new Date(query.data.dateTo);
    end.setHours(23, 59, 59, 999);
    conditions.push(lte(billsTable.createdAt, end));
  }

  const bills = await db
    .select()
    .from(billsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(billsTable.createdAt));

  res.json(bills);
});

router.post("/bills", requireAuth, requireOwner, async (req, res): Promise<void> => {
  const parsed = GenerateBillBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { orderId, paymentMethod, notes } = parsed.data;

  try {
    const result = await db.transaction(async (tx) => {
      const [existingBill] = await tx
        .select()
        .from(billsTable)
        .where(eq(billsTable.orderId, orderId));

      if (existingBill) {
        throw Object.assign(new Error("Bill already exists for this order"), { status: 400 });
      }

      const [order] = await tx
        .select()
        .from(ordersTable)
        .where(eq(ordersTable.id, orderId));

      if (!order) {
        throw Object.assign(new Error("Order not found"), { status: 404 });
      }

      if (order.status !== "delivered") {
        throw Object.assign(
          new Error("Order must be delivered before generating a bill"),
          { status: 400 }
        );
      }

      const orderItems = await tx
        .select()
        .from(orderItemsTable)
        .where(eq(orderItemsTable.orderId, orderId));

      const inventoryEntries: Array<{
        ingredientId: number;
        ingredientName: string;
        quantityBefore: string;
        quantityAfter: string;
        change: string;
        reason: string;
        billId: number;
      }> = [];

      for (const item of orderItems) {
        if (!item.menuItemId) continue;

        const [recipe] = await tx
          .select()
          .from(recipesTable)
          .where(eq(recipesTable.menuItemId, item.menuItemId));

        if (!recipe) continue;

        const recipeIngredients = await tx
          .select()
          .from(recipeIngredientsTable)
          .where(eq(recipeIngredientsTable.recipeId, recipe.id));

        for (const ri of recipeIngredients) {
          const totalDeduct = parseFloat(ri.quantity) * item.quantity;

          const [ingredient] = await tx
            .select()
            .from(ingredientsTable)
            .where(eq(ingredientsTable.id, ri.ingredientId));

          if (!ingredient) continue;

          const before = parseFloat(ingredient.stockQuantity);
          const after = Math.max(0, before - totalDeduct);

          await tx
            .update(ingredientsTable)
            .set({ stockQuantity: after.toFixed(4) })
            .where(eq(ingredientsTable.id, ingredient.id));

          inventoryEntries.push({
            ingredientId: ingredient.id,
            ingredientName: ingredient.name,
            quantityBefore: before.toFixed(4),
            quantityAfter: after.toFixed(4),
            change: (-totalDeduct).toFixed(4),
            reason: `Bill for order #${orderId}`,
            billId: 0,
          });
        }
      }

      const [bill] = await tx
        .insert(billsTable)
        .values({
          orderId,
          totalAmount: order.totalAmount,
          paymentMethod: paymentMethod ?? "cash",
          notes: notes ?? null,
        })
        .returning();

      if (inventoryEntries.length > 0) {
        await tx.insert(inventoryLogsTable).values(
          inventoryEntries.map((e) => ({ ...e, billId: bill.id }))
        );
      }

      await tx
        .update(ordersTable)
        .set({ paymentMethod: paymentMethod ?? "cash" })
        .where(eq(ordersTable.id, orderId));

      const billItems = await tx
        .insert(billItemsTable)
        .values(
          orderItems.map((oi) => ({
            billId: bill.id,
            itemName: oi.itemName,
            quantity: oi.quantity,
            unitPrice: oi.itemPrice,
            subtotal: oi.subtotal,
          }))
        )
        .returning();

      const inventoryLogs =
        inventoryEntries.length > 0
          ? await tx
              .select()
              .from(inventoryLogsTable)
              .where(eq(inventoryLogsTable.billId, bill.id))
          : [];

      return { ...bill, items: billItems, order, deductions: inventoryLogs };
    });

    res.status(201).json(result);
  } catch (err: unknown) {
    const e = err as Error & { status?: number };
    const status = e.status ?? 500;
    res.status(status).json({ error: e.message ?? "Internal server error" });
  }
});

router.get("/bills/:id", requireAuth, requireOwner, async (req, res): Promise<void> => {
  const params = GetBillParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [bill] = await db
    .select()
    .from(billsTable)
    .where(eq(billsTable.id, params.data.id));

  if (!bill) {
    res.status(404).json({ error: "Bill not found" });
    return;
  }

  const items = await db
    .select()
    .from(billItemsTable)
    .where(eq(billItemsTable.billId, bill.id));

  const [order] = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.id, bill.orderId));

  const deductions = await db
    .select()
    .from(inventoryLogsTable)
    .where(eq(inventoryLogsTable.billId, bill.id));

  res.json({ ...bill, items, order, deductions });
});

export default router;
