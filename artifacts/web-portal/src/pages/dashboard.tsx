import { useGetOrdersDashboardSummary, useListIngredients, useListOrders } from "@workspace/api-client-react";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ShoppingBag, DollarSign, ClipboardList, AlertTriangle, Plus } from "lucide-react";

function StatCard({ title, value, icon: Icon, sub, color = "primary" }: {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  sub?: string;
  color?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground font-medium">{title}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className={`w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center`}>
            <Icon className="w-6 h-6 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const STATUS_ORDER = ["pending", "confirmed", "preparing", "ready"];

export default function Dashboard() {
  const { t } = useLanguage();
  const summary = useGetOrdersDashboardSummary();
  const lowStockIngredients = useListIngredients({ lowStock: true });
  const activeOrders = useListOrders({ status: "pending" });

  const data = summary.data;

  return (
    <div className="space-y-6" data-testid="page-dashboard">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("Dashboard")}</h1>
          <p className="text-muted-foreground text-sm">{t("Today's Summary")}</p>
        </div>
        <Link href="/orders/new">
          <Button data-testid="button-new-order">
            <Plus className="w-4 h-4 mr-2" />
            {t("New Order")}
          </Button>
        </Link>
      </div>

      {/* Summary cards */}
      {summary.isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title={t("Today's Orders")}
            value={data?.todayOrderCount ?? 0}
            icon={ShoppingBag}
            sub={`${data?.pendingOrderCount ?? 0} ${t("Pending")}`}
          />
          <StatCard
            title={t("Revenue")}
            value={`PKR ${Number(data?.todayRevenue ?? 0).toLocaleString()}`}
            icon={DollarSign}
          />
          <StatCard
            title={t("Active Orders")}
            value={data?.activeOrderCount ?? 0}
            icon={ClipboardList}
          />
          <StatCard
            title={t("Low Stock Alerts")}
            value={lowStockIngredients.data?.length ?? 0}
            icon={AlertTriangle}
          />
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Active pipeline */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("Active Orders")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeOrders.isLoading ? (
              <Skeleton className="h-20" />
            ) : activeOrders.data?.length === 0 ? (
              <p className="text-muted-foreground text-sm">{t("No active orders")}</p>
            ) : (
              activeOrders.data?.slice(0, 5).map((order) => (
                <div key={order.id} className="flex items-center justify-between py-2 border-b last:border-0" data-testid={`card-order-${order.id}`}>
                  <div>
                    <p className="font-medium text-sm">#{order.id} — {order.customerName || "Walk-in"}</p>
                    <p className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleTimeString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs capitalize">{order.status}</Badge>
                    <span className="text-sm font-medium">PKR {Number(order.totalAmount).toLocaleString()}</span>
                  </div>
                </div>
              ))
            )}
            <Link href="/orders">
              <Button variant="ghost" size="sm" className="w-full mt-2">{t("View All Orders")}</Button>
            </Link>
          </CardContent>
        </Card>

        {/* Low stock */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("Low Stock Alerts")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {lowStockIngredients.isLoading ? (
              <Skeleton className="h-20" />
            ) : lowStockIngredients.data?.length === 0 ? (
              <p className="text-muted-foreground text-sm">{t("All stock levels are healthy")}</p>
            ) : (
              lowStockIngredients.data?.slice(0, 5).map((ing) => (
                <div key={ing.id} className="flex items-center justify-between py-2 border-b last:border-0" data-testid={`row-ingredient-${ing.id}`}>
                  <div>
                    <p className="font-medium text-sm">{ing.name}</p>
                    <p className="text-xs text-muted-foreground">{ing.unit}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-destructive">{ing.stockQuantity} {ing.unit}</p>
                    <p className="text-xs text-muted-foreground">Min: {ing.lowStockThreshold}</p>
                  </div>
                </div>
              ))
            )}
            <Link href="/inventory">
              <Button variant="ghost" size="sm" className="w-full mt-2">{t("Manage Inventory")}</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
