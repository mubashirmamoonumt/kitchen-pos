import React from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useGetMe } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/context/I18nContext";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useColorScheme } from "react-native";

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();
  const me = useGetMe();
  const colorScheme = useColorScheme();
  const { t, lang, setLang } = useI18n();

  const handleLogout = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    logout();
  };

  const handleLangToggle = async (l: "en" | "ur") => {
    Haptics.selectionAsync();
    await setLang(l);
  };

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: Platform.OS === "web" ? 67 + 16 : insets.top + 16,
          paddingBottom: Platform.OS === "web" ? 34 + 16 : insets.bottom + 16,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.title, { color: colors.foreground }]}>{t.profile.title}</Text>

      <View style={[styles.userCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.avatar, { backgroundColor: colors.primary + "20" }]}>
          <Ionicons name="person" size={32} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.userName, { color: colors.foreground }]}>
            {me.data?.name ?? t.loading}
          </Text>
          <Text style={[styles.userEmail, { color: colors.mutedForeground }]}>
            {me.data?.email ?? ""}
          </Text>
          <View style={[styles.roleBadge, { backgroundColor: me.data?.role === "owner" ? colors.primary + "20" : colors.muted }]}>
            <Text style={[styles.roleBadgeText, { color: me.data?.role === "owner" ? colors.primary : colors.mutedForeground }]}>
              {me.data?.role === "owner" ? t.settings.role.owner.toUpperCase() : me.data?.role === "staff" ? t.settings.role.staff.toUpperCase() : ""}
            </Text>
          </View>
        </View>
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{t.profile.language.toUpperCase()}</Text>
        <View style={[styles.langRow, { borderBottomWidth: 0 }]}>
          <TouchableOpacity
            style={[
              styles.langBtn,
              { backgroundColor: lang === "en" ? colors.primary : colors.muted, borderColor: lang === "en" ? colors.primary : colors.border },
            ]}
            onPress={() => handleLangToggle("en")}
            testID="lang-btn-en"
          >
            <Text style={[styles.langBtnText, { color: lang === "en" ? colors.primaryForeground : colors.mutedForeground }]}>
              {t.settings.english}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.langBtn,
              { backgroundColor: lang === "ur" ? colors.primary : colors.muted, borderColor: lang === "ur" ? colors.primary : colors.border },
            ]}
            onPress={() => handleLangToggle("ur")}
            testID="lang-btn-ur"
          >
            <Text style={[styles.langBtnText, { color: lang === "ur" ? colors.primaryForeground : colors.mutedForeground }]}>
              {t.settings.urdu}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{t.profile.application.toUpperCase()}</Text>

        <View style={styles.infoRow}>
          <View style={styles.infoLabel}>
            <Ionicons name="information-circle-outline" size={18} color={colors.mutedForeground} />
            <Text style={[styles.infoLabelText, { color: colors.foreground }]}>{t.profile.version}</Text>
          </View>
          <Text style={[styles.infoValue, { color: colors.mutedForeground }]}>1.0.0</Text>
        </View>

        <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
          <View style={styles.infoLabel}>
            <Ionicons name="restaurant-outline" size={18} color={colors.mutedForeground} />
            <Text style={[styles.infoLabelText, { color: colors.foreground }]}>{t.profile.kitchen}</Text>
          </View>
          <Text style={[styles.infoValue, { color: colors.mutedForeground }]}>MUFAZ Kitchen</Text>
        </View>
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{t.profile.display.toUpperCase()}</Text>

        <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
          <View style={styles.infoLabel}>
            <Ionicons name={colorScheme === "dark" ? "moon-outline" : "sunny-outline"} size={18} color={colors.mutedForeground} />
            <Text style={[styles.infoLabelText, { color: colors.foreground }]}>{t.profile.theme}</Text>
          </View>
          <Text style={[styles.infoValue, { color: colors.mutedForeground }]}>
            {colorScheme === "dark" ? t.profile.themeDark : t.profile.themeLight}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.logoutBtn, { backgroundColor: colors.destructive + "12", borderColor: colors.destructive + "40" }]}
        onPress={handleLogout}
        testID="button-logout"
      >
        <Ionicons name="log-out-outline" size={20} color={colors.destructive} />
        <Text style={[styles.logoutBtnText, { color: colors.destructive }]}>{t.profile.signOut}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 16 },
  title: { fontSize: 26, fontWeight: "700", marginBottom: 4 },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  avatar: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  userName: { fontSize: 18, fontWeight: "700", marginBottom: 2 },
  userEmail: { fontSize: 13, marginBottom: 6 },
  roleBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: "flex-start" },
  roleBadgeText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
  section: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  sectionTitle: { fontSize: 11, fontWeight: "600", letterSpacing: 0.5, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  langRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  langBtn: { flex: 1, borderRadius: 10, borderWidth: 1, paddingVertical: 10, alignItems: "center" },
  langBtnText: { fontSize: 14, fontWeight: "600" },
  infoRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "rgba(0,0,0,0.06)" },
  infoLabel: { flexDirection: "row", alignItems: "center", gap: 10 },
  infoLabelText: { fontSize: 15 },
  infoValue: { fontSize: 14 },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
  },
  logoutBtnText: { fontSize: 16, fontWeight: "600" },
});
