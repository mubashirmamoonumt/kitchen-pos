import React from "react";
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useGetBill } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/context/I18nContext";
import { ScreenHeader } from "@/components/ScreenHeader";
import { StatusBadge } from "@/components/StatusBadge";

export default function BillDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const { t, isRtl } = useI18n();

  const bill = useGetBill(Number(id));

  if (bill.isLoading) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <ScreenHeader title={t.billing.viewBill} showBack />
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </View>
    );
  }

  const data = bill.data;
  if (!data) return null;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScreenHeader title={`${t.billing.billFor} #${data.orderId}`} showBack />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: Platform.OS === "web" ? 50 : 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.summaryRow, { flexDirection: isRtl ? "row-reverse" : "row", borderBottomColor: colors.border }]}>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>{t.billing.paymentMethod}</Text>
            <Text style={[styles.summaryValue, { color: colors.foreground }]}>{data.paymentMethod}</Text>
          </View>
          <View style={[styles.summaryRow, { flexDirection: isRtl ? "row-reverse" : "row", borderBottomColor: colors.border }]}>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Order Status</Text>
            <StatusBadge status={data.order.status} size="sm" />
          </View>
          <View style={[styles.summaryRow, { flexDirection: isRtl ? "row-reverse" : "row", borderBottomColor: colors.border, borderBottomWidth: 0 }]}>
            <Text style={[styles.summaryLabel, { color: colors.foreground, fontWeight: "700" }]}>{t.billing.total}</Text>
            <Text style={[styles.totalValue, { color: colors.primary }]}>PKR {Number(data.totalAmount).toLocaleString()}</Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{t.billing.items.toUpperCase()}</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {data.items.map((item, idx) => (
            <View
              key={item.id}
              style={[
                styles.itemRow,
                {
                  borderBottomColor: colors.border,
                  borderBottomWidth: idx < data.items.length - 1 ? 1 : 0,
                  flexDirection: isRtl ? "row-reverse" : "row",
                },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.itemName, { color: colors.foreground, textAlign: isRtl ? "right" : "left" }]}>{item.itemName}</Text>
                <Text style={[styles.itemQty, { color: colors.mutedForeground }]}>×{item.quantity} @ PKR {Number(item.unitPrice).toLocaleString()}</Text>
              </View>
              <Text style={[styles.itemSubtotal, { color: colors.foreground }]}>PKR {Number(item.subtotal).toLocaleString()}</Text>
            </View>
          ))}
        </View>

        {data.notes ? (
          <>
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{t.billing.notes.toUpperCase()}</Text>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, padding: 14 }]}>
              <Text style={[styles.notesText, { color: colors.foreground }]}>{data.notes}</Text>
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 16, gap: 12 },
  summaryCard: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  summaryRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  summaryLabel: { fontSize: 14 },
  summaryValue: { fontSize: 14, fontWeight: "500" },
  totalValue: { fontSize: 20, fontWeight: "700" },
  sectionTitle: { fontSize: 11, fontWeight: "600", letterSpacing: 0.5 },
  card: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  itemRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12 },
  itemName: { fontSize: 14, fontWeight: "600" },
  itemQty: { fontSize: 12, marginTop: 2 },
  itemSubtotal: { fontSize: 14, fontWeight: "600" },
  notesText: { fontSize: 15 },
});
