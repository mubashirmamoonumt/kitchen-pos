import React, { useEffect, useState } from "react";
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
import { useGetIngredient, useUpdateIngredient, getListIngredientsQueryKey } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/context/I18nContext";
import { ScreenHeader } from "@/components/ScreenHeader";
import { FormField } from "@/components/FormField";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";

export default function EditIngredientScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const { t } = useI18n();
  const qc = useQueryClient();

  const ingredient = useGetIngredient(Number(id));
  const updateIngredient = useUpdateIngredient();

  const [name, setName] = useState("");
  const [nameUr, setNameUr] = useState("");
  const [unit, setUnit] = useState("");
  const [stock, setStock] = useState("");
  const [threshold, setThreshold] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (ingredient.data) {
      setName(ingredient.data.name);
      setNameUr(ingredient.data.nameUr ?? "");
      setUnit(ingredient.data.unit);
      setStock(ingredient.data.stockQuantity);
      setThreshold(ingredient.data.lowStockThreshold);
    }
  }, [ingredient.data]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = t.validation.required;
    if (!unit.trim()) e.unit = t.validation.required;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    updateIngredient.mutate(
      {
        id: Number(id),
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

  if (ingredient.isLoading) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <ScreenHeader title={t.inventory.editIngredient} showBack />
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScreenHeader title={t.inventory.editIngredient} showBack />
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
          style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: updateIngredient.isPending ? 0.7 : 1 }]}
          onPress={handleSave}
          disabled={updateIngredient.isPending}
        >
          {updateIngredient.isPending ? (
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
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 16, gap: 14 },
  saveBtn: { borderRadius: 12, height: 52, alignItems: "center", justifyContent: "center", marginTop: 8 },
  saveBtnText: { fontSize: 16, fontWeight: "600" },
});
