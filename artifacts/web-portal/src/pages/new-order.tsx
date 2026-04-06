import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  useListCategories,
  useListMenuItems,
  useListCustomers,
  useCreateOrder,
  useListSettings,
  getListOrdersQueryKey,
  useListActiveDiscountRules,
} from "@workspace/api-client-react";
import type { SettingsMap, BillItem, Order, DiscountRule } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Minus, Plus, ArrowLeft, Trash2, Tag, Receipt, X } from "lucide-react";
import { Link } from "wouter";
import { ReceiptContent } from "./bills";
import type { ReceiptBillData } from "./bills";

interface CreateOrderResponseType {
  id: number;
  status: string;
  totalAmount: string;
  discountAmount: string;
  discountType: "pct" | "pkr";
  discountRuleName?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  paymentMethod?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  items: Array<{
    id: number;
    orderId: number;
    itemName: string;
    itemPrice: string;
    quantity: number;
    unit: string;
    discountAmount: string;
    subtotal: string;
  }>;
  bill?: {
    id: number;
    totalAmount?: string | null;
    billNumber?: string | null;
    subtotal?: string | null;
    discount?: string | null;
    tax?: string | null;
    createdAt?: Date | string;
  } | null;
}

function buildReceiptBillData(response: CreateOrderResponseType): ReceiptBillData {
  const billItems: BillItem[] = (response.items ?? []).map((i) => ({
    id: i.id,
    billId: response.bill?.id ?? 0,
    itemName: i.itemName,
    quantity: i.quantity,
    unitPrice: i.itemPrice,
    subtotal: i.subtotal,
  }));
  const order: Order = {
    id: response.id,
    status: response.status,
    totalAmount: response.totalAmount,
    discountAmount: response.discountAmount,
    discountType: response.discountType,
    discountRuleName: response.discountRuleName,
    customerName: response.customerName,
    paymentMethod: response.paymentMethod,
    createdAt: String(response.createdAt),
    updatedAt: String(response.updatedAt),
  };
  return {
    id: response.bill?.id ?? 0,
    orderId: response.id,
    billNumber: response.bill?.billNumber,
    subtotal: response.bill?.subtotal,
    discount: response.bill?.discount,
    tax: response.bill?.tax,
    totalAmount: response.bill?.totalAmount ?? response.totalAmount,
    paymentMethod: response.paymentMethod ?? "cash",
    createdAt: String(response.bill?.createdAt ?? new Date().toISOString()),
    items: billItems,
    order,
    deductions: [],
  };
}

