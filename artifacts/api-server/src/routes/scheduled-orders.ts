import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, scheduledOrdersTable, ordersTable, orderItemsTable, appSettingsTable } from "@workspace/db";
import {
  ListScheduledOrdersQueryParams,
  CreateScheduledOrderBody,
  GetScheduledOrderParams,
  UpdateScheduledOrderParams,
  UpdateScheduledOrderBody,
  DeleteScheduledOrderParams,
  ConvertScheduledOrderParams,
  GetDailyCapacityQueryParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/scheduled-orders/daily-capacity", requireAuth, async (req, res): Promise<void> => {
  const query = GetDailyCapacityQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const [setting] = await db
    .select()
    .from(appSettingsTable)
    .where(eq(appSettingsTable.key, "daily_order_capacity"));

  const capacity = setting ? parseInt(setting.value, 10) : 50;

  const orders = await db
    .select()
    .from(ordersTable)
    .where(
      and(
        eq(ordersTable.isDeleted, false),
      )
    );

  const dateStr = query.data.date;
  const dayOrders = orders.filter((o) => {
    const d = o.createdAt.toISOString().split("T")[0];
    return d === dateStr && o.status !== "cancelled";
  });

  res.json({
    date: dateStr,
    currentCount: dayOrders.length,
    capacity,
    available: Math.max(0, capacity - dayOrders.length),
  });
});

router.get("/scheduled-orders", requireAuth, async (req, res): Promise<void> => {
  const query = ListScheduledOrdersQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const conditions = [eq(scheduledOrdersTable.isDeleted, false)];
  if (query.data.date) {
    conditions.push(eq(scheduledOrdersTable.scheduledDate, query.data.date));
  }
  if (query.data.status) {
    conditions.push(eq(scheduledOrdersTable.status, query.data.status));
  }

  const orders = await db
    .select()
    .from(scheduledOrdersTable)
    .where(and(...conditions))
    .orderBy(desc(scheduledOrdersTable.scheduledDate));

  res.json(orders);
});

router.post("/scheduled-orders", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateScheduledOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [order] = await db
    .insert(scheduledOrdersTable)
    .values({
      ...parsed.data,
      items: parsed.data.items as unknown as null,
    })
    .returning();
  res.status(201).json(order);
});

router.get("/scheduled-orders/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetScheduledOrderParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [order] = await db
    .select()
    .from(scheduledOrdersTable)
    .where(eq(scheduledOrdersTable.id, params.data.id));
  if (!order || order.isDeleted) {
    res.status(404).json({ error: "Scheduled order not found" });
    return;
  }
  res.json(order);
});

router.patch("/scheduled-orders/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateScheduledOrderParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateScheduledOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const updateData: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.items !== undefined) {
    updateData.items = parsed.data.items as unknown as null;
  }
  const [order] = await db
    .update(scheduledOrdersTable)
    .set(updateData)
    .where(eq(scheduledOrdersTable.id, params.data.id))
    .returning();
  if (!order) {
    res.status(404).json({ error: "Scheduled order not found" });
    return;
  }
  res.json(order);
});

router.delete("/scheduled-orders/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteScheduledOrderParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [order] = await db
    .update(scheduledOrdersTable)
    .set({ isDeleted: true, status: "cancelled" })
    .where(eq(scheduledOrdersTable.id, params.data.id))
    .returning();
  if (!order) {
    res.status(404).json({ error: "Scheduled order not found" });
    return;
  }
  res.sendStatus(204);
});

router.post("/scheduled-orders/:id/convert", requireAuth, async (req, res): Promise<void> => {
  const params = ConvertScheduledOrderParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [scheduled] = await db
    .select()
    .from(scheduledOrdersTable)
    .where(eq(scheduledOrdersTable.id, params.data.id));

  if (!scheduled || scheduled.isDeleted) {
    res.status(404).json({ error: "Scheduled order not found" });
    return;
  }
  if (scheduled.status === "converted") {
    res.status(400).json({ error: "Already converted" });
    return;
  }
  if (scheduled.status === "cancelled") {
    res.status(400).json({ error: "Cannot convert a cancelled scheduled order" });
    return;
  }

  const items = (scheduled.items as Array<{
    menuItemId: number;
    itemName: string;
    quantity: number;
    unitPrice: string;
  }>) ?? [];

  const totalAmount = items
    .reduce((s, i) => s + parseFloat(i.unitPrice) * i.quantity, 0)
    .toFixed(2);

  const [order] = await db
    .insert(ordersTable)
    .values({
      customerId: scheduled.customerId ?? null,
      customerName: scheduled.customerName ?? null,
      customerPhone: scheduled.customerPhone ?? null,
      status: "pending",
      notes: scheduled.notes ?? null,
      totalAmount,
    })
    .returning();

  if (items.length > 0) {
    await db.insert(orderItemsTable).values(
      items.map((item) => ({
        orderId: order.id,
        menuItemId: item.menuItemId,
        itemName: item.itemName,
        itemPrice: item.unitPrice,
        quantity: item.quantity,
        subtotal: (parseFloat(item.unitPrice) * item.quantity).toFixed(2),
      }))
    );
  }

  await db
    .update(scheduledOrdersTable)
    .set({ status: "converted", convertedOrderId: order.id })
    .where(eq(scheduledOrdersTable.id, scheduled.id));

  const orderItems = await db
    .select()
    .from(orderItemsTable)
    .where(eq(orderItemsTable.orderId, order.id));

  res.status(201).json({ ...order, items: orderItems });
});

export default router;
