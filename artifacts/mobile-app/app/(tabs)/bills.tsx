import React from "react";
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
import { useListBills } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/context/I18nContext";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";

export default function BillsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t, isRtl } = useI18n();

  const bills = useListBills();

  const renderBill = ({ item }: { item: NonNullable<typeof bills.data>[number] }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => router.push({ pathname: "/bill/[id]", params: { id: item.id } })}
      testID={`card-bill-${item.id}`}
    >
      <View style={[{ flex: 1, alignItems: isRtl ? "flex-end" : "flex-start" }]}>
        <Text style={[styles.cardTitle, { color: colors.foreground }]}>
          {t.billing.billFor} #{item.orderId}
        </Text>
        <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>
          {new Date(item.createdAt).toLocaleDateString()} · {item.paymentMethod}
        </Text>
      </View>
      <View style={{ alignItems: isRtl ? "flex-start" : "flex-end" }}>
        <Text style={[styles.cardAmount, { color: colors.primary }]}>
          PKR {Number(item.totalAmount).toLocaleString()}
        </Text>
        <Ionicons name={isRtl ? "chevron-back" : "chevron-forward"} size={16} color={colors.mutedForeground} />
      </View>
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
        <Text style={[styles.title, { color: colors.foreground }]}>{t.bills}</Text>
      </View>

      {bills.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={bills.data}
          keyExtractor={(b) => String(b.id)}
          renderItem={renderBill}
          contentContainerStyle={[styles.list, { paddingBottom: Platform.OS === "web" ? 50 : 16 }]}
          refreshControl={
            <RefreshControl refreshing={!!bills.isFetching} onRefresh={() => bills.refetch()} tintColor={colors.primary} />
          }
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="receipt-outline" size={48} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{t.noData}</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: { borderBottomWidth: 1, paddingHorizontal: 16, paddingBottom: 12 },
  title: { fontSize: 26, fontWeight: "700", paddingTop: 16 },
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
  cardTitle: { fontSize: 15, fontWeight: "600", marginBottom: 2 },
  cardSub: { fontSize: 12 },
  cardAmount: { fontSize: 16, fontWeight: "700", marginBottom: 4 },
});
