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
import { useListMenuItems, useListCategories, useToggleMenuItemAvailability, getListMenuItemsQueryKey } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/context/I18nContext";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";

export default function MenuScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t, isRtl } = useI18n();
  const qc = useQueryClient();

  const [categoryId, setCategoryId] = useState<number | null>(null);

  const categories = useListCategories();
  const menuItems = useListMenuItems(categoryId ? { categoryId } : undefined);
  const toggle = useToggleMenuItemAvailability();

  const handleToggle = (id: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggle.mutate(
      { id },
      { onSuccess: () => qc.invalidateQueries({ queryKey: getListMenuItemsQueryKey() }) }
    );
  };

  const renderItem = ({ item }: { item: NonNullable<typeof menuItems.data>[number] }) => (
    <View
      style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: isRtl ? "row-reverse" : "row" }]}
      testID={`card-menu-item-${item.id}`}
    >
      <View style={[styles.menuCardLeft, { alignItems: isRtl ? "flex-end" : "flex-start" }]}>
        <Text style={[styles.menuName, { color: colors.foreground, textAlign: isRtl ? "right" : "left" }]}>{item.name}</Text>
        {item.nameUr ? (
          <Text style={[styles.menuNameUr, { color: colors.mutedForeground }]}>{item.nameUr}</Text>
        ) : null}
        <Text style={[styles.menuPrice, { color: colors.primary }]}>PKR {Number(item.price).toLocaleString()}</Text>
      </View>
      <View style={{ gap: 6, alignItems: "flex-end" }}>
        <TouchableOpacity
          style={[
            styles.toggleBtn,
            {
              backgroundColor: item.isAvailable ? colors.success + "18" : colors.muted,
              borderColor: item.isAvailable ? colors.success : colors.border,
            },
          ]}
          onPress={() => handleToggle(item.id)}
          testID={`button-toggle-${item.id}`}
        >
          <Ionicons
            name={item.isAvailable ? "checkmark-circle" : "close-circle"}
            size={20}
            color={item.isAvailable ? colors.success : colors.mutedForeground}
          />
          <Text style={[styles.toggleText, { color: item.isAvailable ? colors.success : colors.mutedForeground }]}>
            {item.isAvailable ? t.menu.available : t.menu.unavailable}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.push({ pathname: "/menu-item/edit/[id]", params: { id: item.id } })}
          style={[styles.editBtn, { backgroundColor: colors.muted }]}
          testID={`button-edit-menu-${item.id}`}
        >
          <Ionicons name="create-outline" size={14} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>
    </View>
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
          <Text style={[styles.title, { color: colors.foreground }]}>{t.menu}</Text>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/menu-item/new")}
            testID="button-add-menu-item"
          >
            <Ionicons name="add" size={18} color={colors.primaryForeground} />
            <Text style={[styles.addBtnText, { color: colors.primaryForeground }]}>{t.add}</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          horizontal
          data={[{ id: null as number | null, name: "All" }, ...(categories.data?.map((c) => ({ id: c.id as number | null, name: c.name })) ?? [])]}
          keyExtractor={(c) => String(c.id)}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
          renderItem={({ item: cat }) => (
            <TouchableOpacity
              style={[
                styles.filterChip,
                {
                  backgroundColor: categoryId === cat.id ? colors.primary : colors.card,
                  borderColor: categoryId === cat.id ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setCategoryId(cat.id)}
            >
              <Text style={[styles.filterChipText, { color: categoryId === cat.id ? colors.primaryForeground : colors.mutedForeground }]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {menuItems.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : menuItems.data?.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="restaurant-outline" size={48} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{t.noData}</Text>
        </View>
      ) : (
        <FlatList
          data={menuItems.data}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: Platform.OS === "web" ? 34 + 16 : 16 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={!!menuItems.isFetching}
              onRefresh={() => menuItems.refetch()}
              tintColor={colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: { borderBottomWidth: 1, paddingHorizontal: 16, paddingBottom: 0 },
  titleRow: { alignItems: "center", justifyContent: "space-between", marginTop: 16, marginBottom: 10 },
  title: { fontSize: 26, fontWeight: "700" },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  addBtnText: { fontSize: 14, fontWeight: "600" },
  filterRow: { gap: 8, paddingBottom: 12 },
  filterChip: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 6 },
  filterChipText: { fontSize: 13, fontWeight: "500" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyText: { fontSize: 15 },
  list: { paddingHorizontal: 16, paddingTop: 12, gap: 10 },
  menuCard: { borderRadius: 14, borderWidth: 1, padding: 14, flexDirection: "row", alignItems: "center", gap: 12 },
  menuCardLeft: { flex: 1, gap: 2 },
  menuName: { fontSize: 15, fontWeight: "600" },
  menuNameUr: { fontSize: 13 },
  menuPrice: { fontSize: 15, fontWeight: "700", marginTop: 4 },
  toggleBtn: { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  toggleText: { fontSize: 12, fontWeight: "500" },
  editBtn: { borderRadius: 6, padding: 6 },
});
