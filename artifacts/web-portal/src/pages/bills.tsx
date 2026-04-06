import { useState, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import {
  useListBills,
  useGetBill,
  useGenerateBill,
  useListOrders,
  useListSettings,
  getListBillsQueryKey,
} from "@workspace/api-client-react";
import type {
  BillDetail,
  BillItem,
  BillSummary,
  GenerateBillMutationError,
  SettingsMap,
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

interface ExtendedBillDetail extends BillDetail {
  billNumber?: string | null;
  subtotal?: string | null;
  discount?: string | null;
  tax?: string | null;
}

interface ExtendedBillSummary extends BillSummary {
  billNumber?: string | null;
  customerName?: string | null;
}

export type ReceiptBillData = ExtendedBillDetail;

export function ReceiptContent({
  b,
  settings,
}: {
  b: ReceiptBillData;
  settings: SettingsMap;
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
        <div><span className="text-muted-foreground">{t("Customer")}: </span><span className="font-medium">{b.order?.customerName || "Walk-in"}</span></div>
        <div><span className="text-muted-foreground">{t("Payment")}: </span><span className="font-medium capitalize">{b.paymentMethod}</span></div>
        <div><span className="text-muted-foreground">{t("Order")} #: </span><span className="font-medium">{b.orderId}</span></div>
      </div>
      <Separator className="border-dashed" />
      <div className="space-y-0.5">
        <div className="grid text-xs font-semibold text-muted-foreground border-b pb-0.5" style={{ gridTemplateColumns: "1fr auto auto auto" }}>
          <span>{t("Item")}</span>
          <span className="text-right pr-[40px]">{t("Qty")}</span>
          <span className="text-right pr-2">{t("Disc")}</span>
          <span className="text-right">{t("Price")}</span>
        </div>
        {b.items?.map((item: BillItem) => {
          const gross = parseFloat(item.unitPrice) * Number(item.quantity);
          const itemSubtotal = parseFloat(item.subtotal ?? "0");
          const itemDisc = Math.max(0, gross - itemSubtotal);
          return (
            <div key={item.id} className="grid text-xs" style={{ gridTemplateColumns: "1fr auto auto auto" }} data-testid={`row-bill-item-${item.id}`}>
              <span className="truncate pr-1">{item.itemName}</span>
              <span className="text-right pr-2">{Number(item.quantity)}</span>
              <span className="text-right pr-2 text-green-600">{itemDisc > 0 ? `-${itemDisc.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—"}</span>
              <span className="text-right">PKR {itemSubtotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            </div>
          );
        })}
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

function BillDetailActions({ billId, receiptRef }: { billId: number; receiptRef: React.RefObject<HTMLDivElement | null> }) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const bill = useGetBill(billId, { query: { enabled: !!billId, queryKey: ["getBill", billId] } });
  const settingsQuery = useListSettings();

  if (bill.isLoading || settingsQuery.isLoading) return <Skeleton className="h-64" />;

  const handleDownloadImage = async () => {
    const el = receiptRef.current;
    if (!el) return;
    try {
      const domtoimage = (await import("dom-to-image-more")).default;
      const dataUrl = await domtoimage.toPng(el, { bgcolor: "#ffffff", scale: 2 });
      const link = document.createElement("a");
      link.download = `receipt-${billId}.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      toast({ variant: "destructive", title: t("Error"), description: t("Failed to download image") });
    }
  };

  const handleDownloadPdf = () => {
    navigate(`/bills/${billId}/print`);
  };

  const b = bill.data as ExtendedBillDetail | undefined;
  const settings: SettingsMap = settingsQuery.data ?? {};

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded">
        {b && <ReceiptContent b={b} settings={settings} />}
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

function PersistentReceipt({ billId, receiptRef }: { billId: number | null; receiptRef: React.RefObject<HTMLDivElement | null> }) {
  const bill = useGetBill(billId ?? 0, { query: { enabled: !!billId, queryKey: ["getBill", billId] } });
  const settingsQuery = useListSettings();
  const b = bill.data as ExtendedBillDetail | undefined;
  const settings: SettingsMap = settingsQuery.data ?? {};

  return (
    <div
      ref={receiptRef}
      aria-hidden="true"
      style={{ position: "absolute", left: "-9999px", top: 0, width: "320px", backgroundColor: "#ffffff", padding: "16px" }}
    >
      {billId && b && <ReceiptContent b={b} settings={settings} />}
    </div>
  );
}

export default function Bills() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedBillId, setSelectedBillId] = useState<number | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);
  const [generateForOrderId, setGenerateForOrderId] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");

  const bills = useListBills();
  const deliveredOrders = useListOrders({ status: "delivered" });
  const createBill = useGenerateBill();

  const filtered = (bills.data as ExtendedBillSummary[] ?? []).filter((b) => {
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
        onError: (err: GenerateBillMutationError) => {
          toast({ variant: "destructive", title: t("Error"), description: err?.data?.error ?? t("Failed to generate bill") });
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
          {filtered.map((bill) => (
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

      {/* Persistent off-screen receipt element — always mounted so dom-to-image-more can reliably target it */}
      <PersistentReceipt billId={selectedBillId} receiptRef={receiptRef} />

      <Dialog open={!!selectedBillId} onOpenChange={(open) => { if (!open) setSelectedBillId(null); }}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t("Invoice")}</DialogTitle></DialogHeader>
          {selectedBillId && <BillDetailActions billId={selectedBillId} receiptRef={receiptRef} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
