import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/context/I18nContext";

type EmptyStateProps = {
  icon: string;
  message: string;
  onRetry?: () => void;
};

export function EmptyState({ icon, message, onRetry }: EmptyStateProps) {
  const colors = useColors();
  const { t } = useI18n();

  return (
    <View style={styles.container}>
      <Ionicons name={icon as never} size={48} color={colors.mutedForeground} />
      <Text style={[styles.text, { color: colors.mutedForeground }]}>{message}</Text>
      {onRetry && (
        <TouchableOpacity
          style={[styles.retryBtn, { backgroundColor: colors.muted }]}
          onPress={onRetry}
        >
          <Text style={[styles.retryText, { color: colors.foreground }]}>{t.retry}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 32 },
  text: { fontSize: 15, textAlign: "center" },
  retryBtn: { borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8, marginTop: 4 },
  retryText: { fontSize: 14, fontWeight: "500" },
});
