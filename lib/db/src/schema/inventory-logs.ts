import { pgTable, serial, integer, text, timestamp, numeric } from "drizzle-orm/pg-core";
import { ingredientsTable } from "./ingredients";

export const inventoryLogsTable = pgTable("inventory_logs", {
  id: serial("id").primaryKey(),
  ingredientId: integer("ingredient_id")
    .notNull()
    .references(() => ingredientsTable.id),
  ingredientName: text("ingredient_name").notNull(),
  quantityBefore: numeric("quantity_before", { precision: 12, scale: 3 }).notNull(),
  quantityAfter: numeric("quantity_after", { precision: 12, scale: 3 }).notNull(),
  change: numeric("change", { precision: 12, scale: 3 }).notNull(),
  reason: text("reason"),
  billId: integer("bill_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type InventoryLog = typeof inventoryLogsTable.$inferSelect;
