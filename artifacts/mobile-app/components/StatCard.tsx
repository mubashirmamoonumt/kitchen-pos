import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

type StatCardProps = {
  title: string;
  value: string | number;
  sub?: string;
  color?: string;
};

export function StatCard({ title, value, sub, color }: StatCardProps) {
  const colors = useColors();
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.mutedForeground }]}>{title}</Text>
      <Text style={[styles.value, { color: color ?? colors.foreground }]}>{value}</Text>
      {sub && <Text style={[styles.sub, { color: colors.mutedForeground }]}>{sub}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 4,
  },
  value: {
    fontSize: 22,
    fontWeight: "700",
  },
  sub: {
    fontSize: 11,
    marginTop: 2,
  },
});
