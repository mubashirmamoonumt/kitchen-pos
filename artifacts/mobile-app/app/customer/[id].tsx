import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import {
  useGetCustomer,
  useDeleteCustomer,
  getListCustomersQueryKey,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/context/I18nContext";
import { StatusBadge } from "@/components/StatusBadge";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const { t, isRtl } = useI18n();
  const qc = useQueryClient();

  const customer = useGetCustomer(Number(id));
  const deleteCustomer = useDeleteCustomer();

  const handleDelete = () => {
    Alert.alert(
      t.delete,
      `${t.delete} ${customer.data?.name}?`,
      [
        { text: t.cancel, style: "cancel" },
        {
          text: t.delete,
          style: "destructive",
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            deleteCustomer.mutate(
              { id: Number(id) },
              {
                onSuccess: () => {
                  qc.invalidateQueries({ queryKey: getListCustomersQueryKey() });
                  router.back();
                },
              }
            );
          },
        },
      ]
    );
  };

  if (customer.isLoading) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <ScreenHeader title={t.tabs.customers} showBack />
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </View>
    );
  }

  const data = customer.data;
  if (!data) return null;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title={data.name}
        showBack
        right={
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity
              onPress={() => router.push({ pathname: "/customer/edit/[id]", params: { id } })}
              style={[styles.iconBtn, { backgroundColor: colors.muted }]}
            >
              <Ionicons name="create-outline" size={18} color={colors.foreground} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleDelete}
              style={[styles.iconBtn, { backgroundColor: colors.destructive + "15" }]}
            >
              <Ionicons name="trash-outline" size={18} color={colors.destructive} />
            </TouchableOpacity>
          </View>
        }
      />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, { paddingBottom: Platform.OS === "web" ? 50 : 20 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.statRow]}>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.foreground }]}>{data.totalOrders}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{t.customer.totalOrders}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.success }]}>PKR {Number(data.totalSpent).toLocaleString()}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{t.customer.totalSpent}</Text>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{t.customer.information.toUpperCase()}</Text>
          {data.phone ? (
            <View style={[styles.infoRow, { borderBottomColor: colors.border, flexDirection: isRtl ? "row-reverse" : "row" }]}>
              <Ionicons name="call-outline" size={16} color={colors.mutedForeground} />
              <Text style={[styles.infoText, { color: colors.foreground }]}>{data.phone}</Text>
            </View>
          ) : null}
          {data.address ? (
            <View style={[styles.infoRow, { borderBottomColor: colors.border, borderBottomWidth: 0, flexDirection: isRtl ? "row-reverse" : "row" }]}>
              <Ionicons name="location-outline" size={16} color={colors.mutedForeground} />
              <Text style={[styles.infoText, { color: colors.foreground }]}>{data.address}</Text>
            </View>
          ) : null}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.mutedForeground, marginHorizontal: 0 }]}>
          {t.customer.recentOrders}
        </Text>
        {data.recentOrders?.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{t.noData}</Text>
        ) : (
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {data.recentOrders?.slice(0, 8).map((order, idx) => (
              <View
                key={order.id}
                style={[
                  styles.orderRow,
                  { borderBottomColor: colors.border, flexDirection: isRtl ? "row-reverse" : "row" },
                  idx === (data.recentOrders?.length ?? 0) - 1 && { borderBottomWidth: 0 },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.orderIdText, { color: colors.foreground }]}>#{order.id}</Text>
                  <Text style={[styles.orderDateText, { color: colors.mutedForeground }]}>
                    {new Date(order.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                <View style={{ alignItems: isRtl ? "flex-start" : "flex-end", gap: 4 }}>
                  <StatusBadge status={order.status} size="sm" />
                  <Text style={[styles.orderAmountText, { color: colors.foreground }]}>
                    PKR {Number(order.totalAmount).toLocaleString()}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { paddingHorizontal: 16, paddingTop: 16, gap: 12 },
  statRow: { flexDirection: "row", gap: 10 },
  statCard: { flex: 1, borderRadius: 14, borderWidth: 1, padding: 14, gap: 4 },
  statValue: { fontSize: 20, fontWeight: "700" },
  statLabel: { fontSize: 12 },
  section: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  sectionTitle: { fontSize: 11, fontWeight: "600", letterSpacing: 0.5, paddingHorizontal: 0, paddingBottom: 8 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1 },
  infoText: { fontSize: 15 },
  emptyText: { fontSize: 14, textAlign: "center", paddingVertical: 12 },
  orderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1 },
  orderIdText: { fontSize: 14, fontWeight: "600" },
  orderDateText: { fontSize: 12 },
  orderAmountText: { fontSize: 14, fontWeight: "600" },
  iconBtn: { borderRadius: 8, padding: 8 },
});
