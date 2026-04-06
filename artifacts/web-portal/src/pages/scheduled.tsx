import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  useListScheduledOrders,
  useCreateScheduledOrder,
  useUpdateScheduledOrder,
  useDeleteScheduledOrder,
  useListMenuItems,
  useListCustomers,
  getListScheduledOrdersQueryKey,
  type CreateScheduledOrderBody,
  type UpdateScheduledOrderBody,
  type ScheduledOrderItem,
  type ScheduledOrder,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2, CalendarClock, Minus } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  cancelled: "bg-red-100 text-red-800",
  completed: "bg-green-100 text-green-800",
};

interface CartItem {
  menuItemId: number;
  itemName: string;
  quantity: number;
  unitPrice: string;
}

const schema = z.object({
  scheduledDate: z.string().min(1, "Date required"),
  scheduledTime: z.string().min(1, "Time required"),
  customerId: z.number().optional(),
  notes: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export default function Scheduled() {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [dialog, setDialog] = useState<{ open: boolean; editing?: ScheduledOrder }>({ open: false });
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedMenuItemId, setSelectedMenuItemId] = useState<string>("");

  const scheduledOrders = useListScheduledOrders();
  const customers = useListCustomers();
  const menuItems = useListMenuItems({ isAvailable: true });
  const createOrder = useCreateScheduledOrder();
  const updateOrder = useUpdateScheduledOrder();
  const deleteOrder = useDeleteScheduledOrder();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { scheduledDate: "", scheduledTime: "", notes: "" },
  });

  const openEdit = (order?: ScheduledOrder) => {
    setCart([]);
    setSelectedMenuItemId("");
    if (order) {
      form.reset({
        scheduledDate: order.scheduledDate ?? "",
        scheduledTime: order.scheduledTime ?? "",
        customerId: order.customerId ?? undefined,
        notes: order.notes ?? "",
      });
      if (order.items?.length) {
        setCart(order.items.map((i) => ({
          menuItemId: i.menuItemId,
          itemName: i.itemName,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })));
      }
    } else {
      form.reset({ scheduledDate: "", scheduledTime: "", notes: "" });
    }
    setDialog({ open: true, editing: order });
  };

  const addToCart = () => {
    if (!selectedMenuItemId) return;
    const id = parseInt(selectedMenuItemId);
    const item = menuItems.data?.find((m) => m.id === id);
    if (!item) return;
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItemId === id);
      if (existing) {
        return prev.map((c) => c.menuItemId === id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, {
        menuItemId: id,
        itemName: (language === "ur" && item.nameUr) ? item.nameUr : item.name,
        quantity: 1,
        unitPrice: String(item.price),
      }];
    });
    setSelectedMenuItemId("");
  };

  const updateCartQty = (menuItemId: number, delta: number) => {
    setCart((prev) => {
      const updated = prev.map((c) => c.menuItemId === menuItemId ? { ...c, quantity: Math.max(0, c.quantity + delta) } : c);
      return updated.filter((c) => c.quantity > 0);
    });
  };

  const buildItems = (): ScheduledOrderItem[] =>
    cart.map((c) => ({
      menuItemId: c.menuItemId,
      itemName: c.itemName,
      quantity: c.quantity,
      unitPrice: c.unitPrice,
    }));

  const onSave = (values: FormValues) => {
    if (cart.length === 0 && !dialog.editing) {
      toast({ variant: "destructive", title: t("Error"), description: t("Add at least one item") });
      return;
    }
    const opts = {
      onSuccess: () => {
        toast({ title: dialog.editing ? t("Schedule Updated") : t("Order Scheduled") });
        qc.invalidateQueries({ queryKey: getListScheduledOrdersQueryKey() });
        setDialog({ open: false });
      },
      onError: () => toast({ variant: "destructive", title: t("Error") }),
    };
    if (dialog.editing) {
      const data: UpdateScheduledOrderBody = {
        scheduledDate: values.scheduledDate,
        scheduledTime: values.scheduledTime,
        customerId: values.customerId,
        notes: values.notes,
        items: buildItems(),
      };
      updateOrder.mutate({ id: dialog.editing.id, data }, opts);
    } else {
      const data: CreateScheduledOrderBody = {
        scheduledDate: values.scheduledDate,
        scheduledTime: values.scheduledTime,
        customerId: values.customerId,
        notes: values.notes,
        items: buildItems(),
      };
      createOrder.mutate({ data }, opts);
    }
  };

  const handleDelete = (id: number) => {
    deleteOrder.mutate({ id }, {
      onSuccess: () => { toast({ title: t("Schedule Deleted") }); qc.invalidateQueries({ queryKey: getListScheduledOrdersQueryKey() }); },
      onError: () => toast({ variant: "destructive", title: t("Error") }),
    });
  };

  return (
    <div className="space-y-6" data-testid="page-scheduled">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("Scheduled")}</h1>
        <Button onClick={() => openEdit()} data-testid="button-add-scheduled">
          <Plus className="w-4 h-4 mr-2" /> {t("Schedule Order")}
        </Button>
      </div>

      {scheduledOrders.isLoading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : scheduledOrders.data?.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <CalendarClock className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">{t("No scheduled orders")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {scheduledOrders.data?.map((order) => (
            <Card key={order.id} data-testid={`card-scheduled-${order.id}`}>
              <CardContent className="py-3 px-4">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">#{order.id}</span>
                      <Badge className={`text-xs capitalize ${STATUS_COLORS[order.status] ?? ""}`} variant="outline">
                        {t(order.status.charAt(0).toUpperCase() + order.status.slice(1))}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{order.customerName || "Walk-in"}</span>
                      <span>·</span>
                      <span className="font-medium text-foreground">
                        {order.scheduledDate} {order.scheduledTime}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(order)} data-testid={`button-edit-scheduled-${order.id}`}>
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(order.id)} data-testid={`button-delete-scheduled-${order.id}`}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialog.open} onOpenChange={(open) => setDialog({ open })}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{dialog.editing ? t("Edit Schedule") : t("Schedule Order")}</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSave)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="scheduledDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("Date")}</FormLabel>
                    <FormControl><Input type="date" {...field} data-testid="input-scheduled-date" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="scheduledTime" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("Time")}</FormLabel>
                    <FormControl><Input type="time" {...field} data-testid="input-scheduled-time" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="customerId" render={({ field }) => (
                <FormItem><FormLabel>{t("Customer")} ({t("Optional")})</FormLabel>
                  <Select onValueChange={(v) => field.onChange(v ? parseInt(v) : undefined)} value={field.value?.toString()}>
                    <FormControl><SelectTrigger><SelectValue placeholder={t("Walk-in")} /></SelectTrigger></FormControl>
                    <SelectContent>
                      {customers.data?.map((c) => <SelectItem key={c.id} value={c.id.toString()}>{c.name} {c.phone ? `(${c.phone})` : ""}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />

              <div className="space-y-2">
                <FormLabel>{t("Items")}</FormLabel>
                <div className="flex gap-2">
                  <Select onValueChange={setSelectedMenuItemId} value={selectedMenuItemId}>
                    <SelectTrigger className="flex-1" data-testid="select-scheduled-menu-item">
                      <SelectValue placeholder={t("Select item...")} />
                    </SelectTrigger>
                    <SelectContent>
                      {menuItems.data?.map((m) => (
                        <SelectItem key={m.id} value={m.id.toString()}>
                          {(language === "ur" && m.nameUr) ? m.nameUr : m.name} — PKR {Number(m.price).toLocaleString()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="outline" onClick={addToCart} disabled={!selectedMenuItemId} data-testid="button-add-scheduled-item">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {cart.length > 0 && (
                  <div className="space-y-1 mt-2">
                    {cart.map((c) => (
                      <div key={c.menuItemId} className="flex items-center justify-between text-sm border rounded px-3 py-1.5">
                        <span className="flex-1">{c.itemName}</span>
                        <div className="flex items-center gap-2">
                          <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateCartQty(c.menuItemId, -1)}>
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="w-5 text-center">{c.quantity}</span>
                          <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateCartQty(c.menuItemId, 1)}>
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                        <span className="text-muted-foreground ml-3">PKR {(Number(c.unitPrice) * c.quantity).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
                {cart.length === 0 && !dialog.editing && (
                  <p className="text-xs text-muted-foreground">{t("Add at least one item")}</p>
                )}
              </div>

              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem><FormLabel>{t("Notes")}</FormLabel><FormControl><Textarea {...field} rows={2} /></FormControl></FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialog({ open: false })}>{t("Cancel")}</Button>
                <Button type="submit" disabled={createOrder.isPending || updateOrder.isPending} data-testid="button-save-scheduled">{t("Save")}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

