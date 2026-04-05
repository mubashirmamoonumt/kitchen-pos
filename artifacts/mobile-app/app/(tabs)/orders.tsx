import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useListOrders, useUpdateOrderStatus, getListOrdersQueryKey } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/context/I18nContext";
import { StatusBadge } from "@/components/StatusBadge";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";

const STATUS_FILTERS = ["all", "pending", "confirmed", "preparing", "ready", "delivered", "cancelled"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const STATUS_TRANSITIONS: Record<string, string | null> = {
  pending: "confirmed",
  confirmed: "preparing",
  preparing: "ready",
  ready: "delivered",
  delivered: null,
  cancelled: null,
};

export default function OrdersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t, isRtl } = useI18n();
  const qc = useQueryClient();

  const [filterStatus, setFilterStatus] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");

  const orders = useListOrders(filterStatus !== "all" ? { status: filterStatus } : undefined);
  const updateStatus = useUpdateOrderStatus();

  const filtered = (orders.data ?? []).filter((o) => {
    if (!search) return true;
    return (
      String(o.id).includes(search) ||
      (o.customerName ?? "").toLowerCase().includes(search.toLowerCase())
    );
  });

  const handleAdvance = (orderId: number, nextStatus: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateStatus.mutate(
      { id: orderId, data: { status: nextStatus } },
      { onSuccess: () => qc.invalidateQueries({ queryKey: getListOrdersQueryKey() }) }
    );
  };

  const renderOrder = ({ item }: { item: (typeof filtered)[number] }) => {
    const next = STATUS_TRANSITIONS[item.status];
    return (
      <TouchableOpacity
        style={[styles.orderCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        testID={`card-order-${item.id}`}
        onPress={() => router.push({ pathname: "/order/[id]", params: { id: item.id } })}
      >
        <View style={styles.orderHeader}>
          <View style={styles.orderMeta}>
            <Text style={[styles.orderId, { color: colors.foreground }]}>{t.order.id} #{item.id}</Text>
            <StatusBadge status={item.status} size="sm" />
          </View>
          <Text style={[styles.orderAmount, { color: colors.foreground }]}>
            PKR {Number(item.totalAmount).toLocaleString()}
          </Text>
        </View>
        <Text style={[styles.orderSub, { color: colors.mutedForeground }]}>
          {item.customerName || t.order.walkin} · {item.paymentMethod ?? "cash"}
        </Text>
        <Text style={[styles.orderTime, { color: colors.mutedForeground }]}>
          {new Date(item.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
        </Text>
        {next && (
          <TouchableOpacity
            style={[styles.advanceBtn, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "40" }]}
            onPress={(e) => {
              e.stopPropagation && e.stopPropagation();
              handleAdvance(item.id, next);
            }}
            testID={`button-advance-${item.id}`}
          >
            <Ionicons name="arrow-forward-circle-outline" size={16} color={colors.primary} />
            <Text style={[styles.advanceBtnText, { color: colors.primary }]}>
              {t.orderStatus.moveTo} {next.charAt(0).toUpperCase() + next.slice(1)}
            </Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

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
        <Text style={[styles.title, { color: colors.foreground }]}>{t.tabs.orders}</Text>
        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: isRtl ? "row-reverse" : "row" }]}>
          <Ionicons name="search-outline" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground, textAlign: isRtl ? "right" : "left" }]}
            placeholder={t.search}
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
            testID="input-search"
          />
          {search ? (
            <Pressable onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={16} color={colors.mutedForeground} />
            </Pressable>
          ) : null}
        </View>
        <FlatList
          horizontal
          data={STATUS_FILTERS}
          keyExtractor={(s) => s}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
          renderItem={({ item: s }) => (
            <TouchableOpacity
              style={[
                styles.filterChip,
                {
                  backgroundColor: filterStatus === s ? colors.primary : colors.card,
                  borderColor: filterStatus === s ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setFilterStatus(s)}
              testID={`filter-${s}`}
            >
              <Text
                style={[
                  styles.filterChipText,
                  { color: filterStatus === s ? colors.primaryForeground : colors.mutedForeground },
                ]}
              >
                {s === "all" ? t.all : t.status[s as keyof typeof t.status]}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {orders.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="receipt-outline" size={48} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{t.noData}</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(o) => String(o.id)}
          renderItem={renderOrder}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: Platform.OS === "web" ? 34 + 16 : 16 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={!!orders.isFetching}
              onRefresh={() => orders.refetch()}
              tintColor={colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: { borderBottomWidth: 1, paddingHorizontal: 16, paddingBottom: 0 },
  title: { fontSize: 26, fontWeight: "700", marginBottom: 10, marginTop: 16 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
    marginBottom: 10,
  },
  searchInput: { flex: 1, fontSize: 14, height: "100%" },
  filterRow: { gap: 8, paddingBottom: 12 },
  filterChip: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 6 },
  filterChipText: { fontSize: 13, fontWeight: "500" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyText: { fontSize: 15 },
  list: { paddingHorizontal: 16, paddingTop: 12, gap: 10 },
  orderCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 6 },
  orderHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  orderMeta: { flexDirection: "row", alignItems: "center", gap: 8 },
  orderId: { fontSize: 15, fontWeight: "700" },
  orderAmount: { fontSize: 15, fontWeight: "700" },
  orderSub: { fontSize: 13 },
  orderTime: { fontSize: 12 },
  advanceBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 4,
    alignSelf: "flex-start",
  },
  advanceBtnText: { fontSize: 13, fontWeight: "600" },
});
