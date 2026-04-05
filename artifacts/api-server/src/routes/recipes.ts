import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, recipesTable, recipeIngredientsTable, menuItemsTable, ingredientsTable } from "@workspace/db";
import {
  GetRecipeByMenuItemParams,
  UpsertRecipeParams,
  UpsertRecipeBody,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

async function buildRecipeDetail(recipe: {
  id: number;
  menuItemId: number;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  const [menuItem] = await db
    .select()
    .from(menuItemsTable)
    .where(eq(menuItemsTable.id, recipe.menuItemId));

  const recipeIngredients = await db
    .select()
    .from(recipeIngredientsTable)
    .where(and(eq(recipeIngredientsTable.recipeId, recipe.id), eq(recipeIngredientsTable.isDeleted, false)));

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
        ingredientNameUr: ing?.nameUr ?? "",
        unit: ing?.unit ?? "",
        quantity: ri.quantity,
      };
    })
  );

  return {
    id: recipe.id,
    menuItemId: recipe.menuItemId,
    menuItemName: menuItem?.name ?? "",
    menuItemNameUr: menuItem?.nameUr ?? "",
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
    .where(and(eq(recipesTable.menuItemId, params.data.menuItemId), eq(recipesTable.isDeleted, false)));

  if (!recipe) {
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

  const result = await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(recipesTable)
      .where(eq(recipesTable.menuItemId, params.data.menuItemId));

    let recipeId: number;

    if (existing) {
      await tx
        .update(recipesTable)
        .set({ isDeleted: false })
        .where(eq(recipesTable.id, existing.id));
      recipeId = existing.id;

      await tx
        .update(recipeIngredientsTable)
        .set({ isDeleted: true })
        .where(and(eq(recipeIngredientsTable.recipeId, recipeId), eq(recipeIngredientsTable.isDeleted, false)));
    } else {
      const [newRecipe] = await tx
        .insert(recipesTable)
        .values({ menuItemId: params.data.menuItemId })
        .returning();
      recipeId = newRecipe.id;
    }

    if (parsed.data.ingredients.length > 0) {
      await tx.insert(recipeIngredientsTable).values(
        parsed.data.ingredients.map((ri) => ({
          recipeId,
          ingredientId: ri.ingredientId,
          quantity: ri.quantity,
        }))
      );
    }

    const [finalRecipe] = await tx
      .select()
      .from(recipesTable)
      .where(eq(recipesTable.id, recipeId));

    return finalRecipe;
  });

  res.json(await buildRecipeDetail(result));
});

export default router;
