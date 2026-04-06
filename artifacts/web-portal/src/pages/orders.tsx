import { useState } from "react";
import { Link } from "wouter";
import {
  useListOrders,
  useUpdateOrderStatus,
  useGetOrder,
  getListOrdersQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Plus, Search, Eye } from "lucide-react";
import { Separator } from "@/components/ui/separator";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  confirmed: "bg-blue-100 text-blue-800 border-blue-200",
  preparing: "bg-orange-100 text-orange-800 border-orange-200",
  ready: "bg-green-100 text-green-800 border-green-200",
  delivered: "bg-slate-100 text-slate-700 border-slate-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
};

const ALL_STATUSES = ["pending", "confirmed", "preparing", "ready", "delivered", "cancelled"];

function OrderDetail({ orderId }: { orderId: number }) {
  const { t } = useLanguage();
  const order = useGetOrder(orderId, { query: { enabled: !!orderId, queryKey: ["getOrder", orderId] } });

  if (order.isLoading) return <Skeleton className="h-48" />;
  if (!order.data) return null;

  const o = order.data;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div><span className="text-muted-foreground">{t("Customer")}:</span> <span className="font-medium">{o.customerName || "Walk-in"}</span></div>
        <div><span className="text-muted-foreground">{t("Status")}:</span> <span className="font-medium capitalize">{t(o.status.charAt(0).toUpperCase() + o.status.slice(1))}</span></div>
        <div><span className="text-muted-foreground">{t("Payment Method")}:</span> <span className="font-medium capitalize">{o.paymentMethod}</span></div>
      </div>
      {o.notes && (
        <div className="text-sm">
          <span className="text-muted-foreground">{t("Notes")}:</span> <span>{o.notes}</span>
        </div>
      )}
      <Separator />
      <div className="space-y-2">
        {o.items?.map((item) => (
          <div key={item.id} className="flex justify-between text-sm" data-testid={`row-order-item-${item.id}`}>
            <span>{item.itemName} × {item.quantity} <span className="text-muted-foreground text-xs">{item.unit}</span></span>
            <span className="font-medium">PKR {Number(parseFloat(item.subtotal)).toLocaleString()}</span>
          </div>
        ))}
      </div>
      <Separator />
      {parseFloat(o.discountAmount ?? "0") > 0 && (
        <div className="flex justify-between text-sm text-green-600">
          <span>{t("Discount")}</span>
          <span>-PKR {Number(o.discountAmount).toLocaleString()}</span>
        </div>
      )}
      <div className="flex justify-between font-semibold">
        <span>{t("Total")}</span>
        <span>PKR {Number(o.totalAmount).toLocaleString()}</span>
      </div>
    </div>
  );
}

function StatusDropdown({ orderId, currentStatus }: { orderId: number; currentStatus: string }) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateStatus = useUpdateOrderStatus();

  const handleChange = (newStatus: string) => {
    if (newStatus === currentStatus) return;
    updateStatus.mutate(
      { id: orderId, data: { status: newStatus } },
      {
        onSuccess: () => {
          toast({ title: t("Status Updated"), description: `${t("Order")} #${orderId} → ${t(newStatus.charAt(0).toUpperCase() + newStatus.slice(1))}` });
          queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
        },
        onError: (err) => {
          const e = err as unknown as { data?: { error?: string } };
          toast({ variant: "destructive", title: t("Error"), description: e?.data?.error ?? t("Failed to update status") });
        },
      }
    );
  };

  return (
    <Select value={currentStatus} onValueChange={handleChange} disabled={updateStatus.isPending}>
      <SelectTrigger className={`h-7 text-xs w-32 border font-medium ${STATUS_COLORS[currentStatus] ?? ""}`} data-testid={`select-status-${orderId}`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ALL_STATUSES.map((s) => (
          <SelectItem key={s} value={s} className="text-xs">
            {t(s.charAt(0).toUpperCase() + s.slice(1))}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default function Orders() {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const orders = useListOrders(statusFilter !== "all" ? { status: statusFilter } : undefined);

  const filtered = (orders.data ?? []).filter((o) => {
    if (!search) return true;
    return (
      `#${o.id}`.includes(search) ||
      (o.customerName ?? "").toLowerCase().includes(search.toLowerCase())
    );
  });

  const STATUSES = ["all", ...ALL_STATUSES];

  return (
    <div className="space-y-6" data-testid="page-orders">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("Orders")}</h1>
        <Link href="/orders/new">
          <Button data-testid="button-new-order">
            <Plus className="w-4 h-4 mr-2" />
            {t("New Order")}
          </Button>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t("Search orders...")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter} data-testid="select-status">
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder={t("All Statuses")} />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s === "all" ? t("All Statuses") : t(s.charAt(0).toUpperCase() + s.slice(1))}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {orders.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {t("No orders found")}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((order) => (
            <Card key={order.id} className="hover:shadow-sm transition-shadow" data-testid={`card-order-${order.id}`}>
              <CardContent className="py-3 px-4">
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm">#{order.id}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{order.customerName || "Walk-in"}</span>
                      <span>·</span>
                      <span>{order.paymentMethod}</span>
                      <span>·</span>
                      <span className="font-medium text-foreground">PKR {Number(order.totalAmount).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusDropdown orderId={order.id} currentStatus={order.status} />
                    <Dialog open={detailOpen && selectedOrderId === order.id} onOpenChange={(open) => { setDetailOpen(open); if (open) setSelectedOrderId(order.id); }}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" data-testid={`button-view-order-${order.id}`}>
                          <Eye className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>{t("Order")} #{order.id}</DialogTitle>
                        </DialogHeader>
                        {selectedOrderId === order.id && <OrderDetail orderId={order.id} />}
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
