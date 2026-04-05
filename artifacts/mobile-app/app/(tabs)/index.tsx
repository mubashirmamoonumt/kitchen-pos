import React from "react";
import {
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useGetOrdersDashboardSummary, useListIngredients, useListOrders } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const summary = useGetOrdersDashboardSummary();
  const lowStock = useListIngredients({ lowStock: true });
  const activeOrders = useListOrders({ status: "pending" });

  const isRefreshing = summary.isFetching || lowStock.isFetching || activeOrders.isFetching;

  const onRefresh = () => {
    summary.refetch();
    lowStock.refetch();
    activeOrders.refetch();
  };

  const data = summary.data;

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: Platform.OS === "web" ? 67 + 16 : insets.top + 16,
          paddingBottom: Platform.OS === "web" ? 34 + 16 : 16,
        },
      ]}
      refreshControl={<RefreshControl refreshing={!!isRefreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.greeting, { color: colors.mutedForeground }]}>Good day</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>Dashboard</Text>
        </View>
        <TouchableOpacity
          style={[styles.newOrderBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push("/(tabs)/new-order")}
          testID="button-new-order"
        >
          <Ionicons name="add" size={20} color={colors.primaryForeground} />
          <Text style={[styles.newOrderBtnText, { color: colors.primaryForeground }]}>New Order</Text>
        </TouchableOpacity>
      </View>

      {/* KPI Cards */}
      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Today's Overview</Text>
      <View style={styles.statsGrid}>
        <View style={styles.statsRow}>
          <StatCard
            title="Today's Orders"
            value={data?.todayOrderCount ?? "—"}
            sub={`${data?.activeOrderCount ?? 0} active`}
          />
          <StatCard
            title="Revenue"
            value={`PKR ${Number(data?.todayRevenue ?? 0).toLocaleString()}`}
            color={colors.success}
          />
        </View>
        <View style={styles.statsRow}>
          <StatCard
            title="Pending"
            value={data?.pendingOrderCount ?? "—"}
            color={colors.warning}
          />
          <StatCard
            title="Customers"
            value={data?.totalCustomers ?? "—"}
            color={colors.info}
          />
        </View>
      </View>

      {/* Active Orders */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Pending Orders</Text>
        <TouchableOpacity onPress={() => router.push("/(tabs)/orders")} testID="button-view-all-orders">
          <Text style={[styles.seeAll, { color: colors.primary }]}>View all</Text>
        </TouchableOpacity>
      </View>

      {activeOrders.isLoading ? (
        <View style={[styles.skeleton, { backgroundColor: colors.muted }]} />
      ) : activeOrders.data?.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="checkmark-circle-outline" size={32} color={colors.success} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No pending orders</Text>
        </View>
      ) : (
        <View style={[styles.listCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {activeOrders.data?.slice(0, 5).map((order, idx) => (
            <View
              key={order.id}
              style={[
                styles.orderRow,
                { borderBottomColor: colors.border },
                idx === Math.min((activeOrders.data?.length ?? 0) - 1, 4) && styles.lastRow,
              ]}
              testID={`card-order-${order.id}`}
            >
              <View style={styles.orderLeft}>
                <Text style={[styles.orderId, { color: colors.foreground }]}>#{order.id}</Text>
                <Text style={[styles.orderCustomer, { color: colors.mutedForeground }]}>
                  {order.customerName || "Walk-in"}
                </Text>
              </View>
              <View style={styles.orderRight}>
                <StatusBadge status={order.status} size="sm" />
                <Text style={[styles.orderAmount, { color: colors.foreground }]}>
                  PKR {Number(order.totalAmount).toLocaleString()}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Low Stock Alerts */}
      {lowStock.data && lowStock.data.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Low Stock Alerts</Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/menu")}>
              <Text style={[styles.seeAll, { color: colors.primary }]}>View all</Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.listCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {lowStock.data.slice(0, 4).map((ing, idx) => (
              <View
                key={ing.id}
                style={[
                  styles.orderRow,
                  { borderBottomColor: colors.border },
                  idx === Math.min((lowStock.data?.length ?? 0) - 1, 3) && styles.lastRow,
                ]}
                testID={`row-ingredient-${ing.id}`}
              >
                <View style={styles.orderLeft}>
                  <Text style={[styles.orderId, { color: colors.foreground }]}>{ing.name}</Text>
                  <Text style={[styles.orderCustomer, { color: colors.mutedForeground }]}>{ing.unit}</Text>
                </View>
                <View style={styles.orderRight}>
                  <Text style={[styles.stockAmount, { color: colors.destructive }]}>
                    {ing.stockQuantity} / {ing.lowStockThreshold} {ing.unit}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 12 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  greeting: { fontSize: 13, fontWeight: "500" },
  title: { fontSize: 26, fontWeight: "700" },
  newOrderBtn: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  newOrderBtnText: { fontSize: 14, fontWeight: "600" },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionLabel: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  seeAll: { fontSize: 13, fontWeight: "500" },
  statsGrid: { gap: 10 },
  statsRow: { flexDirection: "row", gap: 10 },
  skeleton: { height: 80, borderRadius: 12 },
  emptyCard: { borderRadius: 14, borderWidth: 1, padding: 24, alignItems: "center", gap: 8 },
  emptyText: { fontSize: 14 },
  listCard: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  orderRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  lastRow: { borderBottomWidth: 0 },
  orderLeft: { flex: 1, gap: 2 },
  orderRight: { alignItems: "flex-end", gap: 4 },
  orderId: { fontSize: 14, fontWeight: "600" },
  orderCustomer: { fontSize: 12 },
  orderAmount: { fontSize: 13, fontWeight: "600" },
  stockAmount: { fontSize: 13, fontWeight: "600" },
});
