import { useState, useRef, useCallback } from "react";
import {
  useListBills,
  useGetBill,
  useGenerateBill,
  useListOrders,
  useListSettings,
  getListBillsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search, Eye, Plus, Receipt, Download, FileImage } from "lucide-react";

function ReceiptContent({
  b,
  settings,
}: {
  b: any;
  settings: Record<string, string>;
}) {
  const { t } = useLanguage();
  const kitchenName = settings.kitchen_name || "MUFAZ Kitchen";
  const kitchenPhone = settings.kitchen_phone || "";
  const kitchenAddress = settings.kitchen_address || "";
  const website = settings.bill_website || "";
  const thankYou = settings.bill_thank_you_message || "Thank you for your order!";
  const cta = settings.bill_cta_text || "";

  const subtotal = parseFloat(b.subtotal ?? b.totalAmount ?? "0");
  const discount = parseFloat(b.discount ?? "0");
  const tax = parseFloat(b.tax ?? "0");
  const total = parseFloat(b.totalAmount ?? "0");
  const billNumber = b.billNumber ?? `#${b.id}`;

  return (
    <div className="space-y-3 text-sm font-mono">
      <div className="text-center space-y-0.5">
        <h3 className="font-bold text-base">{kitchenName}</h3>
        {kitchenPhone && <p className="text-xs text-muted-foreground">{kitchenPhone}</p>}
        {kitchenAddress && <p className="text-xs text-muted-foreground">{kitchenAddress}</p>}
        {website && <p className="text-xs text-muted-foreground">{website}</p>}
      </div>
      <Separator />
      <div className="text-center space-y-0.5">
        <p className="font-semibold">{t("Invoice")} {billNumber}</p>
        <p className="text-xs text-muted-foreground">{new Date(b.createdAt).toLocaleString()}</p>
      </div>
      <Separator className="border-dashed" />
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <div><span className="text-muted-foreground">{t("Customer")}: </span><span className="font-medium">{b.order?.customerName || b.customerName || "Walk-in"}</span></div>
        <div><span className="text-muted-foreground">{t("Order Type")}: </span><span className="font-medium capitalize">{b.order?.orderType || b.orderType || "-"}</span></div>
        <div><span className="text-muted-foreground">{t("Payment")}: </span><span className="font-medium capitalize">{b.paymentMethod}</span></div>
        <div><span className="text-muted-foreground">{t("Order")} #: </span><span className="font-medium">{b.orderId}</span></div>
      </div>
      <Separator className="border-dashed" />
      <div className="space-y-1">
        {b.items?.map((item: any) => (
          <div key={item.id} className="flex justify-between text-xs" data-testid={`row-bill-item-${item.id}`}>
            <span>{item.itemName} × {item.quantity}</span>
            <span>PKR {Number(parseFloat(item.unitPrice) * item.quantity).toLocaleString()}</span>
          </div>
        ))}
      </div>
      <Separator className="border-dashed" />
      <div className="space-y-1 text-xs">
        <div className="flex justify-between text-muted-foreground">
          <span>{t("Subtotal")}</span>
          <span>PKR {subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-green-600">
            <span>{t("Discount")}</span>
            <span>-PKR {discount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        )}
        {tax > 0 && (
          <div className="flex justify-between text-muted-foreground">
            <span>{t("Tax")}</span>
            <span>PKR {tax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-sm pt-1 border-t">
          <span>{t("Total")}</span>
          <span>PKR {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
      </div>
      {(thankYou || cta) && (
        <>
          <Separator className="border-dashed" />
          <div className="text-center space-y-1 text-xs text-muted-foreground">
            {thankYou && <p className="font-medium">{thankYou}</p>}
            {cta && <p>{cta}</p>}
          </div>
        </>
      )}
    </div>
  );
}

function BillDetail({ billId }: { billId: number }) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const receiptRef = useRef<HTMLDivElement>(null);
  const bill = useGetBill(billId, { query: { enabled: !!billId, queryKey: ["getBill", billId] } });
  const settingsQuery = useListSettings();

  const settings = (settingsQuery.data ?? {}) as Record<string, string>;

  const handleDownloadImage = useCallback(async () => {
    if (!receiptRef.current) return;
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(receiptRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
      });
      const link = document.createElement("a");
      link.download = `receipt-${billId}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch {
      toast({ variant: "destructive", title: t("Error"), description: t("Failed to download image") });
    }
  }, [billId, toast, t]);

  const handleDownloadPdf = useCallback(() => {
    const kitchenName = settings.kitchen_name || "MUFAZ Kitchen";
    const kitchenPhone = settings.kitchen_phone || "";
    const kitchenAddress = settings.kitchen_address || "";
    const website = settings.bill_website || "";
    const thankYou = settings.bill_thank_you_message || "Thank you for your order!";
    const cta = settings.bill_cta_text || "";
    const b = bill.data as any;
    if (!b) return;

    const subtotal = parseFloat(b.subtotal ?? b.totalAmount ?? "0");
    const discount = parseFloat(b.discount ?? "0");
    const tax = parseFloat(b.tax ?? "0");
    const total = parseFloat(b.totalAmount ?? "0");
    const billNumber = b.billNumber ?? `#${b.id}`;

    const itemRows = (b.items ?? [])
      .map((item: any) =>
        `<tr><td>${item.itemName} × ${item.quantity}</td><td style="text-align:right">PKR ${(parseFloat(item.unitPrice) * item.quantity).toLocaleString()}</td></tr>`
      )
      .join("");

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>Receipt ${billNumber}</title>
<style>
  body { font-family: monospace; font-size: 12px; max-width: 320px; margin: 0 auto; padding: 16px; }
  h2 { text-align: center; margin: 0; font-size: 15px; }
  .center { text-align: center; color: #666; margin: 2px 0; }
  .divider { border-top: 1px dashed #999; margin: 8px 0; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 2px 0; }
  .total-row td { font-weight: bold; font-size: 13px; border-top: 1px solid #000; padding-top: 4px; }
  .footer { text-align: center; color: #555; margin-top: 8px; }
  @media print { body { margin: 0; } }
</style>
</head>
<body>
<h2>${kitchenName}</h2>
${kitchenPhone ? `<p class="center">${kitchenPhone}</p>` : ""}
${kitchenAddress ? `<p class="center">${kitchenAddress}</p>` : ""}
${website ? `<p class="center">${website}</p>` : ""}
<div class="divider"></div>
<p class="center"><strong>Invoice ${billNumber}</strong></p>
<p class="center">${new Date(b.createdAt).toLocaleString()}</p>
<div class="divider"></div>
<table>
  <tr><td>Customer</td><td>${b.order?.customerName || "Walk-in"}</td></tr>
  <tr><td>Order Type</td><td style="text-transform:capitalize">${b.order?.orderType || "-"}</td></tr>
  <tr><td>Payment</td><td style="text-transform:capitalize">${b.paymentMethod}</td></tr>
  <tr><td>Order #</td><td>${b.orderId}</td></tr>
</table>
<div class="divider"></div>
<table>${itemRows}</table>
<div class="divider"></div>
<table>
  <tr><td>Subtotal</td><td style="text-align:right">PKR ${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td></tr>
  ${discount > 0 ? `<tr><td style="color:green">Discount</td><td style="text-align:right;color:green">-PKR ${discount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td></tr>` : ""}
  ${tax > 0 ? `<tr><td>Tax</td><td style="text-align:right">PKR ${tax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td></tr>` : ""}
  <tr class="total-row"><td>TOTAL</td><td style="text-align:right">PKR ${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td></tr>
</table>
${thankYou || cta ? `<div class="divider"></div><div class="footer">${thankYou ? `<p><strong>${thankYou}</strong></p>` : ""}${cta ? `<p>${cta}</p>` : ""}</div>` : ""}
</body>
</html>`;

    const win = window.open("", "_blank");
    if (!win) {
      toast({ variant: "destructive", title: t("Error"), description: "Popup blocked. Please allow popups." });
      return;
    }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  }, [bill.data, settings, t, toast]);

  if (bill.isLoading || settingsQuery.isLoading) return <Skeleton className="h-64" />;
  if (!bill.data) return null;

  const b = bill.data as any;

  return (
    <div className="space-y-4">
      <div ref={receiptRef} className="bg-white p-4 rounded">
        <ReceiptContent b={b} settings={settings} />
      </div>
      <div className="flex gap-2 pt-1">
        <Button variant="outline" size="sm" className="flex-1" onClick={handleDownloadImage} data-testid="button-download-image">
          <FileImage className="w-4 h-4 mr-2" />
          {t("Download Image")}
        </Button>
        <Button variant="outline" size="sm" className="flex-1" onClick={handleDownloadPdf} data-testid="button-download-pdf">
          <Download className="w-4 h-4 mr-2" />
          {t("Download PDF")}
        </Button>
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
  const deliveredOrders = useListOrders({ status: "delivered" });
  const createBill = useGenerateBill();

  const filtered = (bills.data ?? []).filter((b) => {
    if (!search) return true;
    return (
      ((b as any).billNumber ?? "").toLowerCase().includes(search.toLowerCase()) ||
      ((b as any).customerName ?? "").toLowerCase().includes(search.toLowerCase())
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
          {filtered.map((bill: any) => (
            <Card key={bill.id} data-testid={`card-bill-${bill.id}`}>
              <CardContent className="py-3 px-4">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{bill.billNumber || `#${bill.id}`}</span>
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
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t("Invoice")}</DialogTitle></DialogHeader>
          {selectedBillId && <BillDetail billId={selectedBillId} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
