import { Router, type IRouter } from "express";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { db, billsTable, billItemsTable, ordersTable, orderItemsTable, ingredientsTable, inventoryLogsTable, recipesTable, recipeIngredientsTable } from "@workspace/db";
import {
  ListBillsQueryParams,
  GenerateBillBody,
  GetBillParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/bills", requireAuth, async (req, res): Promise<void> => {
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

router.post("/bills", requireAuth, async (req, res): Promise<void> => {
  const parsed = GenerateBillBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { orderId, paymentMethod, notes } = parsed.data;

  const [existingBill] = await db
    .select()
    .from(billsTable)
    .where(eq(billsTable.orderId, orderId));

  if (existingBill) {
    res.status(400).json({ error: "Bill already exists for this order" });
    return;
  }

  const [order] = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.id, orderId));

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  if (order.status !== "delivered") {
    res.status(400).json({ error: "Order must be delivered before generating a bill" });
    return;
  }

  const orderItems = await db
    .select()
    .from(orderItemsTable)
    .where(eq(orderItemsTable.orderId, orderId));

  const deductions: Array<{
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

    const [recipe] = await db
      .select()
      .from(recipesTable)
      .where(eq(recipesTable.menuItemId, item.menuItemId));

    if (!recipe) continue;

    const recipeIngredients = await db
      .select()
      .from(recipeIngredientsTable)
      .where(eq(recipeIngredientsTable.recipeId, recipe.id));

    for (const ri of recipeIngredients) {
      const totalDeduct = parseFloat(ri.quantity) * item.quantity;

      const [ingredient] = await db
        .select()
        .from(ingredientsTable)
        .where(eq(ingredientsTable.id, ri.ingredientId));

      if (!ingredient) continue;

      const before = parseFloat(ingredient.stockQuantity);
      const after = Math.max(0, before - totalDeduct);

      await db
        .update(ingredientsTable)
        .set({ stockQuantity: after.toString() })
        .where(eq(ingredientsTable.id, ingredient.id));

      deductions.push({
        ingredientId: ingredient.id,
        ingredientName: ingredient.name,
        quantityBefore: before.toString(),
        quantityAfter: after.toString(),
        change: (-totalDeduct).toString(),
        reason: `Bill for order #${orderId}`,
        billId: 0,
      });
    }
  }

  const [bill] = await db
    .insert(billsTable)
    .values({
      orderId,
      totalAmount: order.totalAmount,
      paymentMethod: paymentMethod ?? "cash",
      notes: notes ?? null,
    })
    .returning();

  if (deductions.length > 0) {
    await db.insert(inventoryLogsTable).values(
      deductions.map((d) => ({ ...d, billId: bill.id }))
    );
  }

  await db
    .update(ordersTable)
    .set({ paymentMethod: paymentMethod ?? "cash" })
    .where(eq(ordersTable.id, orderId));

  const billItems = await db
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

  const inventoryLogs = await db
    .select()
    .from(inventoryLogsTable)
    .where(eq(inventoryLogsTable.billId, bill.id));

  res.status(201).json({
    ...bill,
    items: billItems,
    order,
    deductions: inventoryLogs,
  });
});

router.get("/bills/:id", requireAuth, async (req, res): Promise<void> => {
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
