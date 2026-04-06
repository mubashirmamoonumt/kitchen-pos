import { Router, type IRouter } from "express";
import { eq, and, gte, lte, desc, ne, count, sql } from "drizzle-orm";
import {
  db,
  ordersTable,
  orderItemsTable,
  customersTable,
  ingredientsTable,
  billsTable,
  billItemsTable,
  inventoryLogsTable,
  recipesTable,
  recipeIngredientsTable,
  appSettingsTable,
} from "@workspace/db";
import {
  ListOrdersQueryParams,
  CreateOrderBody,
  GetOrderParams,
  UpdateOrderStatusParams,
  UpdateOrderStatusBody,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

async function getSettingValue(key: string, fallback = "0"): Promise<string> {
  const [row] = await db
    .select({ value: appSettingsTable.value })
    .from(appSettingsTable)
    .where(and(eq(appSettingsTable.key, key), eq(appSettingsTable.isDeleted, false)));
  return row?.value ?? fallback;
}

router.get("/orders/dashboard-summary", requireAuth, async (_req, res): Promise<void> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [todayStats] = await db
    .select({
      revenue: sql<string>`COALESCE(SUM(${ordersTable.totalAmount}), 0)::text`,
      orderCount: count(ordersTable.id),
    })
    .from(ordersTable)
    .where(
      and(
        eq(ordersTable.isDeleted, false),
        gte(ordersTable.createdAt, today),
        ne(ordersTable.status, "cancelled")
      )
    );

  const [activeStats] = await db
    .select({ cnt: count(ordersTable.id) })
    .from(ordersTable)
    .where(
      and(
        eq(ordersTable.isDeleted, false),
        sql`${ordersTable.status} IN ('confirmed', 'preparing', 'ready')`
      )
    );

  const [pendingStats] = await db
    .select({ cnt: count(ordersTable.id) })
    .from(ordersTable)
    .where(and(eq(ordersTable.isDeleted, false), eq(ordersTable.status, "pending")));

  const [customerCount] = await db
    .select({ cnt: count(customersTable.id) })
    .from(customersTable)
    .where(eq(customersTable.isDeleted, false));

  const lowStockItems = await db
    .select()
    .from(ingredientsTable)
    .where(
      and(
        eq(ingredientsTable.isDeleted, false),
        sql`${ingredientsTable.stockQuantity}::numeric <= ${ingredientsTable.lowStockThreshold}::numeric`
      )
    );

  res.json({
    todayRevenue: todayStats?.revenue ?? "0",
    todayOrderCount: Number(todayStats?.orderCount ?? 0),
    activeOrderCount: Number(activeStats?.cnt ?? 0),
    pendingOrderCount: Number(pendingStats?.cnt ?? 0),
    lowStockCount: lowStockItems.length,
    totalCustomers: Number(customerCount?.cnt ?? 0),
  });
});

router.get("/orders", requireAuth, async (req, res): Promise<void> => {
  const query = ListOrdersQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const conditions = [eq(ordersTable.isDeleted, false)];
  if (query.data.status) {
    conditions.push(eq(ordersTable.status, query.data.status));
  }
  if (query.data.customerId) {
    conditions.push(eq(ordersTable.customerId, query.data.customerId));
  }
  if (query.data.dateFrom) {
    conditions.push(gte(ordersTable.createdAt, new Date(query.data.dateFrom)));
  }
  if (query.data.dateTo) {
    const end = new Date(query.data.dateTo);
    end.setHours(23, 59, 59, 999);
    conditions.push(lte(ordersTable.createdAt, end));
  }

  let orders = await db
    .select()
    .from(ordersTable)
    .where(and(...conditions))
    .orderBy(desc(ordersTable.createdAt));

  if (query.data.search) {
    const s = query.data.search.toLowerCase();
    orders = orders.filter(
      (o) =>
        String(o.id).includes(s) ||
        (o.customerName && o.customerName.toLowerCase().includes(s)) ||
        (o.customerPhone && o.customerPhone.includes(s))
    );
  }

  res.json(orders);
});

