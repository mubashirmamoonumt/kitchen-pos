import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, View, useColorScheme } from "react-native";
import { useGetMe } from "@workspace/api-client-react";

import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/context/I18nContext";

function NativeTabLayout() {
  const { data: me } = useGetMe();
  const { t } = useI18n();
  const isOwner = me?.role === "owner";

  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "house", selected: "house.fill" }} />
        <Label>{t.tabs.dashboard}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="orders">
        <Icon sf={{ default: "list.clipboard", selected: "list.clipboard.fill" }} />
        <Label>{t.tabs.orders}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="new-order">
        <Icon sf={{ default: "plus.circle", selected: "plus.circle.fill" }} />
        <Label>{t.tabs.newOrder}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="menu">
        <Icon sf={{ default: "fork.knife", selected: "fork.knife" }} />
        <Label>{t.tabs.menu}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="customers">
        <Icon sf={{ default: "person.2", selected: "person.2.fill" }} />
        <Label>{t.tabs.customers}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="inventory">
        <Icon sf={{ default: "cube.box", selected: "cube.box.fill" }} />
        <Label>{t.tabs.inventory}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="bills">
        <Icon sf={{ default: "doc.text", selected: "doc.text.fill" }} />
        <Label>{t.tabs.bills}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="schedule">
        <Icon sf={{ default: "calendar", selected: "calendar.circle.fill" }} />
        <Label>{t.tabs.schedule}</Label>
      </NativeTabs.Trigger>
      {isOwner && (
        <NativeTabs.Trigger name="reports">
          <Icon sf={{ default: "chart.bar", selected: "chart.bar.fill" }} />
          <Label>{t.tabs.reports}</Label>
        </NativeTabs.Trigger>
      )}
      {isOwner && (
        <NativeTabs.Trigger name="settings">
          <Icon sf={{ default: "gearshape", selected: "gearshape.fill" }} />
          <Label>{t.tabs.settings}</Label>
        </NativeTabs.Trigger>
      )}
      <NativeTabs.Trigger name="profile">
        <Icon sf={{ default: "person", selected: "person.fill" }} />
        <Label>{t.tabs.profile}</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const { data: me } = useGetMe();
  const { t } = useI18n();

  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";
  const isOwner = me?.role === "owner";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.background,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={100}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View
              style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]}
            />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t.tabs.dashboard,
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="house" tintColor={color} size={24} />
            ) : (
              <Ionicons name="home-outline" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: t.tabs.orders,
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="list.clipboard" tintColor={color} size={24} />
            ) : (
              <Ionicons name="receipt-outline" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="new-order"
        options={{
          title: t.tabs.newOrder,
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="plus.circle" tintColor={color} size={24} />
            ) : (
              <Ionicons name="add-circle-outline" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="menu"
        options={{
          title: t.tabs.menu,
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="fork.knife" tintColor={color} size={24} />
            ) : (
              <Ionicons name="restaurant-outline" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="customers"
        options={{
          title: t.tabs.customers,
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="person.2" tintColor={color} size={24} />
            ) : (
              <Ionicons name="people-outline" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: t.tabs.inventory,
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="cube.box" tintColor={color} size={24} />
            ) : (
              <Ionicons name="cube-outline" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="bills"
        options={{
          title: t.tabs.bills,
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="doc.text" tintColor={color} size={24} />
            ) : (
              <Ionicons name="document-text-outline" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: t.tabs.schedule,
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="calendar.circle" tintColor={color} size={24} />
            ) : (
              <Ionicons name="calendar-outline" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: t.tabs.reports,
          tabBarItemStyle: isOwner ? undefined : { display: "none" },
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="chart.bar" tintColor={color} size={24} />
            ) : (
              <Ionicons name="bar-chart-outline" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t.tabs.settings,
          tabBarItemStyle: isOwner ? undefined : { display: "none" },
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="gearshape" tintColor={color} size={24} />
            ) : (
              <Ionicons name="settings-outline" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t.tabs.profile,
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="person" tintColor={color} size={24} />
            ) : (
              <Ionicons name="person-outline" size={22} color={color} />
            ),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}
