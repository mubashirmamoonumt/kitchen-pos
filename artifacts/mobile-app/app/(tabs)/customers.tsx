import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useListCustomers } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/context/I18nContext";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";

export default function CustomersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t, isRtl } = useI18n();
  const [search, setSearch] = useState("");

  const customers = useListCustomers(search ? { search } : undefined);

  const renderCustomer = ({ item }: { item: NonNullable<typeof customers.data>[number] }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => router.push({ pathname: "/customer/[id]", params: { id: item.id } })}
      testID={`card-customer-${item.id}`}
    >
      <View style={[styles.avatar, { backgroundColor: colors.primary + "18" }]}>
        <Text style={[styles.avatarText, { color: colors.primary }]}>
          {item.name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={[styles.cardBody, { flex: 1, alignItems: isRtl ? "flex-end" : "flex-start" }]}>
        <Text style={[styles.cardName, { color: colors.foreground, textAlign: isRtl ? "right" : "left" }]}>
          {item.name}
        </Text>
        {item.phone ? (
          <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>{item.phone}</Text>
        ) : null}
        <Text style={[styles.cardStats, { color: colors.mutedForeground }]}>
          {item.totalOrders} {t.customer.totalOrders} · PKR {Number(item.totalSpent).toLocaleString()}
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
          <Text style={[styles.title, { color: colors.foreground }]}>{t.customers}</Text>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/customer/new")}
            testID="button-add-customer"
          >
            <Ionicons name="add" size={18} color={colors.primaryForeground} />
            <Text style={[styles.addBtnText, { color: colors.primaryForeground }]}>{t.add}</Text>
          </TouchableOpacity>
        </View>
        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: isRtl ? "row-reverse" : "row" }]}>
          <Ionicons name="search-outline" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground, textAlign: isRtl ? "right" : "left" }]}
            placeholder={t.search}
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
            testID="input-customer-search"
          />
          {search ? (
            <Pressable onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={16} color={colors.mutedForeground} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {customers.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : customers.data?.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="people-outline" size={48} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{t.noData}</Text>
        </View>
      ) : (
        <FlatList
          data={customers.data}
          keyExtractor={(c) => String(c.id)}
          renderItem={renderCustomer}
          contentContainerStyle={[styles.list, { paddingBottom: Platform.OS === "web" ? 50 : 16 }]}
          refreshControl={
            <RefreshControl
              refreshing={!!customers.isFetching}
              onRefresh={() => customers.refetch()}
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
  titleRow: { alignItems: "center", justifyContent: "space-between", paddingTop: 16, marginBottom: 10 },
  title: { fontSize: 26, fontWeight: "700" },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  addBtnText: { fontSize: 14, fontWeight: "600" },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
    marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 14, height: "100%" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyText: { fontSize: 15 },
  list: { paddingHorizontal: 16, paddingTop: 12, gap: 8 },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 18, fontWeight: "700" },
  cardBody: { gap: 2 },
  cardName: { fontSize: 15, fontWeight: "600" },
  cardSub: { fontSize: 13 },
  cardStats: { fontSize: 12, marginTop: 2 },
});
