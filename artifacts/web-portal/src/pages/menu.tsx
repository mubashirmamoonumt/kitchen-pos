import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  useListCategories,
  useListMenuItems,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  useCreateMenuItem,
  useUpdateMenuItem,
  useDeleteMenuItem,
  useToggleMenuItemAvailability,
  useGetMe,
  getListCategoriesQueryKey,
  getListMenuItemsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, TrendingUp } from "lucide-react";

const categorySchema = z.object({
  name: z.string().min(1),
  nameUr: z.string().optional(),
  description: z.string().optional(),
  descriptionUr: z.string().optional(),
});
type CategoryForm = z.infer<typeof categorySchema>;

const itemSchema = z.object({
  name: z.string().min(1),
  nameUr: z.string().optional(),
  description: z.string().optional(),
  descriptionUr: z.string().optional(),
  price: z.string().min(1),
  categoryId: z.number(),
  isAvailable: z.boolean().default(true),
  unit: z.string().optional(),
  internalCost: z.string().optional(),
  defaultDiscountPct: z.string().optional(),
});
type ItemForm = z.infer<typeof itemSchema>;

export default function Menu() {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const qc = useQueryClient();
  const me = useGetMe();
  const isOwner = me.data?.role === "owner";
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null);
  const [catDialog, setCatDialog] = useState<{ open: boolean; editing?: any }>({ open: false });
  const [itemDialog, setItemDialog] = useState<{ open: boolean; editing?: any }>({ open: false });

  const categories = useListCategories();
  const menuItems = useListMenuItems({ params: activeCategoryId ? { categoryId: activeCategoryId } : undefined });

  const createCat = useCreateCategory();
  const updateCat = useUpdateCategory();
  const deleteCat = useDeleteCategory();
  const createItem = useCreateMenuItem();
  const updateItem = useUpdateMenuItem();
  const deleteItem = useDeleteMenuItem();
  const toggleAvail = useToggleMenuItemAvailability();

  const catForm = useForm<CategoryForm>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: "", nameUr: "", description: "", descriptionUr: "" },
  });

  const itemForm = useForm<ItemForm>({
    resolver: zodResolver(itemSchema),
    defaultValues: { name: "", nameUr: "", price: "", categoryId: 0, isAvailable: true, unit: "qty", internalCost: "", defaultDiscountPct: "0" },
  });

  const openCatEdit = (cat?: any) => {
    catForm.reset(cat ? { name: cat.name, nameUr: cat.nameUr ?? "", description: cat.description ?? "", descriptionUr: cat.descriptionUr ?? "" } : { name: "", nameUr: "", description: "", descriptionUr: "" });
    setCatDialog({ open: true, editing: cat });
  };

  const openItemEdit = (item?: any) => {
    itemForm.reset(item ? {
      name: item.name,
      nameUr: item.nameUr ?? "",
      description: item.description ?? "",
      descriptionUr: item.descriptionUr ?? "",
      price: item.price,
      categoryId: item.categoryId,
      isAvailable: item.isAvailable,
      unit: item.unit ?? "qty",
      internalCost: item.internalCost ?? "",
      defaultDiscountPct: item.defaultDiscountPct ?? "0",
    } : {
      name: "",
      nameUr: "",
      price: "",
      categoryId: activeCategoryId ?? (categories.data?.[0]?.id ?? 0),
      isAvailable: true,
      unit: "qty",
      internalCost: "",
      defaultDiscountPct: "0",
    });
    setItemDialog({ open: true, editing: item });
  };

  const saveCat = (values: CategoryForm) => {
    catDialog.editing
      ? updateCat.mutate({ id: catDialog.editing.id, data: values }, {
          onSuccess: () => { toast({ title: t("Category Updated") }); qc.invalidateQueries({ queryKey: getListCategoriesQueryKey() }); setCatDialog({ open: false }); },
          onError: () => toast({ variant: "destructive", title: t("Error") }),
        })
      : createCat.mutate({ data: values }, {
          onSuccess: () => { toast({ title: t("Category Created") }); qc.invalidateQueries({ queryKey: getListCategoriesQueryKey() }); setCatDialog({ open: false }); },
          onError: () => toast({ variant: "destructive", title: t("Error") }),
        });
  };

  const saveItem = (values: ItemForm) => {
    const payload = {
      ...values,
      internalCost: values.internalCost || undefined,
      defaultDiscountPct: values.defaultDiscountPct || "0",
    };
    itemDialog.editing
      ? updateItem.mutate({ id: itemDialog.editing.id, data: payload }, {
          onSuccess: () => { toast({ title: t("Item Updated") }); qc.invalidateQueries({ queryKey: getListMenuItemsQueryKey() }); setItemDialog({ open: false }); },
          onError: () => toast({ variant: "destructive", title: t("Error") }),
        })
      : createItem.mutate({ data: payload }, {
          onSuccess: () => { toast({ title: t("Item Created") }); qc.invalidateQueries({ queryKey: getListMenuItemsQueryKey() }); setItemDialog({ open: false }); },
          onError: () => toast({ variant: "destructive", title: t("Error") }),
        });
  };

  const handleDeleteCat = (id: number) => {
    deleteCat.mutate({ id }, {
      onSuccess: () => { toast({ title: t("Category Deleted") }); qc.invalidateQueries({ queryKey: getListCategoriesQueryKey() }); if (activeCategoryId === id) setActiveCategoryId(null); },
      onError: () => toast({ variant: "destructive", title: t("Error") }),
    });
  };

  const handleDeleteItem = (id: number) => {
    deleteItem.mutate({ id }, {
      onSuccess: () => { toast({ title: t("Item Deleted") }); qc.invalidateQueries({ queryKey: getListMenuItemsQueryKey() }); },
      onError: () => toast({ variant: "destructive", title: t("Error") }),
    });
  };

  const handleToggleAvail = (id: number) => {
    toggleAvail.mutate({ id }, {
      onSuccess: () => qc.invalidateQueries({ queryKey: getListMenuItemsQueryKey() }),
      onError: () => toast({ variant: "destructive", title: t("Error") }),
    });
  };

  const getMarginPct = (price: string, cost: string | null | undefined) => {
    if (!cost || parseFloat(cost) === 0) return null;
    const p = parseFloat(price);
    const c = parseFloat(cost);
    return Math.round(((p - c) / p) * 100);
  };

  return (
    <div className="space-y-6" data-testid="page-menu">
      <h1 className="text-2xl font-bold">{t("Menu")}</h1>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Categories */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">{t("Categories")}</h2>
            <Button size="sm" variant="outline" onClick={() => openCatEdit()} data-testid="button-add-category">
              <Plus className="w-4 h-4 mr-1" /> {t("Add")}
            </Button>
          </div>
          {categories.isLoading ? <Skeleton className="h-40" /> : (
            <div className="space-y-1">
              <button
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${activeCategoryId === null ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                onClick={() => setActiveCategoryId(null)}
                data-testid="button-category-all"
              >
                {t("All Items")} ({menuItems.data?.length ?? "..."})
              </button>
              {categories.data?.map((cat) => (
                <div key={cat.id} className={`flex items-center justify-between px-3 py-2 rounded-md cursor-pointer transition-colors ${activeCategoryId === cat.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`} onClick={() => setActiveCategoryId(cat.id)} data-testid={`button-category-${cat.id}`}>
                  <span className="text-sm font-medium">{language === "ur" && cat.nameUr ? cat.nameUr : cat.name}</span>
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openCatEdit(cat)} data-testid={`button-edit-category-${cat.id}`}>
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDeleteCat(cat.id)} data-testid={`button-delete-category-${cat.id}`}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Menu items */}
        <div className="md:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">{t("Items")}</h2>
            <Button size="sm" onClick={() => openItemEdit()} data-testid="button-add-item">
              <Plus className="w-4 h-4 mr-1" /> {t("Add Item")}
            </Button>
          </div>
          {menuItems.isLoading ? (
            <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
          ) : menuItems.data?.length === 0 ? (
            <Card><CardContent className="py-10 text-center text-muted-foreground">{t("No items in this category")}</CardContent></Card>
          ) : (() => {
            const renderItem = (item: NonNullable<typeof menuItems.data>[0]) => {
              const margin = isOwner ? getMarginPct(item.price, item.internalCost) : null;
              return (
                <Card key={item.id} data-testid={`card-menu-item-${item.id}`}>
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{language === "ur" && item.nameUr ? item.nameUr : item.name}</span>
                          {!item.isAvailable && <Badge variant="outline" className="text-xs text-muted-foreground">{t("Unavailable")}</Badge>}
                          <Badge variant="outline" className="text-xs text-muted-foreground">{item.unit}</Badge>
                          {parseFloat(item.defaultDiscountPct ?? "0") > 0 && (
                            <Badge variant="secondary" className="text-xs">{item.defaultDiscountPct}% {t("off")}</Badge>
                          )}
                          {margin !== null && (
                            <Badge className={`text-xs flex items-center gap-0.5 ${margin >= 50 ? "bg-green-100 text-green-800 border-green-200" : margin >= 25 ? "bg-yellow-100 text-yellow-800 border-yellow-200" : "bg-red-100 text-red-800 border-red-200"}`} variant="outline">
                              <TrendingUp className="w-2.5 h-2.5" />
                              {margin}%
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-primary font-semibold text-sm">PKR {Number(item.price).toLocaleString()}</span>
                          {isOwner && item.internalCost && <span className="text-xs text-muted-foreground">cost: PKR {Number(item.internalCost).toLocaleString()}</span>}
                          {item.description && <span className="text-xs text-muted-foreground truncate max-w-40">{item.description}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleToggleAvail(item.id)} data-testid={`button-toggle-${item.id}`}>
                          {item.isAvailable ? <ToggleRight className="w-4 h-4 text-green-600" /> : <ToggleLeft className="w-4 h-4 text-muted-foreground" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openItemEdit(item)} data-testid={`button-edit-item-${item.id}`}>
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteItem(item.id)} data-testid={`button-delete-item-${item.id}`}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            };

            if (activeCategoryId !== null) {
              return <div className="space-y-2">{menuItems.data?.map(renderItem)}</div>;
            }

            const catMap = new Map(categories.data?.map((c) => [c.id, c]));
            const grouped = new Map<number | null, NonNullable<typeof menuItems.data>>();
            for (const item of menuItems.data ?? []) {
              const catId = item.categoryId ?? null;
              if (!grouped.has(catId)) grouped.set(catId, []);
              grouped.get(catId)!.push(item);
            }

            return (
              <div className="space-y-5">
                {[...grouped.entries()].map(([catId, items]) => {
                  const cat = catId !== null ? catMap.get(catId) : null;
                  const catLabel = cat ? (language === "ur" && cat.nameUr ? cat.nameUr : cat.name) : t("Uncategorized");
                  return (
                    <div key={catId ?? "uncategorized"}>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 border-b pb-1">{catLabel}</h3>
                      <div className="space-y-2">{items.map(renderItem)}</div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Category dialog */}
      <Dialog open={catDialog.open} onOpenChange={(open) => setCatDialog({ open })}>
        <DialogContent>
          <DialogHeader><DialogTitle>{catDialog.editing ? t("Edit Category") : t("New Category")}</DialogTitle></DialogHeader>
          <Form {...catForm}>
            <form onSubmit={catForm.handleSubmit(saveCat)} className="space-y-4">
              <FormField control={catForm.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>{t("Name")} (English)</FormLabel><FormControl><Input {...field} data-testid="input-category-name" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={catForm.control} name="nameUr" render={({ field }) => (
                <FormItem><FormLabel>{t("Name")} (اردو)</FormLabel><FormControl><Input {...field} dir="rtl" className="font-urdu" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={catForm.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>{t("Description")}</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCatDialog({ open: false })}>{t("Cancel")}</Button>
                <Button type="submit" disabled={createCat.isPending || updateCat.isPending} data-testid="button-save-category">{t("Save")}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Item dialog */}
      <Dialog open={itemDialog.open} onOpenChange={(open) => setItemDialog({ open })}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{itemDialog.editing ? t("Edit Item") : t("New Item")}</DialogTitle></DialogHeader>
          <Form {...itemForm}>
            <form onSubmit={itemForm.handleSubmit(saveItem)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={itemForm.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>{t("Name")} (EN)</FormLabel><FormControl><Input {...field} data-testid="input-item-name" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={itemForm.control} name="nameUr" render={({ field }) => (
                  <FormItem><FormLabel>{t("Name")} (UR)</FormLabel><FormControl><Input {...field} dir="rtl" className="font-urdu" /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <FormField control={itemForm.control} name="price" render={({ field }) => (
                  <FormItem><FormLabel>{t("Price")} (PKR)</FormLabel><FormControl><Input type="number" step="0.01" min="0" {...field} data-testid="input-item-price" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={itemForm.control} name="unit" render={({ field }) => (
                  <FormItem><FormLabel>{t("Unit")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? "qty"}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="qty">{t("qty")}</SelectItem>
                        <SelectItem value="kg">{t("kg")}</SelectItem>
                        <SelectItem value="g">{t("g")}</SelectItem>
                        <SelectItem value="dozen">{t("dozen")}</SelectItem>
                        <SelectItem value="litre">{t("litre")}</SelectItem>
                        <SelectItem value="piece">{t("piece")}</SelectItem>
                        <SelectItem value="portion">{t("portion")}</SelectItem>
                      </SelectContent>
                    </Select>
                  <FormMessage /></FormItem>
                )} />
                <FormField control={itemForm.control} name="categoryId" render={({ field }) => (
                  <FormItem><FormLabel>{t("Category")}</FormLabel>
                    <Select onValueChange={(v) => field.onChange(parseInt(v))} value={field.value?.toString()}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {categories.data?.map((c) => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  <FormMessage /></FormItem>
                )} />
              </div>
              {isOwner && (
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={itemForm.control} name="internalCost" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("Internal Cost")} (PKR)</FormLabel>
                      <FormControl><Input type="number" step="0.01" min="0" placeholder="0.00" {...field} data-testid="input-item-cost" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={itemForm.control} name="defaultDiscountPct" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("Default Discount")} (%)</FormLabel>
                      <FormControl><Input type="number" step="0.1" min="0" max="100" placeholder="0" {...field} data-testid="input-item-discount" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              )}
              <FormField control={itemForm.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>{t("Description")}</FormLabel><FormControl><Textarea {...field} rows={2} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={itemForm.control} name="isAvailable" render={({ field }) => (
                <FormItem className="flex items-center gap-2"><FormLabel>{t("Available")}</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setItemDialog({ open: false })}>{t("Cancel")}</Button>
                <Button type="submit" disabled={createItem.isPending || updateItem.isPending} data-testid="button-save-item">{t("Save")}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
