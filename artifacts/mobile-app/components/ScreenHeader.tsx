import React from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/context/I18nContext";

type ScreenHeaderProps = {
  title: string;
  showBack?: boolean;
  right?: React.ReactNode;
};

export function ScreenHeader({ title, showBack, right }: ScreenHeaderProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isRtl } = useI18n();

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: Platform.OS === "web" ? 67 : insets.top,
          backgroundColor: colors.background,
          borderBottomColor: colors.border,
          flexDirection: isRtl ? "row-reverse" : "row",
        },
      ]}
    >
      <View style={styles.left}>
        {showBack && (
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.backBtn, { marginRight: isRtl ? 0 : 4, marginLeft: isRtl ? 4 : 0 }]}
          >
            <Ionicons
              name={isRtl ? "arrow-forward" : "arrow-back"}
              size={22}
              color={colors.foreground}
            />
          </TouchableOpacity>
        )}
        <Text
          style={[styles.title, { color: colors.foreground }]}
          numberOfLines={1}
          textBreakStrategy="highQuality"
        >
          {title}
        </Text>
      </View>
      {right && <View style={styles.right}>{right}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  left: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 14,
  },
  backBtn: { padding: 2 },
  title: { fontSize: 22, fontWeight: "700" },
  right: { paddingTop: 14, alignItems: "center", justifyContent: "center" },
});
