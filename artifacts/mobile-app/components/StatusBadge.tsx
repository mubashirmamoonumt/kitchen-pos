import React from "react";
import { StyleSheet, Text, View } from "react-native";

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: "#fef3c7", text: "#92400e", label: "Pending" },
  confirmed: { bg: "#dbeafe", text: "#1e40af", label: "Confirmed" },
  preparing: { bg: "#fde68a", text: "#78350f", label: "Preparing" },
  ready: { bg: "#d1fae5", text: "#065f46", label: "Ready" },
  delivered: { bg: "#dcfce7", text: "#15803d", label: "Delivered" },
  cancelled: { bg: "#fee2e2", text: "#991b1b", label: "Cancelled" },
  completed: { bg: "#dcfce7", text: "#15803d", label: "Completed" },
};

type StatusBadgeProps = {
  status: string;
  size?: "sm" | "md";
};

export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? { bg: "#f3f4f6", text: "#374151", label: status };
  return (
    <View style={[styles.badge, { backgroundColor: config.bg }, size === "sm" && styles.sm]}>
      <Text style={[styles.text, { color: config.text }, size === "sm" && styles.smText]}>
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
  sm: {
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  text: {
    fontSize: 13,
    fontWeight: "600",
  },
  smText: {
    fontSize: 11,
  },
});
