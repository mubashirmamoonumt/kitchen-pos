import { pgTable, serial, integer, text, boolean, timestamp, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { ordersTable } from "./orders";

export const billsTable = pgTable("bills", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id")
    .notNull()
    .unique()
    .references(() => ordersTable.id),
  billNumber: text("bill_number").unique(),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull().default("0"),
  discount: numeric("discount", { precision: 12, scale: 2 }).notNull().default("0"),
  tax: numeric("tax", { precision: 12, scale: 2 }).notNull().default("0"),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(),
  paymentMethod: text("payment_method").notNull().default("cash"),
  notes: text("notes"),
  isDeleted: boolean("is_deleted").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const billItemsTable = pgTable("bill_items", {
  id: serial("id").primaryKey(),
  billId: integer("bill_id")
    .notNull()
    .references(() => billsTable.id),
  itemName: text("item_name").notNull(),
  quantity: numeric("quantity", { precision: 12, scale: 4 }).notNull(),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull(),
  isDeleted: boolean("is_deleted").notNull().default(false),
});

export const insertBillSchema = createInsertSchema(billsTable).omit({
  id: true,
  createdAt: true,
  isDeleted: true,
});
export type InsertBill = z.infer<typeof insertBillSchema>;
export type Bill = typeof billsTable.$inferSelect;
export type BillItem = typeof billItemsTable.$inferSelect;
