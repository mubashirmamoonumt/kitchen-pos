import { useState } from "react";
import {
  useListBills,
  useGetBill,
  useGenerateBill,
  useListOrders,
  getListBillsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search, Eye, Plus, Receipt } from "lucide-react";

function BillDetail({ billId }: { billId: number }) {
  const { t } = useLanguage();
  const bill = useGetBill(billId, { query: { enabled: !!billId, queryKey: ["getBill", billId] } });

  if (bill.isLoading) return <Skeleton className="h-64" />;
  if (!bill.data) return null;

  const b = bill.data as any;

  return (
    <div className="space-y-4 text-sm">
      <div className="text-center pb-2 border-b">
        <h3 className="font-bold text-lg">MUFAZ Kitchen</h3>
        <p className="text-muted-foreground text-xs">{t("Invoice")} #{b.billNumber}</p>
        <p className="text-muted-foreground text-xs">{new Date(b.createdAt).toLocaleString()}</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div><span className="text-muted-foreground">{t("Customer")}:</span> <span className="font-medium">{b.customerName || "Walk-in"}</span></div>
        <div><span className="text-muted-foreground">{t("Order Type")}:</span> <span className="font-medium capitalize">{b.orderType}</span></div>
        <div><span className="text-muted-foreground">{t("Payment")}:</span> <span className="font-medium capitalize">{b.paymentMethod}</span></div>
        <div><span className="text-muted-foreground">{t("Order")} #:</span> <span className="font-medium">{b.orderId}</span></div>
      </div>
      <Separator />
      <div className="space-y-1">
        {b.items?.map((item: any) => (
          <div key={item.id} className="flex justify-between" data-testid={`row-bill-item-${item.id}`}>
            <span>{item.menuItemName} × {item.quantity}</span>
            <span>PKR {Number(item.unitPrice * item.quantity).toLocaleString()}</span>
          </div>
        ))}
      </div>
      <Separator />
      <div className="space-y-1">
        <div className="flex justify-between text-muted-foreground">
          <span>{t("Subtotal")}</span>
          <span>PKR {Number(b.subtotal).toLocaleString()}</span>
        </div>
        {b.discount > 0 && (
          <div className="flex justify-between text-green-600">
            <span>{t("Discount")}</span>
            <span>-PKR {Number(b.discount).toLocaleString()}</span>
          </div>
        )}
        {b.tax > 0 && (
          <div className="flex justify-between text-muted-foreground">
            <span>{t("Tax")}</span>
            <span>PKR {Number(b.tax).toLocaleString()}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-base pt-1 border-t">
          <span>{t("Total")}</span>
          <span>PKR {Number(b.totalAmount).toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

export default function Bills() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedBillId, setSelectedBillId] = useState<number | null>(null);
  const [generateForOrderId, setGenerateForOrderId] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");

  const bills = useListBills();
  const deliveredOrders = useListOrders({ params: { status: "delivered" } });
  const createBill = useGenerateBill();

  const filtered = (bills.data ?? []).filter((b) => {
    if (!search) return true;
    return (
      (b.billNumber ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (b.customerName ?? "").toLowerCase().includes(search.toLowerCase())
    );
  });

  const handleOrderSelect = (orderId: string) => {
    setGenerateForOrderId(orderId);
    const order = deliveredOrders.data?.find((o) => o.id.toString() === orderId);
    if (order?.paymentMethod) {
      setPaymentMethod(order.paymentMethod);
    }
  };

  const handleGenerate = () => {
    if (!generateForOrderId) return;
    createBill.mutate(
      { data: { orderId: parseInt(generateForOrderId), paymentMethod } },
      {
        onSuccess: () => {
          toast({ title: t("Bill Generated") });
          qc.invalidateQueries({ queryKey: getListBillsQueryKey() });
          setGenerateForOrderId("");
        },
        onError: (err: any) => {
          toast({ variant: "destructive", title: t("Error"), description: err?.data?.error || t("Failed to generate bill") });
        },
      }
    );
  };

  return (
    <div className="space-y-6" data-testid="page-bills">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("Bills")}</h1>
      </div>

      {/* Generate bill card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("Generate Bill for Delivered Order")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 flex-wrap">
            <Select onValueChange={handleOrderSelect} value={generateForOrderId}>
              <SelectTrigger className="flex-1 min-w-[180px]" data-testid="select-order-for-bill">
                <SelectValue placeholder={t("Select a delivered order...")} />
              </SelectTrigger>
              <SelectContent>
                {deliveredOrders.data?.map((o) => (
                  <SelectItem key={o.id} value={o.id.toString()}>
                    #{o.id} — {o.customerName || "Walk-in"} · PKR {Number(o.totalAmount).toLocaleString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select onValueChange={setPaymentMethod} value={paymentMethod}>
              <SelectTrigger className="w-36" data-testid="select-payment-method-bill">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">{t("Cash")}</SelectItem>
                <SelectItem value="jazzcash">{t("JazzCash")}</SelectItem>
                <SelectItem value="easypaisa">{t("EasyPaisa")}</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleGenerate} disabled={!generateForOrderId || createBill.isPending} data-testid="button-generate-bill">
              <Plus className="w-4 h-4 mr-2" />
              {t("Generate")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder={t("Search bills...")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
          data-testid="input-search"
        />
      </div>

      {bills.isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Receipt className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">{t("No bills found")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((bill) => (
            <Card key={bill.id} data-testid={`card-bill-${bill.id}`}>
              <CardContent className="py-3 px-4">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{bill.billNumber}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{bill.customerName || "Walk-in"}</span>
                      <span>·</span>
                      <span className="capitalize">{bill.paymentMethod}</span>
                      <span>·</span>
                      <span className="font-medium text-foreground">PKR {Number(bill.totalAmount).toLocaleString()}</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setSelectedBillId(bill.id)} data-testid={`button-view-bill-${bill.id}`}>
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selectedBillId} onOpenChange={(open) => { if (!open) setSelectedBillId(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{t("Invoice")}</DialogTitle></DialogHeader>
          {selectedBillId && <BillDetail billId={selectedBillId} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
