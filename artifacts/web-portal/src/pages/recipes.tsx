import { useState, useEffect } from "react";
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
  getListMenuItemsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2 } from "lucide-react";

const schema = z.object({
  menuItemId: z.number(),
  ingredients: z.array(z.object({
    ingredientId: z.number(),
    quantity: z.string().min(1),
  })).min(1, "Add at least one ingredient"),
});
type FormValues = z.infer<typeof schema>;

function RecipeForm({ menuItemId, onClose }: { menuItemId: number; onClose: () => void }) {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const qc = useQueryClient();
  const ingredients = useListIngredients();
  const existing = useGetRecipeByMenuItem(menuItemId, { query: { enabled: !!menuItemId, queryKey: ["getRecipeByMenuItem", menuItemId] } });
  const upsert = useUpsertRecipe();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      menuItemId,
      ingredients: existing.data?.ingredients?.map((i: any) => ({ ingredientId: i.ingredientId, quantity: i.quantity })) ?? [{ ingredientId: 0, quantity: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "ingredients" });

  const onSubmit = (values: FormValues) => {
    upsert.mutate(
      { menuItemId, data: { ingredients: values.ingredients.map((i) => ({ ingredientId: i.ingredientId, quantity: i.quantity })) } },
      {
        onSuccess: () => {
          toast({ title: t("Recipe Saved") });
          qc.invalidateQueries({ queryKey: getListRecipesQueryKey() });
          onClose();
        },
        onError: () => toast({ variant: "destructive", title: t("Error") }),
      }
    );
  };

  if (existing.isLoading) return <Skeleton className="h-48" />;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-3">
          {fields.map((field, index) => (
            <div key={field.id} className="flex items-end gap-3">
              <FormField control={form.control} name={`ingredients.${index}.ingredientId`} render={({ field: f }) => (
                <FormItem className="flex-1">
                  {index === 0 && <FormLabel>{t("Ingredient")}</FormLabel>}
                  <Select onValueChange={(v) => f.onChange(parseInt(v))} value={f.value?.toString() ?? ""}>
                    <FormControl><SelectTrigger><SelectValue placeholder={t("Select ingredient")} /></SelectTrigger></FormControl>
                    <SelectContent>
                      {ingredients.data?.map((i) => (
                        <SelectItem key={i.id} value={i.id.toString()}>
                          {language === "ur" && i.nameUr ? i.nameUr : i.name} ({i.unit})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
              <FormField control={form.control} name={`ingredients.${index}.quantity`} render={({ field: f }) => (
                <FormItem className="w-28">
                  {index === 0 && <FormLabel>{t("Quantity")}</FormLabel>}
                  <FormControl><Input type="number" step="0.01" placeholder="0.00" {...f} /></FormControl>
                </FormItem>
              )} />
              <Button type="button" variant="ghost" size="icon" className="text-destructive h-9 w-9 shrink-0" onClick={() => remove(index)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => append({ ingredientId: 0, quantity: "" })}>
          <Plus className="w-3 h-3 mr-1" /> {t("Add Ingredient")}
        </Button>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>{t("Cancel")}</Button>
          <Button type="submit" disabled={upsert.isPending} data-testid="button-save-recipe">{t("Save Recipe")}</Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

export default function Recipes() {
  const { t, language } = useLanguage();
  const qc = useQueryClient();
  const [dialog, setDialog] = useState<{ open: boolean; menuItemId?: number; menuItemName?: string }>({ open: false });
  const menuItems = useListMenuItems();
  const recipes = useListRecipes();

  useEffect(() => {
    qc.invalidateQueries({ queryKey: getListMenuItemsQueryKey() });
  }, []);

  const recipesMap = new Set(recipes.data?.map((r: any) => r.menuItemId) ?? []);

  return (
    <div className="space-y-6" data-testid="page-recipes">
      <h1 className="text-2xl font-bold">{t("Recipes")}</h1>

      {menuItems.isLoading || recipes.isLoading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : (
        <div className="space-y-2">
          {menuItems.data?.map((item) => {
            const recipe = recipes.data?.find((r: any) => r.menuItemId === item.id);
            return (
              <Card key={item.id} data-testid={`card-recipe-${item.id}`}>
                <CardContent className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{language === "ur" && item.nameUr ? item.nameUr : item.name}</p>
                      {recipe ? (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {recipe.ingredients.length} {t("ingredient(s)")}: {recipe.ingredients.map((i: any) => `${i.ingredientName} ${i.quantity} ${i.unit}`).join(", ")}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground mt-0.5">{t("No recipe defined")}</p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDialog({ open: true, menuItemId: item.id, menuItemName: item.name })}
                      data-testid={`button-edit-recipe-${item.id}`}
                    >
                      {recipe ? <><Pencil className="w-3 h-3 mr-1" /> {t("Edit")}</> : <><Plus className="w-3 h-3 mr-1" /> {t("Add Recipe")}</>}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialog.open} onOpenChange={(open) => setDialog({ open })}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("Recipe")} — {dialog.menuItemName}</DialogTitle>
          </DialogHeader>
          {dialog.menuItemId && (
            <RecipeForm menuItemId={dialog.menuItemId} onClose={() => setDialog({ open: false })} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
