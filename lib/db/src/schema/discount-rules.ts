import { pgTable, serial, text, boolean, timestamp, numeric } from "drizzle-orm/pg-core";

export const discountRulesTable = pgTable("discount_rules", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull().default("event"),
  discountType: text("discount_type").notNull().default("pct"),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull().default("0"),
  minOrderValue: numeric("min_order_value", { precision: 12, scale: 2 }),
  active: boolean("active").notNull().default(true),
  isDeleted: boolean("is_deleted").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type DiscountRule = typeof discountRulesTable.$inferSelect;
