import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, recipesTable, recipeIngredientsTable, menuItemsTable, ingredientsTable } from "@workspace/db";
import {
  GetRecipeByMenuItemParams,
  UpsertRecipeParams,
  UpsertRecipeBody,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

async function buildRecipeDetail(recipe: { id: number; menuItemId: number; createdAt: Date; updatedAt: Date }) {
  const [menuItem] = await db
    .select()
    .from(menuItemsTable)
    .where(eq(menuItemsTable.id, recipe.menuItemId));

  const recipeIngredients = await db
    .select()
    .from(recipeIngredientsTable)
    .where(eq(recipeIngredientsTable.recipeId, recipe.id));

  const ingredients = await Promise.all(
    recipeIngredients.map(async (ri) => {
      const [ing] = await db
        .select()
        .from(ingredientsTable)
        .where(eq(ingredientsTable.id, ri.ingredientId));
      return {
        id: ri.id,
        recipeId: ri.recipeId,
        ingredientId: ri.ingredientId,
        ingredientName: ing?.name ?? "",
        unit: ing?.unit ?? "",
        quantity: ri.quantity,
      };
    })
  );

  return {
    id: recipe.id,
    menuItemId: recipe.menuItemId,
    menuItemName: menuItem?.name ?? "",
    ingredients,
    createdAt: recipe.createdAt,
    updatedAt: recipe.updatedAt,
  };
}

router.get("/recipes", requireAuth, async (_req, res): Promise<void> => {
  const recipes = await db
    .select()
    .from(recipesTable)
    .where(eq(recipesTable.isDeleted, false));

  const details = await Promise.all(recipes.map(buildRecipeDetail));
  res.json(details);
});

router.get("/recipes/menu-item/:menuItemId", requireAuth, async (req, res): Promise<void> => {
  const params = GetRecipeByMenuItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [recipe] = await db
    .select()
    .from(recipesTable)
    .where(eq(recipesTable.menuItemId, params.data.menuItemId));

  if (!recipe || recipe.isDeleted) {
    res.status(404).json({ error: "Recipe not found" });
    return;
  }
  res.json(await buildRecipeDetail(recipe));
});

router.put("/recipes/menu-item/:menuItemId", requireAuth, async (req, res): Promise<void> => {
  const params = UpsertRecipeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpsertRecipeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db
    .select()
    .from(recipesTable)
    .where(eq(recipesTable.menuItemId, params.data.menuItemId));

  let recipeId: number;

  if (existing) {
    await db
      .update(recipesTable)
      .set({ isDeleted: false })
      .where(eq(recipesTable.id, existing.id));
    recipeId = existing.id;
    await db
      .delete(recipeIngredientsTable)
      .where(eq(recipeIngredientsTable.recipeId, recipeId));
  } else {
    const [newRecipe] = await db
      .insert(recipesTable)
      .values({ menuItemId: params.data.menuItemId })
      .returning();
    recipeId = newRecipe.id;
  }

  if (parsed.data.ingredients.length > 0) {
    await db.insert(recipeIngredientsTable).values(
      parsed.data.ingredients.map((ri) => ({
        recipeId,
        ingredientId: ri.ingredientId,
        quantity: ri.quantity,
      }))
    );
  }

  const [finalRecipe] = await db
    .select()
    .from(recipesTable)
    .where(eq(recipesTable.id, recipeId));

  res.json(await buildRecipeDetail(finalRecipe));
});

export default router;
