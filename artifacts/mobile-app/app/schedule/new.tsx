import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { useCreateScheduledOrder, useListCustomers, getListScheduledOrdersQueryKey } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/context/I18nContext";
import { ScreenHeader } from "@/components/ScreenHeader";
import { FormField } from "@/components/FormField";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";

export default function NewScheduleScreen() {
  const colors = useColors();
  const { t, isRtl } = useI18n();
  const qc = useQueryClient();
  const createScheduled = useCreateScheduledOrder();
  const customers = useListCustomers();

  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [time, setTime] = useState("12:00");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!date.trim()) e.date = t.validation.required;
    if (!time.trim()) e.time = t.validation.required;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    createScheduled.mutate(
      {
        data: {
          customerName: customerName.trim() || undefined,
          customerPhone: phone.trim() || undefined,
          scheduledDate: date.trim(),
          scheduledTime: time.trim(),
          notes: notes.trim() || undefined,
          items: [],
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
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: createScheduled.isPending ? 0.7 : 1 }]}
          onPress={handleSave}
          disabled={createScheduled.isPending}
        >
          {createScheduled.isPending ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>{t.save}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, gap: 14 },
  saveBtn: { borderRadius: 12, height: 52, alignItems: "center", justifyContent: "center", marginTop: 8 },
  saveBtnText: { fontSize: 16, fontWeight: "600" },
});
