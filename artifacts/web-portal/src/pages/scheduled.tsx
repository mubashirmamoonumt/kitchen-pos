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
import { Plus, Pencil, Trash2, CalendarClock } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  cancelled: "bg-red-100 text-red-800",
  completed: "bg-green-100 text-green-800",
};

const schema = z.object({
  scheduledAt: z.string().min(1),
  customerId: z.number().optional(),
  orderType: z.enum(["dine-in", "takeaway", "delivery"]),
  paymentMethod: z.enum(["cash", "jazzcash", "easypaisa"]),
  notes: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export default function Scheduled() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [dialog, setDialog] = useState<{ open: boolean; editing?: any }>({ open: false });

  const scheduledOrders = useListScheduledOrders();
  const customers = useListCustomers();
  const createOrder = useCreateScheduledOrder();
  const updateOrder = useUpdateScheduledOrder();
  const deleteOrder = useDeleteScheduledOrder();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { scheduledAt: "", orderType: "dine-in", paymentMethod: "cash", notes: "" },
  });

  const openEdit = (order?: any) => {
    form.reset(order ? {
      scheduledAt: order.scheduledAt?.slice(0, 16) ?? "",
      customerId: order.customerId,
      orderType: order.orderType,
      paymentMethod: order.paymentMethod,
      notes: order.notes ?? "",
    } : { scheduledAt: "", orderType: "dine-in", paymentMethod: "cash", notes: "" });
    setDialog({ open: true, editing: order });
  };

  const onSave = (values: FormValues) => {
    const opts = {
      onSuccess: () => {
        toast({ title: dialog.editing ? t("Schedule Updated") : t("Order Scheduled") });
        qc.invalidateQueries({ queryKey: getListScheduledOrdersQueryKey() });
        setDialog({ open: false });
      },
      onError: () => toast({ variant: "destructive", title: t("Error") }),
    };
    if (dialog.editing) {
      updateOrder.mutate({ id: dialog.editing.id, data: values }, opts);
    } else {
      createOrder.mutate({ data: values }, opts);
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
          {scheduledOrders.data?.map((order: any) => (
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
                        {new Date(order.scheduledAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <span>·</span>
                      <span capitalize>{order.orderType}</span>
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
        <DialogContent>
          <DialogHeader><DialogTitle>{dialog.editing ? t("Edit Schedule") : t("Schedule Order")}</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSave)} className="space-y-4">
              <FormField control={form.control} name="scheduledAt" render={({ field }) => (
                <FormItem><FormLabel>{t("Scheduled Time")}</FormLabel><FormControl><Input type="datetime-local" {...field} data-testid="input-scheduled-at" /></FormControl><FormMessage /></FormItem>
              )} />
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
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="orderType" render={({ field }) => (
                  <FormItem><FormLabel>{t("Order Type")}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="dine-in">{t("Dine-in")}</SelectItem>
                        <SelectItem value="takeaway">{t("Takeaway")}</SelectItem>
                        <SelectItem value="delivery">{t("Delivery")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="paymentMethod" render={({ field }) => (
                  <FormItem><FormLabel>{t("Payment")}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="cash">{t("Cash")}</SelectItem>
                        <SelectItem value="jazzcash">{t("JazzCash")}</SelectItem>
                        <SelectItem value="easypaisa">{t("EasyPaisa")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
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
