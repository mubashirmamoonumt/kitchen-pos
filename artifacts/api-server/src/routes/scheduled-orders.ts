import { Router, type IRouter } from "express";
import { eq, and, desc, count, ne } from "drizzle-orm";
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

async function getDailyCapacity(): Promise<number> {
  const [setting] = await db
    .select()
    .from(appSettingsTable)
    .where(and(eq(appSettingsTable.key, "daily_order_capacity"), eq(appSettingsTable.isDeleted, false)));
  return setting ? parseInt(setting.value, 10) : 50;
}

async function countScheduledOrdersForDate(dateStr: string): Promise<number> {
  const [row] = await db
    .select({ cnt: count(scheduledOrdersTable.id) })
    .from(scheduledOrdersTable)
    .where(
      and(
        eq(scheduledOrdersTable.isDeleted, false),
        ne(scheduledOrdersTable.status, "cancelled"),
        eq(scheduledOrdersTable.scheduledDate, dateStr)
      )
    );
  return Number(row?.cnt ?? 0);
}

router.get("/scheduled-orders/daily-capacity", requireAuth, async (req, res): Promise<void> => {
  const query = GetDailyCapacityQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const capacity = await getDailyCapacity();
  const dateStr = query.data.date;
  const currentCount = await countScheduledOrdersForDate(dateStr);

  res.json({
    date: dateStr,
    currentCount,
    capacity,
    available: Math.max(0, capacity - currentCount),
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

  const capacity = await getDailyCapacity();
  const currentCount = await countScheduledOrdersForDate(parsed.data.scheduledDate);
  if (currentCount >= capacity) {
    res.status(422).json({
      error: `Daily capacity of ${capacity} orders reached for ${parsed.data.scheduledDate}`,
    });
    return;
  }

  const [order] = await db
    .insert(scheduledOrdersTable)
    .values({
      ...parsed.data,
      items: parsed.data.items ?? null,
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
    .where(and(eq(scheduledOrdersTable.id, params.data.id), eq(scheduledOrdersTable.isDeleted, false)));
  if (!order) {
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
    updateData.items = parsed.data.items ?? null;
  }
  const [order] = await db
    .update(scheduledOrdersTable)
    .set(updateData)
    .where(and(eq(scheduledOrdersTable.id, params.data.id), eq(scheduledOrdersTable.isDeleted, false)))
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
    .where(and(eq(scheduledOrdersTable.id, params.data.id), eq(scheduledOrdersTable.isDeleted, false)))
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
    .where(and(eq(scheduledOrdersTable.id, params.data.id), eq(scheduledOrdersTable.isDeleted, false)));

  if (!scheduled) {
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

  const today = new Date().toISOString().split("T")[0];
  const capacity = await getDailyCapacity();
  const currentCount = await countScheduledOrdersForDate(today);
  if (currentCount >= capacity) {
    res.status(422).json({
      error: `Daily capacity of ${capacity} orders reached for today (${today})`,
    });
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

  const result = await db.transaction(async (tx) => {
    const [order] = await tx
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

    const orderItems =
      items.length > 0
        ? await tx
            .insert(orderItemsTable)
            .values(
              items.map((item) => ({
                orderId: order.id,
                menuItemId: item.menuItemId,
                itemName: item.itemName,
                itemPrice: item.unitPrice,
                quantity: String(item.quantity),
                subtotal: (parseFloat(item.unitPrice) * item.quantity).toFixed(2),
              }))
            )
            .returning()
        : [];

    await tx
      .update(scheduledOrdersTable)
      .set({ status: "converted", convertedOrderId: order.id })
      .where(eq(scheduledOrdersTable.id, scheduled.id));

    return { ...order, items: orderItems };
  });

  res.status(201).json(result);
});

export default router;
