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
import { useCreateIngredient, getListIngredientsQueryKey } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/context/I18nContext";
import { ScreenHeader } from "@/components/ScreenHeader";
import { FormField } from "@/components/FormField";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";

export default function NewIngredientScreen() {
  const colors = useColors();
  const { t } = useI18n();
  const qc = useQueryClient();
  const createIngredient = useCreateIngredient();

  const [name, setName] = useState("");
  const [nameUr, setNameUr] = useState("");
  const [unit, setUnit] = useState("");
  const [stock, setStock] = useState("");
  const [threshold, setThreshold] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = t.validation.required;
    if (!unit.trim()) e.unit = t.validation.required;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    createIngredient.mutate(
      {
        data: {
          name: name.trim(),
          nameUr: nameUr.trim() || undefined,
          unit: unit.trim(),
          stockQuantity: stock || undefined,
          lowStockThreshold: threshold || undefined,
        },
      },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          qc.invalidateQueries({ queryKey: getListIngredientsQueryKey() });
          router.back();
        },
      }
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScreenHeader title={t.inventory.addIngredient} showBack />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: Platform.OS === "web" ? 50 : 24 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <FormField label={t.menu.name} value={name} onChangeText={setName} placeholder={t.menu.name} error={errors.name} autoCapitalize="words" />
        <FormField label={t.menu.nameUr} value={nameUr} onChangeText={setNameUr} placeholder={t.menu.nameUr} />
        <FormField label={t.inventory.unit} value={unit} onChangeText={setUnit} placeholder="kg, g, L, pcs..." error={errors.unit} />
        <FormField label={t.inventory.stockLevel} value={stock} onChangeText={setStock} placeholder="0" keyboardType="decimal-pad" />
        <FormField label={t.inventory.lowStockThreshold} value={threshold} onChangeText={setThreshold} placeholder="0" keyboardType="decimal-pad" />
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: createIngredient.isPending ? 0.7 : 1 }]}
          onPress={handleSave}
          disabled={createIngredient.isPending}
        >
          {createIngredient.isPending ? (
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
