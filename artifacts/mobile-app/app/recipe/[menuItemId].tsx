import React from "react";
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useGetRecipeByMenuItem } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/context/I18nContext";
import { ScreenHeader } from "@/components/ScreenHeader";

export default function RecipeDetailScreen() {
  const { menuItemId } = useLocalSearchParams<{ menuItemId: string }>();
  const colors = useColors();
  const { t, isRtl } = useI18n();

  const recipe = useGetRecipeByMenuItem(Number(menuItemId));

  if (recipe.isLoading) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <ScreenHeader title={t.inventory.recipe} showBack />
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </View>
    );
  }

  const data = recipe.data;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScreenHeader title={data?.menuItemName ?? t.inventory.recipe} showBack />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: Platform.OS === "web" ? 50 : 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {!data || data.ingredients.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{t.noData}</Text>
        ) : (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
              {t.inventory.ingredients.toUpperCase()}
            </Text>
            {data.ingredients.map((ing, idx) => (
              <View
                key={ing.id}
                style={[
                  styles.row,
                  {
                    borderBottomColor: colors.border,
                    borderBottomWidth: idx < data.ingredients.length - 1 ? 1 : 0,
                    flexDirection: isRtl ? "row-reverse" : "row",
                  },
                ]}
              >
                <Text style={[styles.ingName, { color: colors.foreground, textAlign: isRtl ? "right" : "left" }]}>
                  {ing.ingredientName}
                </Text>
                <Text style={[styles.ingQty, { color: colors.primary }]}>
                  {ing.quantity} {ing.unit}
                </Text>
              </View>
            ))}
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
  emptyText: { textAlign: "center", fontSize: 15, paddingVertical: 20 },
  card: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  sectionTitle: { fontSize: 11, fontWeight: "600", letterSpacing: 0.5, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  ingName: { fontSize: 15, fontWeight: "500", flex: 1 },
  ingQty: { fontSize: 15, fontWeight: "600" },
});
