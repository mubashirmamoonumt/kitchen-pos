import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import {
  useGetOrder,
  useUpdateOrderStatus,
  useGenerateBill,
  getListBillsQueryKey,
  getListOrdersQueryKey,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/context/I18nContext";
import { ScreenHeader } from "@/components/ScreenHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";

const STATUS_TRANSITIONS: Record<string, string | null> = {
  pending: "confirmed",
  confirmed: "preparing",
  preparing: "ready",
  ready: "delivered",
  delivered: null,
  cancelled: null,
};

type PaymentMethod = "cash" | "jazzcash" | "easypaisa";

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const { t, isRtl } = useI18n();
  const qc = useQueryClient();

  const order = useGetOrder(Number(id));
  const updateStatus = useUpdateOrderStatus();
  const generateBill = useGenerateBill();

  const [showBillForm, setShowBillForm] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [billNotes, setBillNotes] = useState("");

  const handleAdvance = (nextStatus: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateStatus.mutate(
      { id: Number(id), data: { status: nextStatus } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListOrdersQueryKey() });
          order.refetch();
        },
      }
    );
  };

  const handleGenerateBill = () => {
    generateBill.mutate(
      { data: { orderId: Number(id), paymentMethod, notes: billNotes || undefined } },
      {
        onSuccess: (data) => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          qc.invalidateQueries({ queryKey: getListBillsQueryKey() });
          setShowBillForm(false);
          router.push({ pathname: "/bill/[id]", params: { id: data.id } });
        },
      }
    );
  };

  if (order.isLoading) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <ScreenHeader title={t.orders} showBack />
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </View>
    );
  }

  const data = order.data;
  if (!data) return null;

  const nextStatus = STATUS_TRANSITIONS[data.status];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScreenHeader title={`${t.order.id} #${data.id}`} showBack />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: Platform.OS === "web" ? 50 : 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.summaryRow, { borderBottomColor: colors.border, flexDirection: isRtl ? "row-reverse" : "row" }]}>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Status</Text>
            <StatusBadge status={data.status} />
          </View>
          <View style={[styles.summaryRow, { borderBottomColor: colors.border, flexDirection: isRtl ? "row-reverse" : "row" }]}>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>{t.order.customer}</Text>
            <Text style={[styles.summaryValue, { color: colors.foreground }]}>
              {data.customerName || t.order.walkin}
            </Text>
          </View>
          {data.paymentMethod && (
            <View style={[styles.summaryRow, { borderBottomColor: colors.border, flexDirection: isRtl ? "row-reverse" : "row" }]}>
              <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>{t.order.paymentMethod}</Text>
              <Text style={[styles.summaryValue, { color: colors.foreground }]}>{data.paymentMethod}</Text>
            </View>
          )}
          <View style={[styles.summaryRow, { borderBottomColor: colors.border, borderBottomWidth: 0, flexDirection: isRtl ? "row-reverse" : "row" }]}>
            <Text style={[styles.summaryLabel, { color: colors.foreground, fontWeight: "700" }]}>{t.total}</Text>
            <Text style={[styles.totalValue, { color: colors.primary }]}>
              PKR {Number(data.totalAmount).toLocaleString()}
            </Text>
          </View>
        </View>

        {data.items.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{t.order.items.toUpperCase()}</Text>
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
                    <Text style={[styles.itemName, { color: colors.foreground, textAlign: isRtl ? "right" : "left" }]}>
                      {item.itemName}
                    </Text>
                    <Text style={[styles.itemQty, { color: colors.mutedForeground }]}>
                      ×{item.quantity} @ PKR {Number(item.itemPrice).toLocaleString()}
                    </Text>
                  </View>
                  <Text style={[styles.itemSubtotal, { color: colors.foreground }]}>
                    PKR {Number(item.subtotal).toLocaleString()}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        {data.notes ? (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, padding: 14 }]}>
            <Text style={[styles.notesLabel, { color: colors.mutedForeground }]}>{t.order.notes}</Text>
            <Text style={[styles.notesText, { color: colors.foreground }]}>{data.notes}</Text>
          </View>
        ) : null}

        {nextStatus && (
          <TouchableOpacity
            style={[styles.advanceBtn, { backgroundColor: colors.primary, opacity: updateStatus.isPending ? 0.7 : 1 }]}
            onPress={() => handleAdvance(nextStatus)}
            disabled={updateStatus.isPending}
          >
            {updateStatus.isPending ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <>
                <Ionicons name="arrow-forward-circle-outline" size={20} color={colors.primaryForeground} />
                <Text style={[styles.advanceBtnText, { color: colors.primaryForeground }]}>
                  {t.orderStatus.moveTo} {nextStatus.charAt(0).toUpperCase() + nextStatus.slice(1)}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {data.status === "delivered" && (
          <>
            <TouchableOpacity
              style={[styles.billBtn, { backgroundColor: colors.success + "18", borderColor: colors.success }]}
              onPress={() => setShowBillForm(!showBillForm)}
            >
              <Ionicons name="receipt-outline" size={18} color={colors.success} />
              <Text style={[styles.billBtnText, { color: colors.success }]}>{t.billing.generateBill}</Text>
            </TouchableOpacity>

            {showBillForm && (
              <View style={[styles.billForm, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.billFormTitle, { color: colors.foreground }]}>{t.billing.paymentMethod}</Text>
                <View style={[styles.optRow, { flexDirection: isRtl ? "row-reverse" : "row" }]}>
                  {(["cash", "jazzcash", "easypaisa"] as PaymentMethod[]).map((m) => (
                    <TouchableOpacity
                      key={m}
                      style={[
                        styles.optChip,
                        {
                          borderColor: paymentMethod === m ? colors.primary : colors.border,
                          backgroundColor: paymentMethod === m ? colors.primary + "15" : "transparent",
                        },
                      ]}
                      onPress={() => setPaymentMethod(m)}
                    >
                      <Text style={[styles.optChipText, { color: paymentMethod === m ? colors.primary : colors.mutedForeground }]}>
                        {m === "jazzcash" ? "JazzCash" : m === "easypaisa" ? "EasyPaisa" : "Cash"}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  style={[styles.notesInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                  placeholder={t.billing.notes}
                  placeholderTextColor={colors.mutedForeground}
                  value={billNotes}
                  onChangeText={setBillNotes}
                />
                <TouchableOpacity
                  style={[styles.confirmBillBtn, { backgroundColor: colors.success, opacity: generateBill.isPending ? 0.7 : 1 }]}
                  onPress={handleGenerateBill}
                  disabled={generateBill.isPending}
                >
                  {generateBill.isPending ? (
                    <ActivityIndicator color={colors.primaryForeground} size="small" />
                  ) : (
                    <Text style={[styles.confirmBillBtnText, { color: colors.primaryForeground }]}>
                      {t.billing.generateBill}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
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
  notesLabel: { fontSize: 12, fontWeight: "600", marginBottom: 4 },
  notesText: { fontSize: 15 },
  advanceBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 12, paddingVertical: 14 },
  advanceBtnText: { fontSize: 15, fontWeight: "600" },
  billBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 12, borderWidth: 1, paddingVertical: 14 },
  billBtnText: { fontSize: 15, fontWeight: "600" },
  billForm: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 12 },
  billFormTitle: { fontSize: 14, fontWeight: "600" },
  optRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  optChip: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8 },
  optChipText: { fontSize: 13, fontWeight: "500" },
  notesInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, height: 48, fontSize: 15 },
  confirmBillBtn: { borderRadius: 10, height: 48, alignItems: "center", justifyContent: "center" },
  confirmBillBtnText: { fontSize: 15, fontWeight: "600" },
});
