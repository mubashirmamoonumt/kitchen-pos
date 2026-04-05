import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  useListIngredients,
  useCreateIngredient,
  useUpdateIngredient,
  useDeleteIngredient,
  useAdjustIngredientStock,
  useListInventoryLogs,
  getListIngredientsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, ArrowUpDown } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const ingredientSchema = z.object({
  name: z.string().min(1),
  nameUr: z.string().optional(),
  unit: z.string().min(1),
  stockQuantity: z.string(),
  lowStockThreshold: z.string(),
});
type IngredientForm = z.infer<typeof ingredientSchema>;

const adjustSchema = z.object({
  adjustment: z.string().refine((v) => !isNaN(parseFloat(v)), "Must be a number"),
  reason: z.string().optional(),
});
type AdjustForm = z.infer<typeof adjustSchema>;

export default function Inventory() {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [dialog, setDialog] = useState<{ open: boolean; editing?: any }>({ open: false });
  const [adjustDialog, setAdjustDialog] = useState<{ open: boolean; ingredient?: any }>({ open: false });

  const ingredients = useListIngredients({ params: lowStockOnly ? { lowStock: true } : undefined });
  const inventoryLogs = useListInventoryLogs();
  const createIngredient = useCreateIngredient();
  const updateIngredient = useUpdateIngredient();
  const deleteIngredient = useDeleteIngredient();
  const adjustStock = useAdjustIngredientStock();

  const form = useForm<IngredientForm>({
    resolver: zodResolver(ingredientSchema),
    defaultValues: { name: "", nameUr: "", unit: "", stockQuantity: "0", lowStockThreshold: "0" },
  });

  const adjustForm = useForm<AdjustForm>({
    resolver: zodResolver(adjustSchema),
    defaultValues: { adjustment: "", reason: "" },
  });

  const openEdit = (ingredient?: any) => {
    form.reset(ingredient
      ? { name: ingredient.name, nameUr: ingredient.nameUr ?? "", unit: ingredient.unit, stockQuantity: ingredient.stockQuantity, lowStockThreshold: ingredient.lowStockThreshold }
      : { name: "", nameUr: "", unit: "", stockQuantity: "0", lowStockThreshold: "0" }
    );
    setDialog({ open: true, editing: ingredient });
  };

  const onSave = (values: IngredientForm) => {
    const opts = {
      onSuccess: () => {
        toast({ title: dialog.editing ? t("Ingredient Updated") : t("Ingredient Created") });
        qc.invalidateQueries({ queryKey: getListIngredientsQueryKey() });
        setDialog({ open: false });
      },
      onError: () => toast({ variant: "destructive", title: t("Error") }),
    };
    if (dialog.editing) {
      updateIngredient.mutate({ id: dialog.editing.id, data: values }, opts);
    } else {
      createIngredient.mutate({ data: values }, opts);
    }
  };

  const onAdjust = (values: AdjustForm) => {
    if (!adjustDialog.ingredient) return;
    adjustStock.mutate(
      { id: adjustDialog.ingredient.id, data: values },
      {
        onSuccess: () => {
          toast({ title: t("Stock Adjusted") });
          qc.invalidateQueries({ queryKey: getListIngredientsQueryKey() });
          setAdjustDialog({ open: false });
        },
        onError: () => toast({ variant: "destructive", title: t("Error") }),
      }
    );
  };

  const handleDelete = (id: number) => {
    deleteIngredient.mutate({ id }, {
      onSuccess: () => { toast({ title: t("Ingredient Deleted") }); qc.invalidateQueries({ queryKey: getListIngredientsQueryKey() }); },
      onError: () => toast({ variant: "destructive", title: t("Error") }),
    });
  };

  return (
    <div className="space-y-6" data-testid="page-inventory">
      <h1 className="text-2xl font-bold">{t("Inventory")}</h1>

      <Tabs defaultValue="ingredients">
        <TabsList>
          <TabsTrigger value="ingredients">{t("Ingredients")}</TabsTrigger>
          <TabsTrigger value="logs">{t("Activity Log")}</TabsTrigger>
        </TabsList>

        <TabsContent value="ingredients" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch checked={lowStockOnly} onCheckedChange={setLowStockOnly} id="low-stock-filter" data-testid="switch-low-stock" />
              <Label htmlFor="low-stock-filter" className="text-sm">{t("Low Stock Only")}</Label>
            </div>
            <Button onClick={() => openEdit()} data-testid="button-add-ingredient">
              <Plus className="w-4 h-4 mr-2" /> {t("Add Ingredient")}
            </Button>
          </div>

          {ingredients.isLoading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
          ) : ingredients.data?.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">{t("No ingredients found")}</CardContent></Card>
          ) : (
            <div className="space-y-2">
              {ingredients.data?.map((ing) => (
                <Card key={ing.id} data-testid={`card-ingredient-${ing.id}`}>
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{language === "ur" && ing.nameUr ? ing.nameUr : ing.name}</span>
                          {ing.isLowStock && <Badge variant="destructive" className="text-xs">{t("Low Stock")}</Badge>}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                          <span>{t("Stock")}: <span className={`font-medium ${ing.isLowStock ? "text-destructive" : "text-foreground"}`}>{ing.stockQuantity} {ing.unit}</span></span>
                          <span>{t("Min")}: {ing.lowStockThreshold} {ing.unit}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="sm" className="text-xs" onClick={() => { adjustForm.reset({ adjustment: "", reason: "" }); setAdjustDialog({ open: true, ingredient: ing }); }} data-testid={`button-adjust-${ing.id}`}>
                          <ArrowUpDown className="w-3 h-3 mr-1" /> {t("Adjust")}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(ing)} data-testid={`button-edit-ingredient-${ing.id}`}>
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(ing.id)} data-testid={`button-delete-ingredient-${ing.id}`}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          <Card>
            <CardContent className="pt-4">
              {inventoryLogs.isLoading ? (
                <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
              ) : inventoryLogs.data?.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">{t("No inventory logs yet")}</p>
              ) : (
                <div className="space-y-1">
                  {inventoryLogs.data?.map((log) => (
                    <div key={log.id} className="flex items-center justify-between py-2 border-b last:border-0 text-sm" data-testid={`row-log-${log.id}`}>
                      <div>
                        <span className="font-medium">{log.ingredientName}</span>
                        <span className="text-muted-foreground ml-2">{log.reason}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-muted-foreground">{log.quantityBefore} → {log.quantityAfter}</span>
                        <span className={`font-semibold ${parseFloat(log.change) >= 0 ? "text-green-600" : "text-destructive"}`}>
                          {parseFloat(log.change) >= 0 ? "+" : ""}{log.change}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add/Edit ingredient dialog */}
      <Dialog open={dialog.open} onOpenChange={(open) => setDialog({ open })}>
        <DialogContent>
          <DialogHeader><DialogTitle>{dialog.editing ? t("Edit Ingredient") : t("New Ingredient")}</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSave)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>{t("Name")} (EN)</FormLabel><FormControl><Input {...field} data-testid="input-ingredient-name" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="nameUr" render={({ field }) => (
                  <FormItem><FormLabel>{t("Name")} (UR)</FormLabel><FormControl><Input {...field} dir="rtl" className="font-urdu" /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="unit" render={({ field }) => (
                <FormItem><FormLabel>{t("Unit")}</FormLabel><FormControl><Input {...field} placeholder="kg, g, L, pcs..." /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="stockQuantity" render={({ field }) => (
                  <FormItem><FormLabel>{t("Stock Quantity")}</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="lowStockThreshold" render={({ field }) => (
                  <FormItem><FormLabel>{t("Low Stock Threshold")}</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialog({ open: false })}>{t("Cancel")}</Button>
                <Button type="submit" disabled={createIngredient.isPending || updateIngredient.isPending} data-testid="button-save-ingredient">{t("Save")}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Adjust stock dialog */}
      <Dialog open={adjustDialog.open} onOpenChange={(open) => setAdjustDialog({ open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("Adjust Stock")} — {adjustDialog.ingredient?.name}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t("Current stock")}: <span className="font-medium">{adjustDialog.ingredient?.stockQuantity} {adjustDialog.ingredient?.unit}</span></p>
          <Form {...adjustForm}>
            <form onSubmit={adjustForm.handleSubmit(onAdjust)} className="space-y-4">
              <FormField control={adjustForm.control} name="adjustment" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("Adjustment")} (+/-)</FormLabel>
                  <FormControl><Input type="number" step="0.01" placeholder="-5 or +10" {...field} data-testid="input-adjustment" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={adjustForm.control} name="reason" render={({ field }) => (
                <FormItem><FormLabel>{t("Reason")}</FormLabel><FormControl><Input {...field} placeholder="Restocked, used in cooking..." /></FormControl></FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setAdjustDialog({ open: false })}>{t("Cancel")}</Button>
                <Button type="submit" disabled={adjustStock.isPending} data-testid="button-submit-adjust">{t("Adjust")}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