router.post("/orders", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const {
    items,
    customerId,
    customerName,
    customerPhone,
    notes,
    paymentMethod,
    discountAmount: orderDiscountAmount,
    discountType,
    discountRuleName,
  } = parsed.data;

  let resolvedName = customerName;
  let resolvedPhone = customerPhone;

  if (customerId && !resolvedName) {
    const [customer] = await db
      .select()
      .from(customersTable)
      .where(eq(customersTable.id, customerId));
    if (customer) {
      resolvedName = customer.name;
      resolvedPhone = customer.phone ?? undefined;
    }
  }

  const itemsWithCalc = items.map((item) => {
    const gross = parseFloat(item.itemPrice) * item.quantity;
    const itemDisc = parseFloat(item.discountAmount ?? "0");
    const lineTotal = Math.max(0, gross - itemDisc);
    return { ...item, gross, itemDisc, lineTotal };
  });

  const itemsSubtotal = itemsWithCalc.reduce((sum, i) => sum + i.lineTotal, 0);

  let orderDiscount = 0;
  if (orderDiscountAmount) {
    orderDiscount = parseFloat(orderDiscountAmount);
  }

  const totalAmount = Math.max(0, itemsSubtotal - orderDiscount).toFixed(2);

  try {
    const result = await db.transaction(async (tx) => {
      const [order] = await tx
        .insert(ordersTable)
        .values({
          customerId: customerId ?? null,
          customerName: resolvedName ?? null,
          customerPhone: resolvedPhone ?? null,
          status: "pending",
          notes: notes ?? null,
          totalAmount,
          discountAmount: orderDiscount.toFixed(2),
          discountType: discountType ?? "pkr",
          discountRuleName: discountRuleName ?? null,
          paymentMethod: paymentMethod ?? null,
        })
        .returning();

      const orderItems = await tx
        .insert(orderItemsTable)
        .values(
          itemsWithCalc.map((item) => ({
            orderId: order.id,
            menuItemId: item.menuItemId,
            itemName: item.itemName,
            itemPrice: item.itemPrice,
            quantity: String(item.quantity),
            unit: item.unit ?? "qty",
            discountAmount: item.itemDisc.toFixed(2),
            subtotal: item.lineTotal.toFixed(2),
          }))
        )
        .returning();

      const taxPercent = parseFloat(await getSettingValue("bill_tax_percent", "0"));
      const settingDiscountPercent = parseFloat(
        await getSettingValue("bill_discount_percent", "0")
      );

      const subtotalAmt = itemsSubtotal;
      const settingDiscount = (subtotalAmt * settingDiscountPercent) / 100;
      const effectiveDiscount = orderDiscount > 0 ? orderDiscount : settingDiscount;
      const taxAmt = ((subtotalAmt - effectiveDiscount) * taxPercent) / 100;
      const billTotal = Math.max(0, subtotalAmt - effectiveDiscount + taxAmt);

      const [existingBill] = await tx
        .select({ id: billsTable.id })
        .from(billsTable)
        .where(and(eq(billsTable.orderId, order.id), eq(billsTable.isDeleted, false)));

      let billData = null;
      if (!existingBill) {
        const [bill] = await tx
          .insert(billsTable)
          .values({
            orderId: order.id,
            subtotal: subtotalAmt.toFixed(2),
            discount: effectiveDiscount.toFixed(2),
            tax: taxAmt.toFixed(2),
            totalAmount: billTotal.toFixed(2),
            paymentMethod: paymentMethod ?? "cash",
            notes: notes ?? null,
          })
          .returning();

        const year = new Date(bill.createdAt).getFullYear();
        const billNumber = `INV-${year}-${String(bill.id).padStart(4, "0")}`;
        await tx
          .update(billsTable)
          .set({ billNumber })
          .where(eq(billsTable.id, bill.id));

        await tx.insert(billItemsTable).values(
          orderItems.map((oi) => ({
            billId: bill.id,
            itemName: oi.itemName,
            quantity: oi.quantity,
            unitPrice: oi.itemPrice,
            subtotal: oi.subtotal,
          }))
        );

        billData = { ...bill, billNumber };
      }

      return { ...order, items: orderItems, bill: billData };
    });

    res.status(201).json(result);
  } catch (err: unknown) {
    const e = err as Error & { status?: number };
    const status = e.status ?? 500;
    res.status(status).json({ error: e.message ?? "Internal server error" });
  }
});

