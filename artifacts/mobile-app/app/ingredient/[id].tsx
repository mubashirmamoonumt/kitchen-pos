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
  useGetIngredient,
  useAdjustIngredientStock,
  useDeleteIngredient,
  getListIngredientsQueryKey,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/context/I18nContext";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";

export default function IngredientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const { t, isRtl } = useI18n();
  const qc = useQueryClient();

  const ingredient = useGetIngredient(Number(id));
  const adjustStock = useAdjustIngredientStock();
  const deleteIngredient = useDeleteIngredient();

  const [adjustment, setAdjustment] = useState("");
  const [reason, setReason] = useState("");
  const [showAdjust, setShowAdjust] = useState(false);

  const handleAdjust = () => {
    if (!adjustment) return;
    adjustStock.mutate(
      { id: Number(id), data: { adjustment, reason: reason || undefined } },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          qc.invalidateQueries({ queryKey: getListIngredientsQueryKey() });
          setAdjustment("");
          setReason("");
          setShowAdjust(false);
          ingredient.refetch();
        },
      }
    );
  };

  const handleDelete = () => {
    Alert.alert(t.delete, `${t.delete} ${ingredient.data?.name}?`, [
      { text: t.cancel, style: "cancel" },
      {
        text: t.delete,
        style: "destructive",
        onPress: () => {
          deleteIngredient.mutate(
            { id: Number(id) },
            {
              onSuccess: () => {
                qc.invalidateQueries({ queryKey: getListIngredientsQueryKey() });
                router.back();
              },
            }
          );
        },
      },
    ]);
  };

  if (ingredient.isLoading) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <ScreenHeader title={t.inventory.ingredients} showBack />
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </View>
    );
  }

  const data = ingredient.data;
  if (!data) return null;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title={data.name}
        showBack
        right={
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: colors.muted }]}
              onPress={() => router.push({ pathname: "/ingredient/edit/[id]", params: { id } })}
            >
              <Ionicons name="create-outline" size={18} color={colors.foreground} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: colors.destructive + "15" }]}
              onPress={handleDelete}
            >
              <Ionicons name="trash-outline" size={18} color={colors.destructive} />
            </TouchableOpacity>
          </View>
        }
      />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: Platform.OS === "web" ? 50 : 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.stockCard,
            {
              backgroundColor: data.isLowStock ? colors.destructive + "10" : colors.card,
              borderColor: data.isLowStock ? colors.destructive : colors.border,
            },
          ]}
        >
          <Text style={[styles.stockLabel, { color: colors.mutedForeground }]}>{t.inventory.stockLevel}</Text>
          <Text style={[styles.stockValue, { color: data.isLowStock ? colors.destructive : colors.foreground }]}>
            {data.stockQuantity} {data.unit}
          </Text>
          <Text style={[styles.thresholdText, { color: colors.mutedForeground }]}>
            {t.inventory.lowStockThreshold}: {data.lowStockThreshold} {data.unit}
          </Text>
          {data.isLowStock ? (
            <View style={[styles.lowStockBadge, { backgroundColor: colors.destructive + "20" }]}>
              <Ionicons name="warning-outline" size={14} color={colors.destructive} />
              <Text style={[styles.lowStockText, { color: colors.destructive }]}>{t.lowStock}</Text>
            </View>
          ) : null}
        </View>

        <TouchableOpacity
          style={[styles.adjustToggle, { backgroundColor: colors.primary }]}
          onPress={() => setShowAdjust(!showAdjust)}
        >
          <Ionicons name="swap-vertical-outline" size={18} color={colors.primaryForeground} />
          <Text style={[styles.adjustToggleText, { color: colors.primaryForeground }]}>
            {t.inventory.adjustStock}
          </Text>
        </TouchableOpacity>

        {showAdjust && (
          <View style={[styles.adjustCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.adjustLabel, { color: colors.foreground }]}>
              {t.inventory.adjustment} (+ or -)
            </Text>
            <TextInput
              style={[
                styles.adjustInput,
                { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground },
              ]}
              value={adjustment}
              onChangeText={setAdjustment}
              placeholder="e.g. 10 or -5"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="decimal-pad"
            />
            <TextInput
              style={[
                styles.adjustInput,
                { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground },
              ]}
              value={reason}
              onChangeText={setReason}
              placeholder={t.inventory.reason}
              placeholderTextColor={colors.mutedForeground}
            />
            <TouchableOpacity
              style={[styles.adjustConfirm, { backgroundColor: colors.primary, opacity: adjustStock.isPending ? 0.7 : 1 }]}
              onPress={handleAdjust}
              disabled={adjustStock.isPending}
            >
              {adjustStock.isPending ? (
                <ActivityIndicator color={colors.primaryForeground} size="small" />
              ) : (
                <Text style={[styles.adjustConfirmText, { color: colors.primaryForeground }]}>{t.confirm}</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 16, gap: 12 },
  stockCard: { borderRadius: 14, borderWidth: 1, padding: 20, gap: 8 },
  stockLabel: { fontSize: 12, fontWeight: "600", textTransform: "uppercase" },
  stockValue: { fontSize: 32, fontWeight: "700" },
  thresholdText: { fontSize: 12 },
  lowStockBadge: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, alignSelf: "flex-start" },
  lowStockText: { fontSize: 13, fontWeight: "600" },
  adjustToggle: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 12, paddingVertical: 14 },
  adjustToggleText: { fontSize: 15, fontWeight: "600" },
  adjustCard: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 10 },
  adjustLabel: { fontSize: 14, fontWeight: "600" },
  adjustInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, height: 48, fontSize: 15 },
  adjustConfirm: { borderRadius: 10, height: 48, alignItems: "center", justifyContent: "center", marginTop: 4 },
  adjustConfirmText: { fontSize: 15, fontWeight: "600" },
  iconBtn: { borderRadius: 8, padding: 8 },
});
