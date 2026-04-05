import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { useCreateMenuItem, useListCategories, getListMenuItemsQueryKey } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/context/I18nContext";
import { ScreenHeader } from "@/components/ScreenHeader";
import { FormField } from "@/components/FormField";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";

export default function NewMenuItemScreen() {
  const colors = useColors();
  const { t, isRtl } = useI18n();
  const qc = useQueryClient();
  const createMenuItem = useCreateMenuItem();
  const categories = useListCategories();

  const [name, setName] = useState("");
  const [nameUr, setNameUr] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [isAvailable, setIsAvailable] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = t.validation.required;
    if (!price.trim()) e.price = t.validation.required;
    if (!categoryId) e.category = t.validation.required;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    createMenuItem.mutate(
      {
        data: {
          name: name.trim(),
          nameUr: nameUr.trim() || undefined,
          description: description.trim() || undefined,
          price: price.trim(),
          categoryId: categoryId!,
          isAvailable,
        },
      },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          qc.invalidateQueries({ queryKey: getListMenuItemsQueryKey() });
          router.back();
        },
      }
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScreenHeader title={t.menu.addItem} showBack />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: Platform.OS === "web" ? 50 : 24 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <FormField label={t.menu.name} value={name} onChangeText={setName} placeholder={t.menu.name} error={errors.name} autoCapitalize="words" />
        <FormField label={t.menu.nameUr} value={nameUr} onChangeText={setNameUr} placeholder={t.menu.nameUr} />
        <FormField label={t.menu.description} value={description} onChangeText={setDescription} placeholder={t.menu.description} multiline style={{ height: 72, paddingTop: 12, textAlignVertical: "top" }} />
        <FormField label={`${t.menu.price} (PKR)`} value={price} onChangeText={setPrice} placeholder="0.00" keyboardType="decimal-pad" error={errors.price} />

        <View>
          <Text style={[styles.label, { color: colors.foreground }]}>{t.menu.category}</Text>
          {errors.category ? <Text style={[styles.fieldError, { color: colors.destructive }]}>{errors.category}</Text> : null}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 8 }}>
            {categories.data?.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[styles.catChip, { borderColor: categoryId === cat.id ? colors.primary : colors.border, backgroundColor: categoryId === cat.id ? colors.primary + "15" : "transparent" }]}
                onPress={() => setCategoryId(cat.id)}
              >
                <Text style={[styles.catChipText, { color: categoryId === cat.id ? colors.primary : colors.mutedForeground }]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={[styles.switchRow, { flexDirection: isRtl ? "row-reverse" : "row" }]}>
          <Text style={[styles.switchLabel, { color: colors.foreground }]}>{t.menu.available}</Text>
          <Switch
            value={isAvailable}
            onValueChange={setIsAvailable}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.primaryForeground}
          />
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: createMenuItem.isPending ? 0.7 : 1 }]}
          onPress={handleSave}
          disabled={createMenuItem.isPending}
        >
          {createMenuItem.isPending ? (
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
  label: { fontSize: 13, fontWeight: "600", marginBottom: 2 },
  fieldError: { fontSize: 12, marginBottom: 4 },
  catChip: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8 },
  catChipText: { fontSize: 13, fontWeight: "500" },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 4 },
  switchLabel: { fontSize: 15, fontWeight: "500" },
  saveBtn: { borderRadius: 12, height: 52, alignItems: "center", justifyContent: "center", marginTop: 8 },
  saveBtnText: { fontSize: 16, fontWeight: "600" },
});