router.get("/orders/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetOrderParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [order] = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.id, params.data.id));

  if (!order || order.isDeleted) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  const items = await db
    .select()
    .from(orderItemsTable)
    .where(eq(orderItemsTable.orderId, order.id));

  res.json({ ...order, items });
});

router.patch("/orders/:id/status", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateOrderStatusParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateOrderStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db
    .select()
    .from(ordersTable)
    .where(and(eq(ordersTable.id, params.data.id), eq(ordersTable.isDeleted, false)));

  if (!existing) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  const validStatuses = ["pending", "confirmed", "preparing", "ready", "delivered", "cancelled"];
  if (!validStatuses.includes(parsed.data.status)) {
    res.status(422).json({ error: `Invalid status '${parsed.data.status}'.` });
    return;
  }

  const updateData: Record<string, unknown> = { status: parsed.data.status };
  if (parsed.data.paymentMethod) {
    updateData.paymentMethod = parsed.data.paymentMethod;
  }

  const order = await db.transaction(async (tx) => {
    const [updatedOrder] = await tx
      .update(ordersTable)
      .set(updateData)
      .where(eq(ordersTable.id, params.data.id))
      .returning();

    if (parsed.data.status === "delivered" && existing.status !== "delivered") {
      const orderItems = await tx
        .select()
        .from(orderItemsTable)
        .where(and(eq(orderItemsTable.orderId, updatedOrder.id), eq(orderItemsTable.isDeleted, false)));

      const inventoryEntries: Array<{
        ingredientId: number;
        ingredientName: string;
        quantityBefore: string;
        quantityAfter: string;
        change: string;
        reason: string;
        billId: number;
      }> = [];

      const [existingBill] = await tx
        .select()
        .from(billsTable)
        .where(and(eq(billsTable.orderId, updatedOrder.id), eq(billsTable.isDeleted, false)));

      if (existingBill) {
        const [alreadyDeducted] = await tx
          .select({ id: inventoryLogsTable.id })
          .from(inventoryLogsTable)
          .where(eq(inventoryLogsTable.billId, existingBill.id))
          .limit(1);

        if (!alreadyDeducted) {
          for (const item of orderItems) {
            if (!item.menuItemId) continue;
            const [recipe] = await tx
              .select()
              .from(recipesTable)
              .where(and(eq(recipesTable.menuItemId, item.menuItemId), eq(recipesTable.isDeleted, false)));
            if (!recipe) continue;
            const recipeIngredients = await tx
              .select()
              .from(recipeIngredientsTable)
              .where(and(eq(recipeIngredientsTable.recipeId, recipe.id), eq(recipeIngredientsTable.isDeleted, false)));

            for (const ri of recipeIngredients) {
              const totalDeduct = parseFloat(ri.quantity) * parseFloat(String(item.quantity));
              const lockedRows = await tx.execute<{
                id: number;
                name: string;
                stock_quantity: string;
              }>(
                sql`SELECT id, name, stock_quantity FROM ingredients WHERE id = ${ri.ingredientId} AND is_deleted = FALSE FOR UPDATE`
              );
              const ingredient = lockedRows.rows[0];
              if (!ingredient) continue;
              const before = parseFloat(ingredient.stock_quantity);
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
                reason: `Order #${updatedOrder.id} delivered`,
                billId: existingBill.id,
              });
            }
          }

          if (inventoryEntries.length > 0) {
            await tx.insert(inventoryLogsTable).values(inventoryEntries);
          }
        }
      }
    }

    return updatedOrder;
  });

  res.json(order);
});

export default router;
