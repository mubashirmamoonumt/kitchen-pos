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
  getListCategoriesQueryKey,
  getListMenuItemsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight } from "lucide-react";

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
});
type ItemForm = z.infer<typeof itemSchema>;

export default function Menu() {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const qc = useQueryClient();
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
    defaultValues: { name: "", nameUr: "", price: "", categoryId: 0, isAvailable: true },
  });

  const openCatEdit = (cat?: any) => {
    catForm.reset(cat ? { name: cat.name, nameUr: cat.nameUr ?? "", description: cat.description ?? "", descriptionUr: cat.descriptionUr ?? "" } : { name: "", nameUr: "", description: "", descriptionUr: "" });
    setCatDialog({ open: true, editing: cat });
  };

  const openItemEdit = (item?: any) => {
    itemForm.reset(item ? { name: item.name, nameUr: item.nameUr ?? "", description: item.description ?? "", descriptionUr: item.descriptionUr ?? "", price: item.price, categoryId: item.categoryId, isAvailable: item.isAvailable } : { name: "", nameUr: "", price: "", categoryId: activeCategoryId ?? (categories.data?.[0]?.id ?? 0), isAvailable: true });
    setItemDialog({ open: true, editing: item });
  };

  const saveCat = (values: CategoryForm) => {
    const action = catDialog.editing
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
    const action = itemDialog.editing
      ? updateItem.mutate({ id: itemDialog.editing.id, data: values }, {
          onSuccess: () => { toast({ title: t("Item Updated") }); qc.invalidateQueries({ queryKey: getListMenuItemsQueryKey() }); setItemDialog({ open: false }); },
          onError: () => toast({ variant: "destructive", title: t("Error") }),
        })
      : createItem.mutate({ data: values }, {
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
          ) : (
            <div className="space-y-2">
              {menuItems.data?.map((item) => (
                <Card key={item.id} data-testid={`card-menu-item-${item.id}`}>
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{language === "ur" && item.nameUr ? item.nameUr : item.name}</span>
                          {!item.isAvailable && <Badge variant="outline" className="text-xs text-muted-foreground">{t("Unavailable")}</Badge>}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-primary font-semibold text-sm">PKR {Number(item.price).toLocaleString()}</span>
                          {item.description && <span className="text-xs text-muted-foreground truncate max-w-48">{item.description}</span>}
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
              ))}
            </div>
          )}
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
        <DialogContent>
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
              <div className="grid grid-cols-2 gap-4">
                <FormField control={itemForm.control} name="price" render={({ field }) => (
                  <FormItem><FormLabel>{t("Price")} (PKR)</FormLabel><FormControl><Input type="number" step="0.01" {...field} data-testid="input-item-price" /></FormControl><FormMessage /></FormItem>
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
