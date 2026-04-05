import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  useListCategories,
  useListMenuItems,
  useListCustomers,
  useCreateOrder,
  getListOrdersQueryKey,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";

interface CartItem {
  menuItemId: number;
  name: string;
  price: number;
  quantity: number;
}

type PaymentMethod = "cash" | "jazzcash" | "easypaisa";

export default function NewOrderScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();

  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [customerId, setCustomerId] = useState<number | undefined>(undefined);
  const [showCart, setShowCart] = useState(false);

  const categories = useListCategories();
  const menuItems = useListMenuItems(categoryId ? { categoryId, isAvailable: true } : { isAvailable: true });
  const customers = useListCustomers();
  const createOrder = useCreateOrder();

  const total = cart.reduce((sum, c) => sum + c.price * c.quantity, 0);
  const cartCount = cart.reduce((sum, c) => sum + c.quantity, 0);

  const addToCart = (item: { id: number; name: string; price: string }) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItemId === item.id);
      if (existing) {
        return prev.map((c) => c.menuItemId === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { menuItemId: item.id, name: item.name, price: parseFloat(item.price), quantity: 1 }];
    });
  };

  const updateQty = (menuItemId: number, delta: number) => {
    setCart((prev) => {
      const updated = prev.map((c) => c.menuItemId === menuItemId ? { ...c, quantity: Math.max(0, c.quantity + delta) } : c);
      return updated.filter((c) => c.quantity > 0);
    });
  };

  const handlePlaceOrder = () => {
    if (cart.length === 0) {
      Alert.alert("Empty Cart", "Please add at least one item to the order.");
      return;
    }
    createOrder.mutate(
      {
        data: {
          paymentMethod,
          customerId,
          items: cart.map((c) => ({
            menuItemId: c.menuItemId,
            itemName: c.name,
            itemPrice: String(c.price),
            quantity: c.quantity,
          })),
        },
      },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          qc.invalidateQueries({ queryKey: getListOrdersQueryKey() });
          setCart([]);
          setShowCart(false);
          router.push("/(tabs)/orders");
        },
        onError: () => {
          Alert.alert("Error", "Failed to create order. Please try again.");
        },
      }
    );
  };

  const renderMenuItem = ({ item }: { item: NonNullable<typeof menuItems.data>[number] }) => {
    const inCart = cart.find((c) => c.menuItemId === item.id);
    return (
      <TouchableOpacity
        style={[
          styles.menuItem,
          {
            backgroundColor: colors.card,
            borderColor: inCart ? colors.primary : colors.border,
            borderWidth: inCart ? 2 : 1,
          },
        ]}
        onPress={() => addToCart(item)}
        disabled={!item.isAvailable}
        activeOpacity={0.7}
        testID={`button-menu-item-${item.id}`}
      >
        <Text style={[styles.menuItemName, { color: item.isAvailable ? colors.foreground : colors.mutedForeground }]}>
          {item.name}
        </Text>
        <Text style={[styles.menuItemPrice, { color: colors.primary }]}>
          PKR {Number(item.price).toLocaleString()}
        </Text>
        {!item.isAvailable && (
          <Text style={[styles.unavailable, { color: colors.mutedForeground }]}>Unavailable</Text>
        )}
        {inCart && (
          <View style={[styles.qtyBadge, { backgroundColor: colors.primary }]}>
            <Text style={[styles.qtyBadgeText, { color: colors.primaryForeground }]}>{inCart.quantity}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (showCart) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View
          style={[
            styles.topBar,
            {
              paddingTop: Platform.OS === "web" ? 67 : insets.top,
              backgroundColor: colors.background,
              borderBottomColor: colors.border,
            },
          ]}
        >
          <TouchableOpacity onPress={() => setShowCart(false)} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.foreground }]}>Review Order</Text>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.cartContent} showsVerticalScrollIndicator={false}>
          {/* Cart items */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Items</Text>
            {cart.map((item) => (
              <View key={item.menuItemId} style={[styles.cartRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.cartItemName, { color: colors.foreground }]}>{item.name}</Text>
                <View style={styles.cartItemControls}>
                  <TouchableOpacity onPress={() => updateQty(item.menuItemId, -1)} style={[styles.qtyBtn, { borderColor: colors.border }]}>
                    <Ionicons name="remove" size={14} color={colors.foreground} />
                  </TouchableOpacity>
                  <Text style={[styles.cartItemQty, { color: colors.foreground }]}>{item.quantity}</Text>
                  <TouchableOpacity onPress={() => updateQty(item.menuItemId, 1)} style={[styles.qtyBtn, { borderColor: colors.border }]}>
                    <Ionicons name="add" size={14} color={colors.foreground} />
                  </TouchableOpacity>
                </View>
                <Text style={[styles.cartItemPrice, { color: colors.foreground }]}>
                  PKR {(item.price * item.quantity).toLocaleString()}
                </Text>
              </View>
            ))}
            <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
              <Text style={[styles.totalLabel, { color: colors.foreground }]}>Total</Text>
              <Text style={[styles.totalAmount, { color: colors.foreground }]}>PKR {total.toLocaleString()}</Text>
            </View>
          </View>

          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Payment Method</Text>
            <View style={styles.optRow}>
              {(["cash", "jazzcash", "easypaisa"] as PaymentMethod[]).map((method) => (
                <TouchableOpacity
                  key={method}
                  style={[styles.optChip, { borderColor: paymentMethod === method ? colors.primary : colors.border, backgroundColor: paymentMethod === method ? colors.primary + "15" : "transparent" }]}
                  onPress={() => setPaymentMethod(method)}
                >
                  <Text style={[styles.optChipText, { color: paymentMethod === method ? colors.primary : colors.mutedForeground }]}>
                    {method === "jazzcash" ? "JazzCash" : method === "easypaisa" ? "EasyPaisa" : "Cash"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Customer (Optional)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.optRow}>
              <TouchableOpacity
                style={[styles.optChip, { borderColor: !customerId ? colors.primary : colors.border, backgroundColor: !customerId ? colors.primary + "15" : "transparent" }]}
                onPress={() => setCustomerId(undefined)}
              >
                <Text style={[styles.optChipText, { color: !customerId ? colors.primary : colors.mutedForeground }]}>Walk-in</Text>
              </TouchableOpacity>
              {customers.data?.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.optChip, { borderColor: customerId === c.id ? colors.primary : colors.border, backgroundColor: customerId === c.id ? colors.primary + "15" : "transparent" }]}
                  onPress={() => setCustomerId(c.id)}
                >
                  <Text style={[styles.optChipText, { color: customerId === c.id ? colors.primary : colors.mutedForeground }]}>{c.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </ScrollView>

        <View
          style={[
            styles.cartFooter,
            {
              backgroundColor: colors.background,
              borderTopColor: colors.border,
              paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 8,
            },
          ]}
        >
          <TouchableOpacity
            style={[styles.placeOrderBtn, { backgroundColor: colors.primary, opacity: createOrder.isPending ? 0.7 : 1 }]}
            onPress={handlePlaceOrder}
            disabled={createOrder.isPending}
            testID="button-submit-order"
          >
            {createOrder.isPending ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <>
                <Text style={[styles.placeOrderBtnText, { color: colors.primaryForeground }]}>Place Order</Text>
                <Text style={[styles.placeOrderAmount, { color: colors.primaryForeground + "cc" }]}>
                  PKR {total.toLocaleString()}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.topBar,
          {
            paddingTop: Platform.OS === "web" ? 67 : insets.top,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>New Order</Text>
        <FlatList
          horizontal
          data={[{ id: null as number | null, name: "All" }, ...(categories.data?.map((c) => ({ id: c.id as number | null, name: c.name })) ?? [])]}
          keyExtractor={(c) => String(c.id)}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
          renderItem={({ item: cat }) => (
            <TouchableOpacity
              style={[
                styles.filterChip,
                {
                  backgroundColor: categoryId === cat.id ? colors.primary : colors.card,
                  borderColor: categoryId === cat.id ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setCategoryId(cat.id)}
              testID={`badge-category-${cat.id ?? "all"}`}
            >
              <Text style={[styles.filterChipText, { color: categoryId === cat.id ? colors.primaryForeground : colors.mutedForeground }]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {menuItems.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={menuItems.data ?? []}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderMenuItem}
          numColumns={2}
          columnWrapperStyle={styles.menuRow}
          contentContainerStyle={[
            styles.menuList,
            { paddingBottom: Platform.OS === "web" ? 34 + 100 : 100 },
          ]}
          showsVerticalScrollIndicator={false}
        />
      )}

      {cartCount > 0 && (
        <View
          style={[
            styles.cartBarWrapper,
            { paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 8 },
          ]}
        >
          <TouchableOpacity
            style={[styles.cartBar, { backgroundColor: colors.primary }]}
            onPress={() => setShowCart(true)}
          >
            <View style={[styles.cartCount, { backgroundColor: colors.primaryForeground + "30" }]}>
              <Text style={[styles.cartCountText, { color: colors.primaryForeground }]}>{cartCount}</Text>
            </View>
            <Text style={[styles.cartBarText, { color: colors.primaryForeground }]}>Review Order</Text>
            <Text style={[styles.cartBarAmount, { color: colors.primaryForeground }]}>PKR {total.toLocaleString()}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: { borderBottomWidth: 1, paddingHorizontal: 16, paddingBottom: 0 },
  title: { fontSize: 26, fontWeight: "700", marginBottom: 10, marginTop: 16 },
  backBtn: { marginBottom: 8, marginTop: 16 },
  filterRow: { gap: 8, paddingBottom: 12 },
  filterChip: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 6 },
  filterChipText: { fontSize: 13, fontWeight: "500" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  menuList: { paddingHorizontal: 12, paddingTop: 12, gap: 10 },
  menuRow: { gap: 10, paddingHorizontal: 4 },
  menuItem: { flex: 1, borderRadius: 14, padding: 14, position: "relative" },
  menuItemName: { fontSize: 14, fontWeight: "600", marginBottom: 6 },
  menuItemPrice: { fontSize: 15, fontWeight: "700" },
  unavailable: { fontSize: 11, marginTop: 4 },
  qtyBadge: { position: "absolute", top: 8, right: 8, width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  qtyBadgeText: { fontSize: 12, fontWeight: "700" },
  cartBarWrapper: { position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 16 },
  cartBar: {
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  cartCount: { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2, marginRight: 10 },
  cartCountText: { fontSize: 13, fontWeight: "700" },
  cartBarText: { flex: 1, fontSize: 16, fontWeight: "600" },
  cartBarAmount: { fontSize: 15, fontWeight: "700" },
  cartContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16, gap: 12 },
  section: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 12 },
  sectionTitle: { fontSize: 14, fontWeight: "600" },
  cartRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, gap: 8 },
  cartItemName: { flex: 1, fontSize: 14 },
  cartItemControls: { flexDirection: "row", alignItems: "center", gap: 8 },
  qtyBtn: { width: 28, height: 28, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  cartItemQty: { fontSize: 14, fontWeight: "600", minWidth: 20, textAlign: "center" },
  cartItemPrice: { fontSize: 14, fontWeight: "600", minWidth: 80, textAlign: "right" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingTop: 12, borderTopWidth: 1 },
  totalLabel: { fontSize: 15, fontWeight: "700" },
  totalAmount: { fontSize: 15, fontWeight: "700" },
  optRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  optChip: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8 },
  optChipText: { fontSize: 13, fontWeight: "500" },
  cartFooter: { borderTopWidth: 1, paddingTop: 12, paddingHorizontal: 16 },
  placeOrderBtn: { borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 16, gap: 8 },
  placeOrderBtnText: { fontSize: 16, fontWeight: "700" },
  placeOrderAmount: { fontSize: 15, fontWeight: "600" },
});
