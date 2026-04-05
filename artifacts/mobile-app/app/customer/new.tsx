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
import { useCreateCustomer, getListCustomersQueryKey } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/context/I18nContext";
import { ScreenHeader } from "@/components/ScreenHeader";
import { FormField } from "@/components/FormField";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";

export default function NewCustomerScreen() {
  const colors = useColors();
  const { t } = useI18n();
  const qc = useQueryClient();
  const createCustomer = useCreateCustomer();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = t.validation.required;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    createCustomer.mutate(
      { data: { name: name.trim(), phone: phone.trim() || undefined, address: address.trim() || undefined } },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          qc.invalidateQueries({ queryKey: getListCustomersQueryKey() });
          router.back();
        },
      }
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScreenHeader title={t.customer.addCustomer} showBack />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: Platform.OS === "web" ? 50 : 24 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <FormField
          label={t.customer.name}
          value={name}
          onChangeText={setName}
          placeholder={t.customer.name}
          error={errors.name}
          autoCapitalize="words"
        />
        <FormField
          label={t.customer.phone}
          value={phone}
          onChangeText={setPhone}
          placeholder={t.customer.phone}
          keyboardType="phone-pad"
        />
        <FormField
          label={t.customer.address}
          value={address}
          onChangeText={setAddress}
          placeholder={t.customer.address}
          multiline
          style={{ height: 80, paddingTop: 12, textAlignVertical: "top" }}
        />
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: createCustomer.isPending ? 0.7 : 1 }]}
          onPress={handleSave}
          disabled={createCustomer.isPending}
        >
          {createCustomer.isPending ? (
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
