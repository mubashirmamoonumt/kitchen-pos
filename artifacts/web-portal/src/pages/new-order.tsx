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
  getListOrdersQueryKey,
} from "@workspace/api-client-react";
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
import { Minus, Plus, ArrowLeft, Trash2 } from "lucide-react";
import { Link } from "wouter";

const schema = z.object({
  orderType: z.enum(["dine-in", "takeaway", "delivery"]),
  paymentMethod: z.enum(["cash", "jazzcash", "easypaisa"]),
  customerId: z.number().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface CartItem {
  menuItemId: number;
  name: string;
  nameUr: string;
  price: string;
  quantity: number;
}

export default function NewOrder() {
  const { t, language } = useLanguage();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);

  const categories = useListCategories();
  const menuItems = useListMenuItems({ params: categoryId ? { categoryId, isAvailable: true } : { isAvailable: true } });
  const customers = useListCustomers();
  const createOrder = useCreateOrder();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { orderType: "dine-in", paymentMethod: "cash", notes: "" },
  });

  const addToCart = (item: { id: number; name: string; nameUr: string; price: string }) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItemId === item.id);
      if (existing) {
        return prev.map((c) => c.menuItemId === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { menuItemId: item.id, name: item.name, nameUr: item.nameUr, price: item.price, quantity: 1 }];
    });
  };

  const updateQty = (menuItemId: number, delta: number) => {
    setCart((prev) => {
      const updated = prev.map((c) => c.menuItemId === menuItemId ? { ...c, quantity: Math.max(0, c.quantity + delta) } : c);
      return updated.filter((c) => c.quantity > 0);
    });
  };

  const total = cart.reduce((sum, c) => sum + parseFloat(c.price) * c.quantity, 0);

  const onSubmit = (values: FormValues) => {
    if (cart.length === 0) {
      toast({ variant: "destructive", title: t("Error"), description: t("Add at least one item to the order") });
      return;
    }
    createOrder.mutate(
      {
        data: {
          ...values,
          items: cart.map((c) => ({ menuItemId: c.menuItemId, quantity: c.quantity, itemName: c.name, itemPrice: c.price })),
        },
      },
      {
        onSuccess: () => {
          toast({ title: t("Order Created Successfully") });
          queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
          setLocation("/orders");
        },
        onError: (err: any) => {
          toast({ variant: "destructive", title: t("Error"), description: err?.data?.error || t("Failed to create order") });
        },
      }
    );
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
                      <p className="text-primary font-semibold text-sm mt-1">PKR {Number(item.price).toLocaleString()}</p>
                      {inCart && <Badge variant="secondary" className="text-xs mt-1">×{inCart.quantity}</Badge>}
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
                  {cart.map((item) => (
                    <div key={item.menuItemId} className="flex items-center gap-2" data-testid={`cart-item-${item.menuItemId}`}>
                      <span className="text-sm flex-1 truncate">{language === "ur" && item.nameUr ? item.nameUr : item.name}</span>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateQty(item.menuItemId, -1)}>
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="text-sm w-4 text-center">{item.quantity}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateQty(item.menuItemId, 1)}>
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                      <span className="text-sm font-medium w-20 text-right">PKR {(parseFloat(item.price) * item.quantity).toLocaleString()}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => setCart(c => c.filter(x => x.menuItemId !== item.menuItemId))}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>{t("Total")}</span>
                    <span>PKR {total.toLocaleString()}</span>
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
    </div>
  );
}
