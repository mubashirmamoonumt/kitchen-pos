import { Router, type IRouter } from "express";
import { eq, and, gte, lte, desc, sql, ne } from "drizzle-orm";
import { db, ordersTable, orderItemsTable, billsTable } from "@workspace/db";
import {
  GetDailySalesReportQueryParams,
  GetTopItemsReportQueryParams,
  GetRevenueByPaymentReportQueryParams,
} from "@workspace/api-zod";
import { requireAuth, requireOwner } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/reports/daily-sales", requireAuth, requireOwner, async (req, res): Promise<void> => {
  const query = GetDailySalesReportQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const from = new Date(query.data.dateFrom);
  const to = new Date(query.data.dateTo);
  to.setHours(23, 59, 59, 999);

  const orders = await db
    .select()
    .from(ordersTable)
    .where(
      and(
        eq(ordersTable.isDeleted, false),
        ne(ordersTable.status, "cancelled"),
        gte(ordersTable.createdAt, from),
        lte(ordersTable.createdAt, to)
      )
    )
    .orderBy(ordersTable.createdAt);

  const byDate: Record<string, { revenue: number; orderCount: number }> = {};

  for (const order of orders) {
    const dateKey = order.createdAt.toISOString().split("T")[0];
    if (!byDate[dateKey]) {
      byDate[dateKey] = { revenue: 0, orderCount: 0 };
    }
    byDate[dateKey].revenue += parseFloat(order.totalAmount);
    byDate[dateKey].orderCount += 1;
  }

  const summary = Object.entries(byDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({
      date,
      revenue: data.revenue.toFixed(2),
      orderCount: data.orderCount,
      avgOrderValue: (data.orderCount > 0 ? data.revenue / data.orderCount : 0).toFixed(2),
    }));

  const totalRevenue = summary.reduce((s, d) => s + parseFloat(d.revenue), 0).toFixed(2);
  const totalOrders = summary.reduce((s, d) => s + d.orderCount, 0);

  res.json({ summary, totalRevenue, totalOrders });
});

router.get("/reports/top-items", requireAuth, requireOwner, async (req, res): Promise<void> => {
  const query = GetTopItemsReportQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const from = new Date(query.data.dateFrom);
  const to = new Date(query.data.dateTo);
  to.setHours(23, 59, 59, 999);
  const limit = query.data.limit ?? 10;

  const deliveredOrders = await db
    .select({ id: ordersTable.id })
    .from(ordersTable)
    .where(
      and(
        ne(ordersTable.status, "cancelled"),
        gte(ordersTable.createdAt, from),
        lte(ordersTable.createdAt, to)
      )
    );

  const orderIds = deliveredOrders.map((o) => o.id);
  if (orderIds.length === 0) {
    res.json([]);
    return;
  }

  const items = await db
    .select()
    .from(orderItemsTable)
    .where(sql`${orderItemsTable.orderId} = ANY(ARRAY[${sql.join(orderIds.map(id => sql`${id}`), sql`, `)}]::int[])`);

  const byItem: Record<string, { menuItemId: number; totalQuantity: number; totalRevenue: number }> = {};
  for (const item of items) {
    if (!byItem[item.itemName]) {
      byItem[item.itemName] = {
        menuItemId: item.menuItemId ?? 0,
        totalQuantity: 0,
        totalRevenue: 0,
      };
    }
    byItem[item.itemName].totalQuantity += item.quantity;
    byItem[item.itemName].totalRevenue += parseFloat(item.subtotal);
  }

  const result = Object.entries(byItem)
    .map(([itemName, data]) => ({
      menuItemId: data.menuItemId,
      itemName,
      totalQuantity: data.totalQuantity,
      totalRevenue: data.totalRevenue.toFixed(2),
    }))
    .sort((a, b) => b.totalQuantity - a.totalQuantity)
    .slice(0, limit);

  res.json(result);
});

router.get("/reports/revenue-by-payment", requireAuth, requireOwner, async (req, res): Promise<void> => {
  const query = GetRevenueByPaymentReportQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const from = new Date(query.data.dateFrom);
  const to = new Date(query.data.dateTo);
  to.setHours(23, 59, 59, 999);

  const orders = await db
    .select()
    .from(ordersTable)
    .where(
      and(
        eq(ordersTable.isDeleted, false),
        ne(ordersTable.status, "cancelled"),
        gte(ordersTable.createdAt, from),
        lte(ordersTable.createdAt, to)
      )
    );

  const byPayment: Record<string, { revenue: number; orderCount: number }> = {};
  for (const order of orders) {
    const method = order.paymentMethod ?? "unspecified";
    if (!byPayment[method]) {
      byPayment[method] = { revenue: 0, orderCount: 0 };
    }
    byPayment[method].revenue += parseFloat(order.totalAmount);
    byPayment[method].orderCount += 1;
  }

  const result = Object.entries(byPayment).map(([paymentMethod, data]) => ({
    paymentMethod,
    revenue: data.revenue.toFixed(2),
    orderCount: data.orderCount,
  }));

  res.json(result);
});

export default router;
