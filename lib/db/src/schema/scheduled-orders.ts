import { pgTable, serial, integer, text, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { customersTable } from "./customers";
import { ordersTable } from "./orders";

export const scheduledOrdersTable = pgTable("scheduled_orders", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").references(() => customersTable.id),
  customerName: text("customer_name"),
  customerPhone: text("customer_phone"),
  scheduledDate: text("scheduled_date").notNull(),
  scheduledTime: text("scheduled_time").notNull(),
  notes: text("notes"),
  status: text("status").notNull().default("pending"),
  convertedOrderId: integer("converted_order_id").references(() => ordersTable.id),
  items: json("items"),
  isDeleted: boolean("is_deleted").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertScheduledOrderSchema = createInsertSchema(scheduledOrdersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  isDeleted: true,
  convertedOrderId: true,
});
export type InsertScheduledOrder = z.infer<typeof insertScheduledOrderSchema>;
export type ScheduledOrder = typeof scheduledOrdersTable.$inferSelect;
