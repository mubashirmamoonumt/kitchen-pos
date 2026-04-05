import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  useListCustomers,
  useCreateCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
  useGetCustomer,
  getListCustomersQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Pencil, Trash2, Eye } from "lucide-react";

const schema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  address: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

function CustomerDetail({ customerId }: { customerId: number }) {
  const { t } = useLanguage();
  const customer = useGetCustomer(customerId, { query: { enabled: !!customerId, queryKey: ["getCustomer", customerId] } });
  if (customer.isLoading) return <Skeleton className="h-48" />;
  if (!customer.data) return null;
  const c = customer.data as any;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div><span className="text-muted-foreground">{t("Phone")}:</span> <span className="font-medium">{c.phone || "—"}</span></div>
        <div><span className="text-muted-foreground">{t("Total Orders")}:</span> <span className="font-medium">{c.totalOrders}</span></div>
        <div><span className="text-muted-foreground">{t("Total Spent")}:</span> <span className="font-medium">PKR {Number(c.totalSpent).toLocaleString()}</span></div>
        {c.address && <div className="col-span-2"><span className="text-muted-foreground">{t("Address")}:</span> <span>{c.address}</span></div>}
      </div>
      {c.recentOrders?.length > 0 && (
        <div>
          <h4 className="font-semibold text-sm mb-2">{t("Recent Orders")}</h4>
          <div className="space-y-1">
            {c.recentOrders.map((o: any) => (
              <div key={o.id} className="flex justify-between text-sm py-1.5 border-b last:border-0" data-testid={`row-customer-order-${o.id}`}>
                <span>#{o.id} <span className="text-muted-foreground capitalize">{o.status}</span></span>
                <span className="font-medium">PKR {Number(o.totalAmount).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Customers() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState<{ open: boolean; editing?: any }>({ open: false });
  const [detailId, setDetailId] = useState<number | null>(null);

  const customers = useListCustomers({ params: search ? { search } : undefined });
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const deleteCustomer = useDeleteCustomer();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", phone: "", address: "" },
  });

  const openEdit = (customer?: any) => {
    form.reset(customer ? { name: customer.name, phone: customer.phone ?? "", address: customer.address ?? "" } : { name: "", phone: "", address: "" });
    setDialog({ open: true, editing: customer });
  };

  const onSave = (values: FormValues) => {
    const opts = {
      onSuccess: () => {
        toast({ title: dialog.editing ? t("Customer Updated") : t("Customer Created") });
        qc.invalidateQueries({ queryKey: getListCustomersQueryKey() });
        setDialog({ open: false });
      },
      onError: () => toast({ variant: "destructive", title: t("Error") }),
    };
    if (dialog.editing) {
      updateCustomer.mutate({ id: dialog.editing.id, data: values }, opts);
    } else {
      createCustomer.mutate({ data: values }, opts);
    }
  };

  const handleDelete = (id: number) => {
    deleteCustomer.mutate({ id }, {
      onSuccess: () => { toast({ title: t("Customer Deleted") }); qc.invalidateQueries({ queryKey: getListCustomersQueryKey() }); },
      onError: () => toast({ variant: "destructive", title: t("Error") }),
    });
  };

  return (
    <div className="space-y-6" data-testid="page-customers">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("Customers")}</h1>
        <Button onClick={() => openEdit()} data-testid="button-add-customer">
          <Plus className="w-4 h-4 mr-2" /> {t("Add Customer")}
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder={t("Search by name or phone...")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
          data-testid="input-search"
        />
      </div>

      {customers.isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : customers.data?.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">{t("No customers found")}</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {customers.data?.map((c) => (
            <Card key={c.id} data-testid={`card-customer-${c.id}`}>
              <CardContent className="py-3 px-4">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{c.name}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      {c.phone && <span>{c.phone}</span>}
                      <span>{c.totalOrders} {t("orders")}</span>
                      <span className="text-foreground font-medium">PKR {Number(c.totalSpent).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDetailId(c.id)} data-testid={`button-view-customer-${c.id}`}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)} data-testid={`button-edit-customer-${c.id}`}>
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(c.id)} data-testid={`button-delete-customer-${c.id}`}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit dialog */}
      <Dialog open={dialog.open} onOpenChange={(open) => setDialog({ open })}>
        <DialogContent>
          <DialogHeader><DialogTitle>{dialog.editing ? t("Edit Customer") : t("New Customer")}</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSave)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>{t("Name")}</FormLabel><FormControl><Input {...field} data-testid="input-customer-name" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem><FormLabel>{t("Phone")}</FormLabel><FormControl><Input {...field} data-testid="input-customer-phone" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="address" render={({ field }) => (
                <FormItem><FormLabel>{t("Address")}</FormLabel><FormControl><Textarea {...field} rows={2} /></FormControl><FormMessage /></FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialog({ open: false })}>{t("Cancel")}</Button>
                <Button type="submit" disabled={createCustomer.isPending || updateCustomer.isPending} data-testid="button-save-customer">{t("Save")}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Detail dialog */}
      <Dialog open={!!detailId} onOpenChange={(open) => { if (!open) setDetailId(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("Customer Details")}</DialogTitle></DialogHeader>
          {detailId && <CustomerDetail customerId={detailId} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
