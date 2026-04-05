import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  useGetDailySalesReport,
  useGetTopItemsReport,
  useGetRevenueByPaymentReport,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/context/I18nContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useGetMe } from "@workspace/api-client-react";
import { router } from "expo-router";
import { useEffect } from "react";

function getDateRange(days: number) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  return {
    dateFrom: start.toISOString().split("T")[0],
    dateTo: end.toISOString().split("T")[0],
  };
}

export default function ReportsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t, isRtl } = useI18n();
  const me = useGetMe();

  const [range, setRange] = useState(7);
  const { dateFrom, dateTo } = getDateRange(range);

  const salesReport = useGetDailySalesReport({ dateFrom, dateTo });
  const topItems = useGetTopItemsReport({ dateFrom, dateTo, limit: 5 });
  const revenueByPayment = useGetRevenueByPaymentReport({ dateFrom, dateTo });

  const isOwner = me.data?.role === "owner";

  if (!isOwner) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }]}>
        <Ionicons name="lock-closed-outline" size={48} color={colors.mutedForeground} />
        <Text style={[styles.noAccess, { color: colors.mutedForeground }]}>Owner access required</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: Platform.OS === "web" ? 67 + 16 : insets.top + 16,
          paddingBottom: Platform.OS === "web" ? 50 : 20,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.title, { color: colors.foreground }]}>{t.tabs.reports}</Text>

      <View style={[styles.rangeRow, { flexDirection: isRtl ? "row-reverse" : "row" }]}>
        {[7, 14, 30].map((d) => (
          <TouchableOpacity
            key={d}
            style={[
              styles.rangeBtn,
              {
                backgroundColor: range === d ? colors.primary : colors.card,
                borderColor: range === d ? colors.primary : colors.border,
              },
            ]}
            onPress={() => setRange(d)}
          >
            <Text style={[styles.rangeBtnText, { color: range === d ? colors.primaryForeground : colors.mutedForeground }]}>
              {d}d
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {salesReport.isLoading ? (
        <ActivityIndicator color={colors.primary} />
      ) : salesReport.data ? (
        <View style={[styles.statsRow, { flexDirection: isRtl ? "row-reverse" : "row" }]}>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{t.reports.revenue}</Text>
            <Text style={[styles.statValue, { color: colors.success }]}>
              PKR {Number(salesReport.data.totalRevenue).toLocaleString()}
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{t.reports.orders}</Text>
            <Text style={[styles.statValue, { color: colors.foreground }]}>
              {salesReport.data.totalOrders}
            </Text>
          </View>
        </View>
      ) : null}

      <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{t.reports.topItems.toUpperCase()}</Text>
      {topItems.isLoading ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {topItems.data?.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{t.noData}</Text>
          ) : (
            topItems.data?.map((item, idx) => (
              <View
                key={item.menuItemId}
                style={[
                  styles.reportRow,
                  {
                    borderBottomColor: colors.border,
                    borderBottomWidth: idx < (topItems.data?.length ?? 0) - 1 ? 1 : 0,
                    flexDirection: isRtl ? "row-reverse" : "row",
                  },
                ]}
              >
                <View style={[styles.rankBadge, { backgroundColor: colors.primary + "18" }]}>
                  <Text style={[styles.rankText, { color: colors.primary }]}>{idx + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.reportItemName, { color: colors.foreground, textAlign: isRtl ? "right" : "left" }]}>
                    {item.itemName}
                  </Text>
                  <Text style={[styles.reportItemSub, { color: colors.mutedForeground }]}>
                    {t.reports.quantity}: {item.totalQuantity}
                  </Text>
                </View>
                <Text style={[styles.reportItemRevenue, { color: colors.success }]}>
                  PKR {Number(item.totalRevenue).toLocaleString()}
                </Text>
              </View>
            ))
          )}
        </View>
      )}

      <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{t.reports.revenueByPayment.toUpperCase()}</Text>
      {revenueByPayment.isLoading ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {revenueByPayment.data?.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{t.noData}</Text>
          ) : (
            revenueByPayment.data?.map((item, idx) => (
              <View
                key={item.paymentMethod}
                style={[
                  styles.reportRow,
                  {
                    borderBottomColor: colors.border,
                    borderBottomWidth: idx < (revenueByPayment.data?.length ?? 0) - 1 ? 1 : 0,
                    flexDirection: isRtl ? "row-reverse" : "row",
                  },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.reportItemName, { color: colors.foreground, textAlign: isRtl ? "right" : "left" }]}>
                    {item.paymentMethod === "cash" ? "Cash" : item.paymentMethod === "jazzcash" ? "JazzCash" : "EasyPaisa"}
                  </Text>
                  <Text style={[styles.reportItemSub, { color: colors.mutedForeground }]}>
                    {item.orderCount} {t.reports.orders}
                  </Text>
                </View>
                <Text style={[styles.reportItemRevenue, { color: colors.success }]}>
                  PKR {Number(item.revenue).toLocaleString()}
                </Text>
              </View>
            ))
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 12 },
  title: { fontSize: 26, fontWeight: "700", marginBottom: 4 },
  noAccess: { fontSize: 16, marginTop: 12 },
  rangeRow: { gap: 8, flexWrap: "wrap" },
  rangeBtn: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 8 },
  rangeBtnText: { fontSize: 13, fontWeight: "600" },
  statsRow: { gap: 10 },
  statCard: { flex: 1, borderRadius: 14, borderWidth: 1, padding: 14, gap: 4 },
  statLabel: { fontSize: 12, fontWeight: "500" },
  statValue: { fontSize: 20, fontWeight: "700" },
  sectionTitle: { fontSize: 11, fontWeight: "600", letterSpacing: 0.5 },
  card: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  reportRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12, gap: 12 },
  rankBadge: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  rankText: { fontSize: 13, fontWeight: "700" },
  reportItemName: { fontSize: 14, fontWeight: "600" },
  reportItemSub: { fontSize: 12 },
  reportItemRevenue: { fontSize: 14, fontWeight: "700" },
  emptyText: { fontSize: 14, textAlign: "center", padding: 24 },
});