const schema = z.object({
  orderType: z.enum(["dine-in", "takeaway", "delivery"]),
  paymentMethod: z.enum(["cash", "jazzcash", "easypaisa"]),
  customerId: z.number().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const WEIGHTED_UNITS = ["kg", "g", "litre"];

interface CartItem {
  menuItemId: number;
  name: string;
  nameUr: string;
  price: string;
  quantity: number;
  unit: string;
  defaultDiscountPct: string;
  itemDiscountValue: string;
  itemDiscountType: "pct" | "pkr";
}

export default function NewOrder() {
  const { t, language } = useLanguage();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountValue, setDiscountValue] = useState<string>("");
  const [discountType, setDiscountType] = useState<"pkr" | "pct">("pkr");
  const [discountRuleName, setDiscountRuleName] = useState<string | undefined>(undefined);
  const [receiptBill, setReceiptBill] = useState<CreateOrderResponseType | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);

  const categories = useListCategories();
  const menuItems = useListMenuItems(categoryId ? { categoryId, isAvailable: true } : { isAvailable: true });
  const customers = useListCustomers();
  const createOrder = useCreateOrder();
  const settingsQuery = useListSettings();
  const settings: SettingsMap = settingsQuery.data ?? {};
  const activeDiscountRulesQuery = useListActiveDiscountRules();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { orderType: "dine-in", paymentMethod: "cash", notes: "" },
  });

  const addToCart = (item: { id: number; name: string; nameUr?: string | null; price: string; unit?: string | null; defaultDiscountPct?: string | null }) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItemId === item.id);
      if (existing) {
        return prev.map((c) => c.menuItemId === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      const defaultPct = item.defaultDiscountPct ?? "0";
      return [...prev, {
        menuItemId: item.id,
        name: item.name,
        nameUr: item.nameUr ?? "",
        price: item.price,
        quantity: 1,
        unit: item.unit ?? "qty",
        defaultDiscountPct: defaultPct,
        itemDiscountValue: defaultPct,
        itemDiscountType: "pct",
      }];
    });
  };

  const updateItemDiscount = (menuItemId: number, value: string, type?: "pct" | "pkr") => {
    setCart((prev) => prev.map((c) => c.menuItemId === menuItemId ? { ...c, itemDiscountValue: value, ...(type ? { itemDiscountType: type } : {}) } : c));
  };

  const updateQty = (menuItemId: number, delta: number) => {
    setCart((prev) => {
      const updated = prev.map((c) => {
        if (c.menuItemId !== menuItemId) return c;
        const step = WEIGHTED_UNITS.includes(c.unit) ? 0.1 : 1;
        const newQty = Math.max(0, parseFloat((c.quantity + delta * step).toFixed(3)));
        return { ...c, quantity: newQty };
      });
      return updated.filter((c) => c.quantity > 0);
    });
  };

  const setQtyDirect = (menuItemId: number, value: string) => {
    const parsed = parseFloat(value);
    if (isNaN(parsed) || parsed < 0) return;
    setCart((prev) =>
      prev.map((c) => c.menuItemId === menuItemId ? { ...c, quantity: parsed } : c).filter((c) => c.quantity > 0)
    );
  };

  const subtotal = cart.reduce((sum, c) => {
    const gross = parseFloat(c.price) * c.quantity;
    const discVal = parseFloat(c.itemDiscountValue || "0");
    const itemDisc = c.itemDiscountType === "pct" ? (gross * discVal) / 100 : Math.min(discVal, gross);
    return sum + gross - itemDisc;
  }, 0);

  let orderDiscountAmt = 0;
  if (discountValue && parseFloat(discountValue) > 0) {
    if (discountType === "pct") {
      orderDiscountAmt = (subtotal * parseFloat(discountValue)) / 100;
    } else {
      orderDiscountAmt = parseFloat(discountValue);
    }
  }
  const total = Math.max(0, subtotal - orderDiscountAmt);

  const onSubmit = (values: FormValues) => {
    if (cart.length === 0) {
      toast({ variant: "destructive", title: t("Error"), description: t("Add at least one item to the order") });
      return;
    }
    createOrder.mutate(
      {
        data: {
          ...values,
          discountAmount: orderDiscountAmt > 0 ? orderDiscountAmt.toFixed(2) : undefined,
          discountType: orderDiscountAmt > 0 ? discountType : undefined,
          discountRuleName: orderDiscountAmt > 0 ? discountRuleName : undefined,
          items: cart.map((c) => {
            const gross = parseFloat(c.price) * c.quantity;
            const discVal = parseFloat(c.itemDiscountValue || "0");
            const itemDisc = discVal > 0
              ? (c.itemDiscountType === "pct" ? (gross * discVal) / 100 : Math.min(discVal, gross))
              : 0;
            return {
              menuItemId: c.menuItemId,
              quantity: c.quantity,
              itemName: c.name,
              itemPrice: c.price,
              unit: c.unit,
              discountAmount: itemDisc > 0 ? itemDisc.toFixed(2) : undefined,
            };
          }),
        },
      },
      {
        onSuccess: (data) => {
          queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
          const response = data as unknown as CreateOrderResponseType;
          if (response?.bill) {
            setReceiptBill(response);
            setReceiptOpen(true);
          } else {
            toast({ title: t("Order Created Successfully") });
            setLocation("/orders");
          }
        },
        onError: (err) => {
          const e = err as unknown as { data?: { error?: string } };
          toast({ variant: "destructive", title: t("Error"), description: e?.data?.error || t("Failed to create order") });
        },
      }
    );
  };

  const handleReceiptClose = () => {
    setReceiptOpen(false);
    setLocation("/orders");
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto" data-testid="page-new-order">
      <div className="flex items-center gap-3">
        <Link href="/orders">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">{t("New Order")}</h1>
      </div>

      <div className="grid md:grid-cols-5 gap-6">
        {/* Left: Menu items */}
        <div className="md:col-span-3 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t("Menu")}</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Category filter */}
              <div className="flex gap-2 flex-wrap mb-4">
                <Badge
                  variant={categoryId === null ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setCategoryId(null)}
                  data-testid="badge-category-all"
                >
                  {t("All")}
                </Badge>
                {categories.data?.map((cat) => (
                  <Badge
                    key={cat.id}
                    variant={categoryId === cat.id ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setCategoryId(cat.id)}
                    data-testid={`badge-category-${cat.id}`}
                  >
                    {language === "ur" && cat.nameUr ? cat.nameUr : cat.name}
                  </Badge>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {menuItems.data?.map((item) => {
                  const inCart = cart.find((c) => c.menuItemId === item.id);
                  return (
                    <button
                      key={item.id}
                      onClick={() => addToCart(item)}
                      disabled={!item.isAvailable}
                      className="text-left p-3 border rounded-lg hover:border-primary hover:bg-primary/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      data-testid={`button-menu-item-${item.id}`}
                    >
                      <p className="font-medium text-sm">{language === "ur" && item.nameUr ? item.nameUr : item.name}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <p className="text-primary font-semibold text-sm">PKR {Number(item.price).toLocaleString()}</p>
                        <span className="text-xs text-muted-foreground">/ {item.unit}</span>
                      </div>
                      {parseFloat(item.defaultDiscountPct ?? "0") > 0 && (
                        <Badge variant="secondary" className="text-xs mt-1">{item.defaultDiscountPct}% {t("off")}</Badge>
                      )}
                      {inCart && <Badge variant="outline" className="text-xs mt-1 ml-1">×{inCart.quantity}</Badge>}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Order details + cart */}
        <div className="md:col-span-2 space-y-4">
          {/* Cart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t("Order")} ({cart.length} {t("Items")})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {cart.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">{t("No items added")}</p>
              ) : (
                <>
                  {cart.map((item) => {
                    const gross = parseFloat(item.price) * item.quantity;
                    const discVal = parseFloat(item.itemDiscountValue || "0");
                    const itemDiscount = discVal > 0
                      ? (item.itemDiscountType === "pct" ? (gross * discVal) / 100 : Math.min(discVal, gross))
                      : 0;
                    const lineTotal = gross - itemDiscount;
                    return (
                      <div key={item.menuItemId} className="space-y-1 pb-1 border-b last:border-0" data-testid={`cart-item-${item.menuItemId}`}>
                        <div className="flex items-center gap-2">
                          <span className="text-sm flex-1 truncate">
                            {language === "ur" && item.nameUr ? item.nameUr : item.name}
                            <span className="text-muted-foreground text-xs ml-1">/ {item.unit}</span>
                          </span>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateQty(item.menuItemId, -1)}>
                              <Minus className="w-3 h-3" />
                            </Button>
                            <Input
                              type="number"
                              min="0"
                              step={WEIGHTED_UNITS.includes(item.unit) ? "0.1" : "1"}
                              value={item.quantity}
                              onChange={(e) => setQtyDirect(item.menuItemId, e.target.value)}
                              className="h-6 text-xs w-16 px-1 text-center"
                              data-testid={`input-qty-${item.menuItemId}`}
                            />
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateQty(item.menuItemId, 1)}>
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                          <span className="text-sm font-medium w-20 text-right">
                            PKR {lineTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </span>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => setCart(c => c.filter(x => x.menuItemId !== item.menuItemId))}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-1 pl-0.5">
                          <span className="text-xs text-muted-foreground shrink-0">{t("Disc")}:</span>
                          <Select
                            value={item.itemDiscountType}
                            onValueChange={(v) => updateItemDiscount(item.menuItemId, item.itemDiscountValue, v as "pct" | "pkr")}
                          >
                            <SelectTrigger className="h-5 text-xs w-14 px-1" data-testid={`select-item-disc-type-${item.menuItemId}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pct">%</SelectItem>
                              <SelectItem value="pkr">PKR</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            type="number"
                            min="0"
                            max={item.itemDiscountType === "pct" ? "100" : undefined}
                            step="0.1"
                            value={item.itemDiscountValue}
                            onChange={(e) => updateItemDiscount(item.menuItemId, e.target.value)}
                            className="h-5 text-xs w-16 px-1"
                            data-testid={`input-item-discount-${item.menuItemId}`}
                          />
                          {itemDiscount > 0 && (
                            <span className="text-xs text-green-600 ml-1">-PKR {itemDiscount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <Separator />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{t("Subtotal")}</span>
                    <span>PKR {subtotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  </div>

                  {/* Discount panel */}
                  <div className="border rounded-md p-2 space-y-2 bg-muted/30">
                    <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                      <Tag className="w-3 h-3" />
                      {t("Checkout Discount")}
                    </div>
                    {/* Discount rule suggestion chips */}
                    {activeDiscountRulesQuery.data && activeDiscountRulesQuery.data.length > 0 && (() => {
                      const rules: DiscountRule[] = activeDiscountRulesQuery.data;
                      const visible = rules.filter((r) => {
                        if (r.type === "event") return true;
                        if (r.type === "threshold" && r.minOrderValue) {
                          return subtotal >= parseFloat(r.minOrderValue);
                        }
                        return true;
                      });
                      if (visible.length === 0) return null;
                      return (
                        <div className="flex flex-wrap gap-1">
                          {visible.map((rule) => (
                            <button
                              key={rule.id}
                              type="button"
                              onClick={() => {
                                setDiscountType(rule.discountType === "pct" ? "pct" : "pkr");
                                setDiscountValue(rule.amount);
                                setDiscountRuleName(rule.name);
                              }}
                              className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border border-green-500/40 bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-950/30 dark:text-green-400 dark:border-green-500/30 dark:hover:bg-green-900/40 transition-colors"
                              data-testid={`chip-discount-rule-${rule.id}`}
                            >
                              <Tag className="w-2.5 h-2.5" />
                              {rule.name} ({rule.discountType === "pct" ? `${rule.amount}%` : `PKR ${rule.amount}`})
                            </button>
                          ))}
                        </div>
                      );
                    })()}
                    <div className="flex gap-1">
                      <Select value={discountType} onValueChange={(v: "pkr" | "pct") => { setDiscountType(v); setDiscountRuleName(undefined); }}>
                        <SelectTrigger className="w-20 h-7 text-xs" data-testid="select-discount-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pkr">PKR</SelectItem>
                          <SelectItem value="pct">%</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0"
                        value={discountValue}
                        onChange={(e) => { setDiscountValue(e.target.value); setDiscountRuleName(undefined); }}
                        className="h-7 text-xs flex-1"
                        data-testid="input-discount-value"
                      />
                      {(parseFloat(discountValue) > 0 || !!discountRuleName) && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => { setDiscountValue(""); setDiscountType("pkr"); setDiscountRuleName(undefined); }}
                          data-testid="button-clear-discount"
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                    {orderDiscountAmt > 0 && (
                      <div className="flex justify-between text-xs text-green-600">
                        <span>{t("Discount applied")}</span>
                        <span>-PKR {orderDiscountAmt.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between font-semibold">
                    <span>{t("Total")}</span>
                    <span>PKR {total.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Order details form */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t("Order Details")}</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="orderType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("Order Type")}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-order-type">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="dine-in">{t("Dine-in")}</SelectItem>
                            <SelectItem value="takeaway">{t("Takeaway")}</SelectItem>
                            <SelectItem value="delivery">{t("Delivery")}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="paymentMethod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("Payment Method")}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-payment-method">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="cash">{t("Cash")}</SelectItem>
                            <SelectItem value="jazzcash">{t("JazzCash")}</SelectItem>
                            <SelectItem value="easypaisa">{t("EasyPaisa")}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="customerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("Customer")} ({t("Optional")})</FormLabel>
                        <Select onValueChange={(v) => field.onChange(v ? parseInt(v) : undefined)} value={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger data-testid="select-customer">
                              <SelectValue placeholder={t("Walk-in / Select customer")} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {customers.data?.map((c) => (
                              <SelectItem key={c.id} value={c.id.toString()}>{c.name} {c.phone ? `(${c.phone})` : ""}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("Notes")}</FormLabel>
                        <FormControl>
                          <Textarea placeholder={t("Special requests...")} {...field} data-testid="textarea-notes" rows={2} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={createOrder.isPending} data-testid="button-submit-order">
                    {createOrder.isPending ? t("Creating...") : t("Place Order")}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Receipt preview dialog */}
      <Dialog open={receiptOpen} onOpenChange={(open) => { if (!open) handleReceiptClose(); }}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="w-4 h-4" />
              {t("Order Created")} — {t("Invoice")}
            </DialogTitle>
          </DialogHeader>
          {receiptBill && (
            <div className="space-y-4">
              <ReceiptContent
                b={buildReceiptBillData(receiptBill)}
                settings={settings}
              />
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={handleReceiptClose} data-testid="button-close-receipt">
                  {t("Close")}
                </Button>
                <Button className="flex-1" onClick={() => {
                  if (receiptBill?.bill?.id) {
                    window.open(`/bills/${receiptBill.bill.id}/print`, "_blank");
                  }
                  handleReceiptClose();
                }} data-testid="button-print-receipt">
                  {t("Print")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
