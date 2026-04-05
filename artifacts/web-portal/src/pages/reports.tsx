import {
  useGetOrdersDashboardSummary,
  useListOrders,
  useListIngredients,
  useListBills,
  useListCustomers,
} from "@workspace/api-client-react";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const COLORS = ["hsl(15, 76%, 48%)", "hsl(30, 80%, 55%)", "hsl(45, 90%, 45%)", "hsl(10, 70%, 60%)", "hsl(0, 60%, 50%)"];

function StatCard({ title, value, sub }: { title: string; value: string | number; sub?: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground font-medium">{title}</p>
        <p className="text-2xl font-bold mt-1">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function Reports() {
  const { t } = useLanguage();
  const summary = useGetOrdersDashboardSummary();
  const allOrders = useListOrders();
  const ingredients = useListIngredients();
  const bills = useListBills();
  const customers = useListCustomers();

  const data = summary.data;

  // Orders by status
  const statusCounts = (allOrders.data ?? []).reduce((acc: Record<string, number>, o) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1;
    return acc;
  }, {});
  const statusData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

  // Orders by type
  const typeCounts = (allOrders.data ?? []).reduce((acc: Record<string, number>, o) => {
    acc[o.orderType] = (acc[o.orderType] ?? 0) + 1;
    return acc;
  }, {});
  const typeData = Object.entries(typeCounts).map(([name, value]) => ({ name, value }));

  // Payment method split
  const paymentCounts = (bills.data ?? []).reduce((acc: Record<string, number>, b) => {
    acc[b.paymentMethod] = (acc[b.paymentMethod] ?? 0) + 1;
    return acc;
  }, {});
  const paymentData = Object.entries(paymentCounts).map(([name, value]) => ({ name, value }));

  // Revenue from bills
  const totalRevenue = (bills.data ?? []).reduce((sum, b) => sum + Number(b.totalAmount), 0);
  const avgOrderValue = bills.data?.length ? totalRevenue / bills.data.length : 0;

  // Top customers
  const topCustomers = [...(customers.data ?? [])]
    .sort((a, b) => Number(b.totalSpent) - Number(a.totalSpent))
    .slice(0, 5);

  return (
    <div className="space-y-6" data-testid="page-reports">
      <h1 className="text-2xl font-bold">{t("Reports")}</h1>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {summary.isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)
        ) : (
          <>
            <StatCard title={t("Today's Orders")} value={data?.todayOrders ?? 0} />
            <StatCard title={t("Today's Revenue")} value={`PKR ${Number(data?.todayRevenue ?? 0).toLocaleString()}`} />
            <StatCard title={t("Total Bills")} value={bills.data?.length ?? 0} />
            <StatCard title={t("Avg. Order Value")} value={`PKR ${Math.round(avgOrderValue).toLocaleString()}`} />
          </>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Orders by Status */}
        <Card>
          <CardHeader><CardTitle className="text-base">{t("Orders by Status")}</CardTitle></CardHeader>
          <CardContent>
            {allOrders.isLoading ? <Skeleton className="h-48" /> : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={statusData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(15, 76%, 48%)" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Orders by Type */}
        <Card>
          <CardHeader><CardTitle className="text-base">{t("Orders by Type")}</CardTitle></CardHeader>
          <CardContent>
            {allOrders.isLoading ? <Skeleton className="h-48" /> : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={typeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {typeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Payment methods */}
        <Card>
          <CardHeader><CardTitle className="text-base">{t("Payment Methods")}</CardTitle></CardHeader>
          <CardContent>
            {bills.isLoading ? <Skeleton className="h-48" /> : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={paymentData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {paymentData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Top customers */}
        <Card>
          <CardHeader><CardTitle className="text-base">{t("Top Customers")}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {customers.isLoading ? <Skeleton className="h-48" /> : topCustomers.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">{t("No customer data")}</p>
            ) : (
              topCustomers.map((c, i) => (
                <div key={c.id} className="flex items-center justify-between py-1.5 border-b last:border-0" data-testid={`row-top-customer-${c.id}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-xs w-4">{i + 1}</span>
                    <span className="font-medium text-sm">{c.name}</span>
                  </div>
                  <div className="text-right text-xs">
                    <p className="font-semibold">PKR {Number(c.totalSpent).toLocaleString()}</p>
                    <p className="text-muted-foreground">{c.totalOrders} {t("orders")}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Low stock summary */}
      <Card>
        <CardHeader><CardTitle className="text-base">{t("Low Stock Ingredients")}</CardTitle></CardHeader>
        <CardContent>
          {ingredients.isLoading ? <Skeleton className="h-32" /> : (
            <div className="space-y-1">
              {(ingredients.data ?? []).filter((i) => i.isLowStock).map((ing) => (
                <div key={ing.id} className="flex justify-between text-sm py-1.5 border-b last:border-0" data-testid={`row-low-stock-${ing.id}`}>
                  <span className="font-medium">{ing.name}</span>
                  <span className="text-destructive font-medium">{ing.stockQuantity} / {ing.lowStockThreshold} {ing.unit}</span>
                </div>
              ))}
              {!(ingredients.data ?? []).some((i) => i.isLowStock) && (
                <p className="text-muted-foreground text-sm text-center py-4">{t("All stock levels are healthy")}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
