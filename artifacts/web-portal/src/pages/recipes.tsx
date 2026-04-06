import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  useListRecipes,
  useListMenuItems,
  useListIngredients,
  useGetRecipeByMenuItem,
  useUpsertRecipe,
  getListRecipesQueryKey,
} from "@workspace/api-client-react";
import type { RecipeDetail } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, BookOpen, ChefHat, FlaskConical } from "lucide-react";

const UNIT_OPTIONS = ["g", "kg", "ml", "L", "tbsp", "tsp", "cup", "pcs", "oz", "lb", "pinch"];

const schema = z.object({
  menuItemId: z.number(),
  instructions: z.string().optional(),
  ingredients: z.array(z.object({
    ingredientId: z.number().min(1, "Select ingredient"),
    quantity: z.string().min(1, "Required"),
    unit: z.string().min(1, "Required"),
  })).min(1, "Add at least one ingredient"),
});
type FormValues = z.infer<typeof schema>;

function RecipeForm({ menuItemId, menuItemName, onClose }: { menuItemId: number; menuItemName: string; onClose: () => void }) {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const qc = useQueryClient();
  const ingredientsList = useListIngredients();
  const existing = useGetRecipeByMenuItem(menuItemId, {
    query: { enabled: !!menuItemId, queryKey: ["getRecipeByMenuItem", menuItemId] },
  });
  const upsert = useUpsertRecipe();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      menuItemId,
      instructions: existing.data?.instructions ?? "",
      ingredients: existing.data?.ingredients?.map((i) => ({
        ingredientId: i.ingredientId,
        quantity: i.quantity,
        unit: i.recipeUnit || "g",
      })) ?? [{ ingredientId: 0, quantity: "", unit: "g" }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "ingredients" });

  const onSubmit = (values: FormValues) => {
    upsert.mutate(
      {
        menuItemId,
        data: {
          instructions: values.instructions || undefined,
          ingredients: values.ingredients.map((i) => ({
            ingredientId: i.ingredientId,
            quantity: i.quantity,
            unit: i.unit,
          })),
        },
      },
      {
        onSuccess: () => {
          toast({ title: t("Recipe Saved") });
          qc.invalidateQueries({ queryKey: getListRecipesQueryKey() });
          qc.invalidateQueries({ queryKey: ["getRecipeByMenuItem", menuItemId] });
          onClose();
        },
        onError: () => toast({ variant: "destructive", title: t("Error saving recipe") }),
      }
    );
  };

  if (existing.isLoading) return <Skeleton className="h-64" />;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        {/* Ingredients */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <FlaskConical className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-medium text-sm">{t("Ingredients")}</h3>
          </div>
          <div className="space-y-2">
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-end gap-2">
                <FormField control={form.control} name={`ingredients.${index}.ingredientId`} render={({ field: f }) => (
                  <FormItem className="flex-1 min-w-0">
                    {index === 0 && <FormLabel className="text-xs">{t("Ingredient")}</FormLabel>}
                    <Select onValueChange={(v) => f.onChange(parseInt(v))} value={f.value > 0 ? f.value.toString() : ""}>
                      <FormControl>
                        <SelectTrigger className="h-8 text-sm" data-testid={`select-ingredient-${index}`}>
                          <SelectValue placeholder={t("Select ingredient")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ingredientsList.data?.map((i) => (
                          <SelectItem key={i.id} value={i.id.toString()}>
                            {language === "ur" && i.nameUr ? i.nameUr : i.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )} />
                <FormField control={form.control} name={`ingredients.${index}.quantity`} render={({ field: f }) => (
                  <FormItem className="w-20">
                    {index === 0 && <FormLabel className="text-xs">{t("Qty")}</FormLabel>}
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0" className="h-8 text-sm px-2" {...f} data-testid={`input-qty-${index}`} />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )} />
                <FormField control={form.control} name={`ingredients.${index}.unit`} render={({ field: f }) => (
                  <FormItem className="w-20">
                    {index === 0 && <FormLabel className="text-xs">{t("Unit")}</FormLabel>}
                    <Select onValueChange={f.onChange} value={f.value}>
                      <FormControl>
                        <SelectTrigger className="h-8 text-sm" data-testid={`select-unit-${index}`}>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {UNIT_OPTIONS.map((u) => (
                          <SelectItem key={u} value={u}>{u}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )} />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive h-8 w-8 shrink-0 mb-0.5"
                  onClick={() => remove(index)}
                  disabled={fields.length === 1}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2 h-7 text-xs"
            onClick={() => append({ ingredientId: 0, quantity: "", unit: "g" })}
            data-testid="button-add-ingredient"
          >
            <Plus className="w-3 h-3 mr-1" /> {t("Add Ingredient")}
          </Button>
          <FormField control={form.control} name="ingredients" render={() => (
            <FormItem><FormMessage className="text-xs mt-1" /></FormItem>
          )} />
        </div>

        <Separator />

        {/* Instructions */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <ChefHat className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-medium text-sm">{t("Cooking Instructions")}</h3>
          </div>
          <FormField
            control={form.control}
            name="instructions"
            render={({ field: f }) => (
              <FormItem>
                <FormControl>
                  <Textarea
                    {...f}
                    rows={6}
                    placeholder={t("Write step-by-step instructions, one step per line.\nExample:\n1. Heat oil in a pan.\n2. Add onions and sauté until golden.\n3. Add spices and stir well.")}
                    className="resize-none text-sm font-mono leading-relaxed"
                    data-testid="textarea-instructions"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose}>{t("Cancel")}</Button>
          <Button type="submit" disabled={upsert.isPending} data-testid="button-save-recipe">
            {t("Save Recipe")}
          </Button>
        </div>
      </form>
    </Form>
  );
}

function RecipeCard({ recipe, language, t }: { recipe: RecipeDetail; language: string; t: (k: string) => string }) {
  const name = language === "ur" && recipe.menuItemNameUr ? recipe.menuItemNameUr : recipe.menuItemName;
  const hasInstructions = recipe.instructions && recipe.instructions.trim().length > 0;
  const steps = hasInstructions ? recipe.instructions!.trim().split("\n").filter(Boolean) : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <BookOpen className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-base">{name}</h3>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Ingredients */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <FlaskConical className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("Ingredients")}</span>
          </div>
          <ul className="space-y-1.5">
            {recipe.ingredients.map((ing) => {
              const ingName = language === "ur" && ing.ingredientNameUr ? ing.ingredientNameUr : ing.ingredientName;
              return (
                <li key={ing.id} className="flex items-center justify-between text-sm bg-muted/40 rounded px-2 py-1">
                  <span>{ingName}</span>
                  <Badge variant="outline" className="text-xs font-mono tabular-nums ml-2 shrink-0">
                    {ing.quantity} {ing.recipeUnit}
                  </Badge>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Instructions */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <ChefHat className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("Instructions")}</span>
          </div>
          {hasInstructions ? (
            <ol className="space-y-1.5">
              {steps.map((step, idx) => (
                <li key={idx} className="flex gap-2 text-sm">
                  <span className="shrink-0 font-semibold text-primary text-xs w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                    {idx + 1}
                  </span>
                  <span className="leading-snug">{step.replace(/^\d+\.\s*/, "")}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-xs text-muted-foreground italic">{t("No instructions yet — click Edit to add them.")}</p>
          )}
        </div>
      </div>
    </div>
  );
}

type DialogState =
  | { mode: "closed" }
  | { mode: "form"; menuItemId: number; menuItemName: string }
  | { mode: "view"; recipe: RecipeDetail; menuItemName: string };

export default function Recipes() {
  const { t, language } = useLanguage();
  const [dialog, setDialog] = useState<DialogState>({ mode: "closed" });
  const menuItems = useListMenuItems();
  const recipes = useListRecipes();

  const recipesByMenuItemId = new Map<number, RecipeDetail>(
    (recipes.data ?? []).map((r) => [r.menuItemId, r as RecipeDetail])
  );

  const openForm = (menuItemId: number, menuItemName: string) =>
    setDialog({ mode: "form", menuItemId, menuItemName });

  const openView = (recipe: RecipeDetail, menuItemName: string) =>
    setDialog({ mode: "view", recipe, menuItemName });

  const closeDialog = () => setDialog({ mode: "closed" });

  const dialogOpen = dialog.mode !== "closed";

  return (
    <div className="space-y-6" data-testid="page-recipes">
      <h1 className="text-2xl font-bold">{t("Recipes")}</h1>

      {menuItems.isLoading || recipes.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
        </div>
      ) : (
        <div className="space-y-2">
          {menuItems.data?.map((item) => {
            const recipe = recipesByMenuItemId.get(item.id);
            const itemName = language === "ur" && item.nameUr ? item.nameUr : item.name;
            return (
              <Card key={item.id} data-testid={`card-recipe-${item.id}`}>
                <CardContent className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{itemName}</p>
                      {recipe ? (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {recipe.ingredients.length} {t("ingredient(s)")}
                          {recipe.instructions ? ` · ${t("Instructions added")}` : ` · `}
                          {!recipe.instructions && <span className="text-amber-500">{t("No instructions")}</span>}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground mt-0.5">{t("No recipe defined")}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {recipe && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => openView(recipe, item.name)}
                          data-testid={`button-view-recipe-${item.id}`}
                        >
                          <BookOpen className="w-3 h-3 mr-1" /> {t("View")}
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => openForm(item.id, item.name)}
                        data-testid={`button-edit-recipe-${item.id}`}
                      >
                        {recipe ? (
                          <><Pencil className="w-3 h-3 mr-1" /> {t("Edit")}</>
                        ) : (
                          <><Plus className="w-3 h-3 mr-1" /> {t("Add Recipe")}</>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={dialogOpen && dialog.mode === "form"} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {t("Recipe")} — {dialog.mode === "form" ? dialog.menuItemName : ""}
            </DialogTitle>
          </DialogHeader>
          {dialog.mode === "form" && (
            <RecipeForm
              menuItemId={dialog.menuItemId}
              menuItemName={dialog.menuItemName}
              onClose={closeDialog}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={dialogOpen && dialog.mode === "view"} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ChefHat className="w-4 h-4" />
              {dialog.mode === "view" ? dialog.menuItemName : ""}
            </DialogTitle>
          </DialogHeader>
          {dialog.mode === "view" && (
            <div className="space-y-4">
              <RecipeCard recipe={dialog.recipe} language={language} t={t} />
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (dialog.mode === "view") {
                      openForm(dialog.recipe.menuItemId, dialog.menuItemName);
                    }
                  }}
                >
                  <Pencil className="w-3 h-3 mr-1" /> {t("Edit")}
                </Button>
                <Button variant="outline" size="sm" onClick={closeDialog}>{t("Close")}</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
