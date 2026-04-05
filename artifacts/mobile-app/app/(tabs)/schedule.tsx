import React from "react";
import {
  ActivityIndicator,
  DimensionValue,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useListScheduledOrders, useGetDailyCapacity, useConvertScheduledOrder, getListScheduledOrdersQueryKey, getListOrdersQueryKey } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/context/I18nContext";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";

export default function ScheduleScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t, isRtl } = useI18n();
  const qc = useQueryClient();

  const today = new Date().toISOString().split("T")[0];
  const scheduled = useListScheduledOrders();
  const capacity = useGetDailyCapacity({ date: today });
  const convertOrder = useConvertScheduledOrder();

  const handleConvert = (id: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    convertOrder.mutate(
      { id },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          qc.invalidateQueries({ queryKey: getListScheduledOrdersQueryKey() });
          qc.invalidateQueries({ queryKey: getListOrdersQueryKey() });
        },
      }
    );
  };

  const renderItem = ({ item }: { item: NonNullable<typeof scheduled.data>[number] }) => (
    <View
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      testID={`card-scheduled-${item.id}`}
    >
      <View style={[{ flex: 1, alignItems: isRtl ? "flex-end" : "flex-start" }]}>
        <Text style={[styles.cardDate, { color: colors.primary }]}>
          {item.scheduledDate} {item.scheduledTime}
        </Text>
        <Text style={[styles.cardName, { color: colors.foreground }]}>
          {item.customerName || t.order.walkin}
        </Text>
        {item.notes ? (
          <Text style={[styles.cardNotes, { color: colors.mutedForeground }]}>{item.notes}</Text>
        ) : null}
        <Text style={[styles.cardItems, { color: colors.mutedForeground }]}>
          {item.items?.length ?? 0} {t.order.items}
        </Text>
      </View>
      <View style={{ alignItems: "flex-end", gap: 8 }}>
        <View style={[styles.statusBadge, {
          backgroundColor: item.status === "pending" ? colors.warning + "20" : item.status === "converted" ? colors.success + "20" : colors.muted,
        }]}>
          <Text style={[styles.statusText, {
            color: item.status === "pending" ? colors.warning : item.status === "converted" ? colors.success : colors.mutedForeground,
          }]}>
            {item.status}
          </Text>
        </View>
        {item.status === "pending" && !item.convertedOrderId && (
          <TouchableOpacity
            style={[styles.convertBtn, { backgroundColor: colors.primary }]}
            onPress={() => handleConvert(item.id)}
          >
            <Text style={[styles.convertBtnText, { color: colors.primaryForeground }]}>
              {t.schedule.convertToOrder}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const cap = capacity.data;
  const capPercent = cap ? Math.round((cap.currentCount / Math.max(cap.capacity, 1)) * 100) : 0;

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
        <View style={[styles.titleRow, { flexDirection: isRtl ? "row-reverse" : "row" }]}>
          <Text style={[styles.title, { color: colors.foreground }]}>{t.tabs.schedule}</Text>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/schedule/new")}
            testID="button-add-schedule"
          >
            <Ionicons name="add" size={18} color={colors.primaryForeground} />
            <Text style={[styles.addBtnText, { color: colors.primaryForeground }]}>{t.add}</Text>
          </TouchableOpacity>
        </View>

        {cap && (
          <View style={[styles.capacityCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.capacityRow, { flexDirection: isRtl ? "row-reverse" : "row" }]}>
              <Text style={[styles.capacityLabel, { color: colors.foreground }]}>{t.schedule.dailyCapacity}</Text>
              <Text style={[styles.capacityNum, { color: colors.mutedForeground }]}>
                {cap.currentCount} / {cap.capacity}
              </Text>
            </View>
            <View style={[styles.progressBg, { backgroundColor: colors.muted }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(capPercent, 100)}%` as DimensionValue,
                    backgroundColor: capPercent >= 90 ? colors.destructive : capPercent >= 70 ? colors.warning : colors.success,
                  },
                ]}
              />
            </View>
            <Text style={[styles.capacitySub, { color: colors.mutedForeground }]}>
              {cap.available} {t.schedule.available}
            </Text>
          </View>
        )}
      </View>

      {scheduled.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={scheduled.data}
          keyExtractor={(s) => String(s.id)}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, { paddingBottom: Platform.OS === "web" ? 50 : 16 }]}
          refreshControl={
            <RefreshControl refreshing={!!scheduled.isFetching} onRefresh={() => scheduled.refetch()} tintColor={colors.primary} />
          }
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="calendar-outline" size={48} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{t.noData}</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: { borderBottomWidth: 1, paddingHorizontal: 16, paddingBottom: 12 },
  titleRow: { alignItems: "center", justifyContent: "space-between", paddingTop: 16, marginBottom: 12 },
  title: { fontSize: 26, fontWeight: "700" },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  addBtnText: { fontSize: 14, fontWeight: "600" },
  capacityCard: { borderRadius: 12, borderWidth: 1, padding: 12, gap: 8 },
  capacityRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  capacityLabel: { fontSize: 13, fontWeight: "600" },
  capacityNum: { fontSize: 13 },
  progressBg: { height: 6, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 3 },
  capacitySub: { fontSize: 11 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 32 },
  emptyText: { fontSize: 15 },
  list: { paddingHorizontal: 16, paddingTop: 12, gap: 8 },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  cardDate: { fontSize: 13, fontWeight: "600", marginBottom: 4 },
  cardName: { fontSize: 15, fontWeight: "600" },
  cardNotes: { fontSize: 13, marginTop: 2 },
  cardItems: { fontSize: 12, marginTop: 4 },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: "600" },
  convertBtn: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  convertBtnText: { fontSize: 12, fontWeight: "600" },
});
