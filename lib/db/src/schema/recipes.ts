import { pgTable, serial, integer, boolean, timestamp, numeric, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { menuItemsTable } from "./menu-items";
import { ingredientsTable } from "./ingredients";

export const recipesTable = pgTable("recipes", {
  id: serial("id").primaryKey(),
  menuItemId: integer("menu_item_id")
    .notNull()
    .unique()
    .references(() => menuItemsTable.id),
  instructions: text("instructions"),
  isDeleted: boolean("is_deleted").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const recipeIngredientsTable = pgTable("recipe_ingredients", {
  id: serial("id").primaryKey(),
  recipeId: integer("recipe_id")
    .notNull()
    .references(() => recipesTable.id),
  ingredientId: integer("ingredient_id")
    .notNull()
    .references(() => ingredientsTable.id),
  quantity: numeric("quantity", { precision: 12, scale: 3 }).notNull(),
  unit: text("unit").notNull().default("g"),
  isDeleted: boolean("is_deleted").notNull().default(false),
});

export const insertRecipeSchema = createInsertSchema(recipesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  isDeleted: true,
});
export const insertRecipeIngredientSchema = createInsertSchema(recipeIngredientsTable).omit({
  id: true,
  isDeleted: true,
});
export type InsertRecipe = z.infer<typeof insertRecipeSchema>;
export type Recipe = typeof recipesTable.$inferSelect;
export type RecipeIngredient = typeof recipeIngredientsTable.$inferSelect;
