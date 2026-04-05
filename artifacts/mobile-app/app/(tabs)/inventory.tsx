import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  useListIngredients,
  useListRecipes,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/context/I18nContext";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";

type TabType = "ingredients" | "recipes";

export default function InventoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t, isRtl } = useI18n();
  const [activeTab, setActiveTab] = useState<TabType>("ingredients");

  const ingredients = useListIngredients();
  const recipes = useListRecipes();

  const renderIngredient = ({ item }: { item: NonNullable<typeof ingredients.data>[number] }) => (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: item.isLowStock ? colors.destructive : colors.border,
          borderWidth: item.isLowStock ? 2 : 1,
        },
      ]}
      onPress={() => router.push({ pathname: "/ingredient/[id]", params: { id: item.id } })}
      testID={`card-ingredient-${item.id}`}
    >
      <View style={[{ flex: 1, alignItems: isRtl ? "flex-end" : "flex-start" }]}>
        <Text style={[styles.cardName, { color: colors.foreground, textAlign: isRtl ? "right" : "left" }]}>
          {item.name}
        </Text>
        {item.nameUr ? (
          <Text style={[styles.cardNameUr, { color: colors.mutedForeground }]}>{item.nameUr}</Text>
        ) : null}
        <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>{item.unit}</Text>
      </View>
      <View style={{ alignItems: isRtl ? "flex-start" : "flex-end", gap: 4 }}>
        <Text style={[styles.stockValue, { color: item.isLowStock ? colors.destructive : colors.foreground }]}>
          {item.stockQuantity} {item.unit}
        </Text>
        {item.isLowStock ? (
          <View style={[styles.lowStockBadge, { backgroundColor: colors.destructive + "18" }]}>
            <Text style={[styles.lowStockText, { color: colors.destructive }]}>
              {t.lowStock}
            </Text>
          </View>
        ) : null}
        <Text style={[styles.thresholdText, { color: colors.mutedForeground }]}>
          min: {item.lowStockThreshold} {item.unit}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderRecipe = ({ item }: { item: NonNullable<typeof recipes.data>[number] }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => router.push({ pathname: "/recipe/[menuItemId]", params: { menuItemId: item.menuItemId } })}
      testID={`card-recipe-${item.id}`}
    >
      <View style={{ flex: 1 }}>
        <Text style={[styles.cardName, { color: colors.foreground, textAlign: isRtl ? "right" : "left" }]}>
          {item.menuItemName}
        </Text>
        <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>
          {item.ingredients?.length ?? 0} {t.inventory.ingredients}
        </Text>
      </View>
      <Ionicons name={isRtl ? "chevron-back" : "chevron-forward"} size={18} color={colors.mutedForeground} />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.topBar,
          {
            paddingTop: Platform.OS === "web" ? 67 : insets.top,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={[styles.titleRow, { flexDirection: isRtl ? "row-reverse" : "row" }]}>
          <Text style={[styles.title, { color: colors.foreground }]}>{t.tabs.inventory}</Text>
          {activeTab === "ingredients" && (
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.push("/ingredient/new")}
              testID="button-add-ingredient"
            >
              <Ionicons name="add" size={18} color={colors.primaryForeground} />
              <Text style={[styles.addBtnText, { color: colors.primaryForeground }]}>{t.add}</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={[styles.tabRow, { flexDirection: isRtl ? "row-reverse" : "row" }]}>
          {(["ingredients", "recipes"] as TabType[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tab,
                {
                  borderBottomColor: activeTab === tab ? colors.primary : "transparent",
                  borderBottomWidth: 2,
                },
              ]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, { color: activeTab === tab ? colors.primary : colors.mutedForeground }]}>
                {tab === "ingredients" ? t.inventory.ingredients : t.inventory.recipes}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {activeTab === "ingredients" ? (
        ingredients.isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : (
          <FlatList
            data={ingredients.data}
            keyExtractor={(i) => String(i.id)}
            renderItem={renderIngredient}
            contentContainerStyle={[styles.list, { paddingBottom: Platform.OS === "web" ? 50 : 16 }]}
            refreshControl={
              <RefreshControl refreshing={!!ingredients.isFetching} onRefresh={() => ingredients.refetch()} tintColor={colors.primary} />
            }
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.center}>
                <Ionicons name="cube-outline" size={48} color={colors.mutedForeground} />
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{t.noData}</Text>
              </View>
            }
          />
        )
      ) : (
        recipes.isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : (
          <FlatList
            data={recipes.data}
            keyExtractor={(r) => String(r.id)}
            renderItem={renderRecipe}
            contentContainerStyle={[styles.list, { paddingBottom: Platform.OS === "web" ? 50 : 16 }]}
            refreshControl={
              <RefreshControl refreshing={!!recipes.isFetching} onRefresh={() => recipes.refetch()} tintColor={colors.primary} />
            }
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.center}>
                <Ionicons name="book-outline" size={48} color={colors.mutedForeground} />
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{t.noData}</Text>
              </View>
            }
          />
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: { borderBottomWidth: 1, paddingHorizontal: 16, paddingBottom: 0 },
  titleRow: { alignItems: "center", justifyContent: "space-between", paddingTop: 16, marginBottom: 12 },
  title: { fontSize: 26, fontWeight: "700" },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  addBtnText: { fontSize: 14, fontWeight: "600" },
  tabRow: { flexDirection: "row", gap: 24 },
  tab: { paddingBottom: 10, paddingHorizontal: 4 },
  tabText: { fontSize: 14, fontWeight: "600" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 32 },
  emptyText: { fontSize: 15 },
  list: { paddingHorizontal: 16, paddingTop: 12, gap: 8 },
  card: {
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  cardName: { fontSize: 15, fontWeight: "600", marginBottom: 2 },
  cardNameUr: { fontSize: 13, marginBottom: 2 },
  cardSub: { fontSize: 12 },
  stockValue: { fontSize: 16, fontWeight: "700" },
  lowStockBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  lowStockText: { fontSize: 11, fontWeight: "600" },
  thresholdText: { fontSize: 11 },
});
