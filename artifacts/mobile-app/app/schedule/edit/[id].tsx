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
import { useLocalSearchParams, router } from "expo-router";
import { useGetScheduledOrder, useUpdateScheduledOrder, getListScheduledOrdersQueryKey } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/context/I18nContext";
import { ScreenHeader } from "@/components/ScreenHeader";
import { FormField } from "@/components/FormField";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";

export default function EditScheduleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const numId = Number(id);
  const colors = useColors();
  const { t } = useI18n();
  const qc = useQueryClient();

  const scheduled = useGetScheduledOrder(numId);
  const updateScheduled = useUpdateScheduledOrder();

  const [customerName, setCustomerName] = useState<string | undefined>(undefined);
  const [phone, setPhone] = useState<string | undefined>(undefined);
  const [date, setDate] = useState<string | undefined>(undefined);
  const [time, setTime] = useState<string | undefined>(undefined);
  const [notes, setNotes] = useState<string | undefined>(undefined);
  const [initialized, setInitialized] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  React.useEffect(() => {
    if (scheduled.data && !initialized) {
      setCustomerName(scheduled.data.customerName ?? "");
      setPhone(scheduled.data.customerPhone ?? "");
      setDate(scheduled.data.scheduledDate);
      setTime(scheduled.data.scheduledTime);
      setNotes(scheduled.data.notes ?? "");
      setInitialized(true);
    }
  }, [scheduled.data, initialized]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!date?.trim()) e.date = t.validation.required;
    if (!time?.trim()) e.time = t.validation.required;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    updateScheduled.mutate(
      {
        id: numId,
        data: {
          customerName: customerName?.trim() || undefined,
          customerPhone: phone?.trim() || undefined,
          scheduledDate: date?.trim(),
          scheduledTime: time?.trim(),
          notes: notes?.trim() || undefined,
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
        <FormField label={t.customer.name} value={customerName ?? ""} onChangeText={setCustomerName} placeholder={t.customer.name} autoCapitalize="words" />
        <FormField label={t.customer.phone} value={phone ?? ""} onChangeText={setPhone} placeholder={t.customer.phone} keyboardType="phone-pad" />
        <FormField label={t.schedule.date} value={date ?? ""} onChangeText={setDate} placeholder="YYYY-MM-DD" error={errors.date} />
        <FormField label={t.schedule.time} value={time ?? ""} onChangeText={setTime} placeholder="HH:MM" error={errors.time} />
        <FormField
          label={t.order.notes}
          value={notes ?? ""}
          onChangeText={setNotes}
          placeholder={t.order.notes}
          multiline
          style={{ height: 80, paddingTop: 12, textAlignVertical: "top" }}
        />
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, gap: 14 },
  saveBtn: { borderRadius: 12, height: 52, alignItems: "center", justifyContent: "center", marginTop: 8 },
  saveBtnText: { fontSize: 16, fontWeight: "600" },
});
