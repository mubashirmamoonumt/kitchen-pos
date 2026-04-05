import { Router, type IRouter } from "express";
import { eq, and, gte, lte, desc, ne, count, sql } from "drizzle-orm";
import { db, ordersTable, orderItemsTable, customersTable, ingredientsTable } from "@workspace/db";
import {
  ListOrdersQueryParams,
  CreateOrderBody,
  GetOrderParams,
  UpdateOrderStatusParams,
  UpdateOrderStatusBody,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

const STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

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

  const { items, customerId, customerName, customerPhone, notes, paymentMethod } = parsed.data;

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

  const totalAmount = items
    .reduce((sum, item) => sum + parseFloat(item.itemPrice) * item.quantity, 0)
    .toFixed(2);

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
        paymentMethod: paymentMethod ?? null,
      })
      .returning();

    const orderItems = await tx
      .insert(orderItemsTable)
      .values(
        items.map((item) => ({
          orderId: order.id,
          menuItemId: item.menuItemId,
          itemName: item.itemName,
          itemPrice: item.itemPrice,
          quantity: item.quantity,
          subtotal: (parseFloat(item.itemPrice) * item.quantity).toFixed(2),
        }))
      )
      .returning();

    return { ...order, items: orderItems };
  });

  res.status(201).json(result);
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

  const allowedNext = STATUS_TRANSITIONS[existing.status] ?? [];
  if (!allowedNext.includes(parsed.data.status)) {
    res.status(422).json({
      error: `Cannot transition from '${existing.status}' to '${parsed.data.status}'. Allowed transitions: ${allowedNext.join(", ") || "none"}`,
    });
    return;
  }

  const updateData: Record<string, unknown> = { status: parsed.data.status };
  if (parsed.data.paymentMethod) {
    updateData.paymentMethod = parsed.data.paymentMethod;
  }

  const [order] = await db
    .update(ordersTable)
    .set(updateData)
    .where(eq(ordersTable.id, params.data.id))
    .returning();

  res.json(order);
});

export default router;
