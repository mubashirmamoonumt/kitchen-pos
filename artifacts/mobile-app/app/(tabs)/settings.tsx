import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  useGetMe,
  useListSettings,
  useUpdateSettings,
  useListUsers,
  useCreateUser,
  useDeleteUser,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/context/I18nContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { FormField } from "@/components/FormField";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t, lang, setLang, isRtl } = useI18n();
  const qc = useQueryClient();

  const me = useGetMe();
  const settings = useListSettings();
  const updateSettings = useUpdateSettings();
  const users = useListUsers();
  const createUser = useCreateUser();
  const deleteUser = useDeleteUser();

  const [capacity, setCapacity] = useState("");
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [staffName, setStaffName] = useState("");
  const [staffEmail, setStaffEmail] = useState("");
  const [staffPassword, setStaffPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isOwner = me.data?.role === "owner";

  useEffect(() => {
    if (settings.data?.daily_capacity) {
      setCapacity(String(settings.data.daily_capacity));
    }
  }, [settings.data]);

  if (!isOwner) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }]}>
        <Ionicons name="lock-closed-outline" size={48} color={colors.mutedForeground} />
        <Text style={[styles.noAccess, { color: colors.mutedForeground }]}>Owner access required</Text>
      </View>
    );
  }

  const handleSaveCapacity = () => {
    if (!capacity) return;
    updateSettings.mutate(
      { data: { daily_capacity: capacity } },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          settings.refetch();
        },
      }
    );
  };

  const validateStaff = () => {
    const e: Record<string, string> = {};
    if (!staffName.trim()) e.staffName = t.validation.required;
    if (!staffEmail.trim()) e.staffEmail = t.validation.required;
    if (!staffPassword.trim()) e.staffPassword = t.validation.required;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleAddStaff = () => {
    if (!validateStaff()) return;
    createUser.mutate(
      { data: { name: staffName.trim(), email: staffEmail.trim(), password: staffPassword.trim(), role: "staff" } },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          qc.invalidateQueries({ queryKey: ["/api/auth/users"] });
          setShowAddStaff(false);
          setStaffName("");
          setStaffEmail("");
          setStaffPassword("");
          users.refetch();
        },
      }
    );
  };

  const handleDeleteUser = (userId: number, userName: string) => {
    Alert.alert(t.delete, `${t.delete} ${userName}?`, [
      { text: t.cancel, style: "cancel" },
      {
        text: t.delete,
        style: "destructive",
        onPress: () => {
          deleteUser.mutate(
            { id: userId },
            {
              onSuccess: () => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                users.refetch();
              },
            }
          );
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: Platform.OS === "web" ? 67 + 16 : insets.top + 16,
          paddingBottom: Platform.OS === "web" ? 50 : 24,
        },
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.title, { color: colors.foreground }]}>{t.settings}</Text>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{t.settings.language.toUpperCase()}</Text>
        <View style={[styles.langRow, { flexDirection: isRtl ? "row-reverse" : "row" }]}>
          <TouchableOpacity
            style={[styles.langBtn, { borderColor: lang === "en" ? colors.primary : colors.border, backgroundColor: lang === "en" ? colors.primary + "15" : "transparent" }]}
            onPress={() => setLang("en")}
          >
            <Text style={[styles.langBtnText, { color: lang === "en" ? colors.primary : colors.mutedForeground }]}>{t.settings.english}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.langBtn, { borderColor: lang === "ur" ? colors.primary : colors.border, backgroundColor: lang === "ur" ? colors.primary + "15" : "transparent" }]}
            onPress={() => setLang("ur")}
          >
            <Text style={[styles.langBtnText, { color: lang === "ur" ? colors.primary : colors.mutedForeground }]}>{t.settings.urdu}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{t.settings.dailyCapacity.toUpperCase()}</Text>
        <View style={[styles.capacityRow, { flexDirection: isRtl ? "row-reverse" : "row" }]}>
          <FormField
            label=""
            value={capacity}
            onChangeText={setCapacity}
            keyboardType="number-pad"
            placeholder="e.g. 50"
            style={{ flex: 1, marginBottom: 0 }}
          />
          <TouchableOpacity
            style={[styles.saveCapBtn, { backgroundColor: colors.primary, opacity: updateSettings.isPending ? 0.7 : 1 }]}
            onPress={handleSaveCapacity}
            disabled={updateSettings.isPending}
          >
            {updateSettings.isPending ? (
              <ActivityIndicator color={colors.primaryForeground} size="small" />
            ) : (
              <Text style={[styles.saveCapBtnText, { color: colors.primaryForeground }]}>{t.save}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.staffHeader, { flexDirection: isRtl ? "row-reverse" : "row" }]}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{t.settings.staff.toUpperCase()}</Text>
          <TouchableOpacity onPress={() => setShowAddStaff(!showAddStaff)}>
            <Ionicons name={showAddStaff ? "close" : "add-circle-outline"} size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {showAddStaff && (
          <View style={styles.addStaffForm}>
            <FormField label={t.customer.name} value={staffName} onChangeText={setStaffName} placeholder={t.customer.name} error={errors.staffName} autoCapitalize="words" />
            <FormField label={t.email} value={staffEmail} onChangeText={setStaffEmail} placeholder={t.email} keyboardType="email-address" error={errors.staffEmail} autoCapitalize="none" />
            <FormField label={t.password} value={staffPassword} onChangeText={setStaffPassword} placeholder={t.password} secureTextEntry error={errors.staffPassword} />
            <TouchableOpacity
              style={[styles.addStaffBtn, { backgroundColor: colors.primary, opacity: createUser.isPending ? 0.7 : 1 }]}
              onPress={handleAddStaff}
              disabled={createUser.isPending}
            >
              {createUser.isPending ? (
                <ActivityIndicator color={colors.primaryForeground} size="small" />
              ) : (
                <Text style={[styles.addStaffBtnText, { color: colors.primaryForeground }]}>{t.settings.addStaff}</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {users.isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 8 }} />
        ) : (
          users.data?.map((user, idx) => (
            <View
              key={user.id}
              style={[
                styles.userRow,
                {
                  borderTopColor: colors.border,
                  borderTopWidth: idx > 0 || showAddStaff ? 1 : 0,
                  flexDirection: isRtl ? "row-reverse" : "row",
                },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.userName, { color: colors.foreground }]}>{user.name}</Text>
                <Text style={[styles.userEmail, { color: colors.mutedForeground }]}>{user.email}</Text>
              </View>
              <View style={[styles.roleTag, { backgroundColor: user.role === "owner" ? colors.primary + "20" : colors.muted }]}>
                <Text style={[styles.roleTagText, { color: user.role === "owner" ? colors.primary : colors.mutedForeground }]}>
                  {user.role === "owner" ? t.settings.role.owner : t.settings.role.staff}
                </Text>
              </View>
              {user.id !== me.data?.id && user.role !== "owner" && (
                <TouchableOpacity onPress={() => handleDeleteUser(user.id, user.name)} style={{ marginLeft: 8 }}>
                  <Ionicons name="trash-outline" size={16} color={colors.destructive} />
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 14 },
  title: { fontSize: 26, fontWeight: "700", marginBottom: 4 },
  noAccess: { fontSize: 16, marginTop: 12 },
  section: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 12 },
  sectionTitle: { fontSize: 11, fontWeight: "600", letterSpacing: 0.5 },
  langRow: { gap: 10 },
  langBtn: { flex: 1, borderRadius: 10, borderWidth: 1, paddingVertical: 12, alignItems: "center" },
  langBtnText: { fontSize: 15, fontWeight: "600" },
  capacityRow: { flexDirection: "row", gap: 10, alignItems: "flex-end" },
  saveCapBtn: { borderRadius: 10, paddingHorizontal: 16, height: 48, alignItems: "center", justifyContent: "center" },
  saveCapBtnText: { fontSize: 14, fontWeight: "600" },
  staffHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  addStaffForm: { gap: 10, paddingBottom: 8 },
  addStaffBtn: { borderRadius: 10, height: 48, alignItems: "center", justifyContent: "center" },
  addStaffBtnText: { fontSize: 14, fontWeight: "600" },
  userRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingTop: 10 },
  userName: { fontSize: 14, fontWeight: "600" },
  userEmail: { fontSize: 12 },
  roleTag: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  roleTagText: { fontSize: 11, fontWeight: "600" },
});
