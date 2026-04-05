import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useGetScheduledOrder, useUpdateScheduledOrder, useListMenuItems, getListScheduledOrdersQueryKey } from "@workspace/api-client-react";
import type { MenuItem } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/context/I18nContext";
import { ScreenHeader } from "@/components/ScreenHeader";
import { FormField } from "@/components/FormField";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";

interface CartItem {
  menuItemId: number;
  itemName: string;
  quantity: number;
  unitPrice: string;
}

export default function EditScheduleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const numId = Number(id);
  const colors = useColors();
  const { t, isRtl } = useI18n();
  const qc = useQueryClient();

  const scheduled = useGetScheduledOrder(numId);
  const menuItems = useListMenuItems();
  const updateScheduled = useUpdateScheduledOrder();

  const [customerName, setCustomerName] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [date, setDate] = useState<string>("");
  const [time, setTime] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [items, setItems] = useState<CartItem[]>([]);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  React.useEffect(() => {
    if (scheduled.data && !initialized) {
      setCustomerName(scheduled.data.customerName ?? "");
      setPhone(scheduled.data.customerPhone ?? "");
      setDate(scheduled.data.scheduledDate);
      setTime(scheduled.data.scheduledTime);
      setNotes(scheduled.data.notes ?? "");
      setItems(
        (scheduled.data.items ?? []).map((i) => ({
          menuItemId: i.menuItemId,
          itemName: i.itemName,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        }))
      );
      setInitialized(true);
    }
  }, [scheduled.data, initialized]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!date.trim()) e.date = t.validation.required;
    if (!time.trim()) e.time = t.validation.required;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const addItem = (item: MenuItem) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.menuItemId === item.id);
      if (existing) {
        return prev.map((i) => i.menuItemId === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { menuItemId: item.id, itemName: item.name, quantity: 1, unitPrice: item.price }];
    });
  };

  const removeItem = (menuItemId: number) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.menuItemId === menuItemId);
      if (!existing) return prev;
      if (existing.quantity <= 1) return prev.filter((i) => i.menuItemId !== menuItemId);
      return prev.map((i) => i.menuItemId === menuItemId ? { ...i, quantity: i.quantity - 1 } : i);
    });
  };

  const getQty = (menuItemId: number) => items.find((i) => i.menuItemId === menuItemId)?.quantity ?? 0;

  const handleSave = () => {
    if (!validate()) return;
    updateScheduled.mutate(
      {
        id: numId,
        data: {
          customerName: customerName.trim() || undefined,
          customerPhone: phone.trim() || undefined,
          scheduledDate: date.trim(),
          scheduledTime: time.trim(),
          notes: notes.trim() || undefined,
          items,
        },
      },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          qc.invalidateQueries({ queryKey: getListScheduledOrdersQueryKey() });
          router.back();
        },
      }
    );
  };

  const totalAmount = items.reduce((sum, i) => sum + Number(i.unitPrice) * i.quantity, 0);

  if (scheduled.isLoading || !initialized) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background, flex: 1, alignItems: "center", justifyContent: "center" }]}>
        <ScreenHeader title={t.schedule.scheduleOrder} showBack />
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScreenHeader title={t.schedule.scheduleOrder} showBack />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: Platform.OS === "web" ? 50 : 24 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <FormField label={t.customer.name} value={customerName} onChangeText={setCustomerName} placeholder={t.customer.name} autoCapitalize="words" />
        <FormField label={t.customer.phone} value={phone} onChangeText={setPhone} placeholder={t.customer.phone} keyboardType="phone-pad" />
        <FormField label={t.schedule.date} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" error={errors.date} />
        <FormField label={t.schedule.time} value={time} onChangeText={setTime} placeholder="HH:MM" error={errors.time} />
        <FormField
          label={t.order.notes}
          value={notes}
          onChangeText={setNotes}
          placeholder={t.order.notes}
          multiline
          style={{ height: 80, paddingTop: 12, textAlignVertical: "top" }}
        />

        <View>
          <View style={[styles.sectionRow, { flexDirection: isRtl ? "row-reverse" : "row" }]}>
            <Text style={[styles.sectionLabel, { color: colors.foreground }]}>{t.order.items}</Text>
            <TouchableOpacity
              style={[styles.addItemBtn, { backgroundColor: colors.primary }]}
              onPress={() => setPickerVisible(true)}
              testID="button-add-items"
            >
              <Ionicons name="add" size={16} color={colors.primaryForeground} />
              <Text style={[styles.addItemBtnText, { color: colors.primaryForeground }]}>{t.order.addItems}</Text>
            </TouchableOpacity>
          </View>

          {items.length > 0 ? (
            <View style={[styles.cartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {items.map((item, idx) => (
                <View
                  key={item.menuItemId}
                  style={[
                    styles.cartRow,
                    {
                      borderBottomColor: colors.border,
                      borderBottomWidth: idx < items.length - 1 ? 1 : 0,
                      flexDirection: isRtl ? "row-reverse" : "row",
                    },
                  ]}
                >
                  <Text style={[styles.cartItemName, { color: colors.foreground, flex: 1 }]} numberOfLines={1}>
                    {item.itemName}
                  </Text>
                  <View style={[styles.qtyRow, { flexDirection: isRtl ? "row-reverse" : "row" }]}>
                    <TouchableOpacity style={[styles.qtyBtn, { backgroundColor: colors.muted }]} onPress={() => removeItem(item.menuItemId)}>
                      <Ionicons name="remove" size={14} color={colors.foreground} />
                    </TouchableOpacity>
                    <Text style={[styles.qtyText, { color: colors.foreground }]}>{item.quantity}</Text>
                    <TouchableOpacity style={[styles.qtyBtn, { backgroundColor: colors.muted }]} onPress={() => addItem({ id: item.menuItemId, name: item.itemName, price: item.unitPrice } as MenuItem)}>
                      <Ionicons name="add" size={14} color={colors.foreground} />
                    </TouchableOpacity>
                  </View>
                  <Text style={[styles.cartItemPrice, { color: colors.success }]}>
                    PKR {(Number(item.unitPrice) * item.quantity).toLocaleString()}
                  </Text>
                </View>
              ))}
              <View style={[styles.totalRow, { borderTopColor: colors.border, flexDirection: isRtl ? "row-reverse" : "row" }]}>
                <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>{t.total}</Text>
                <Text style={[styles.totalValue, { color: colors.success }]}>PKR {totalAmount.toLocaleString()}</Text>
              </View>
            </View>
          ) : (
            <View style={[styles.emptyCart, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.emptyCartText, { color: colors.mutedForeground }]}>{t.order.addItemsToCart}</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: updateScheduled.isPending ? 0.7 : 1 }]}
          onPress={handleSave}
          disabled={updateScheduled.isPending}
          testID="button-save-edit-schedule"
        >
          {updateScheduled.isPending ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>{t.save}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={pickerVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setPickerVisible(false)}>
        <View style={[styles.modalRoot, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>{t.order.addItems}</Text>
            <TouchableOpacity onPress={() => setPickerVisible(false)} testID="button-close-picker">
              <Ionicons name="close" size={24} color={colors.foreground} />
            </TouchableOpacity>
          </View>
          {menuItems.isLoading ? (
            <ActivityIndicator style={{ marginTop: 32 }} color={colors.primary} />
          ) : (
            <FlatList
              data={menuItems.data?.filter((m) => m.isAvailable !== false)}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={styles.pickerList}
              renderItem={({ item }) => {
                const qty = getQty(item.id);
                return (
                  <View style={[styles.pickerRow, { borderBottomColor: colors.border, flexDirection: isRtl ? "row-reverse" : "row" }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.pickerName, { color: colors.foreground }]}>{item.name}</Text>
                      <Text style={[styles.pickerPrice, { color: colors.success }]}>PKR {Number(item.price).toLocaleString()}</Text>
                    </View>
                    <View style={[styles.qtyRow, { flexDirection: isRtl ? "row-reverse" : "row" }]}>
                      {qty > 0 ? (
                        <>
                          <TouchableOpacity style={[styles.qtyBtn, { backgroundColor: colors.muted }]} onPress={() => removeItem(item.id)}>
                            <Ionicons name="remove" size={14} color={colors.foreground} />
                          </TouchableOpacity>
                          <Text style={[styles.qtyText, { color: colors.foreground }]}>{qty}</Text>
                        </>
                      ) : null}
                      <TouchableOpacity style={[styles.qtyBtn, { backgroundColor: colors.primary }]} onPress={() => addItem(item)}>
                        <Ionicons name="add" size={14} color={colors.primaryForeground} />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              }}
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, gap: 14 },
  sectionRow: { alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  sectionLabel: { fontSize: 15, fontWeight: "600" },
  addItemBtn: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  addItemBtnText: { fontSize: 13, fontWeight: "600" },
  cartCard: { borderRadius: 12, borderWidth: 1, overflow: "hidden" },
  cartRow: { alignItems: "center", paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  cartItemName: { fontSize: 13, fontWeight: "500" },
  qtyRow: { alignItems: "center", gap: 6 },
  qtyBtn: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  qtyText: { fontSize: 14, fontWeight: "600", minWidth: 20, textAlign: "center" },
  cartItemPrice: { fontSize: 13, fontWeight: "600", minWidth: 70, textAlign: "right" },
  totalRow: { borderTopWidth: 1, paddingHorizontal: 12, paddingVertical: 10, alignItems: "center", justifyContent: "space-between" },
  totalLabel: { fontSize: 13, fontWeight: "500" },
  totalValue: { fontSize: 15, fontWeight: "700" },
  emptyCart: { borderRadius: 12, borderWidth: 1, padding: 18, alignItems: "center" },
  emptyCartText: { fontSize: 13 },
  saveBtn: { borderRadius: 12, height: 52, alignItems: "center", justifyContent: "center", marginTop: 8 },
  saveBtnText: { fontSize: 16, fontWeight: "600" },
  modalRoot: { flex: 1 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: "700" },
  pickerList: { paddingHorizontal: 16 },
  pickerRow: { paddingVertical: 12, borderBottomWidth: 1, alignItems: "center", gap: 12 },
  pickerName: { fontSize: 14, fontWeight: "600" },
  pickerPrice: { fontSize: 13 },
});
