import { Tabs } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps } from "react";
export default function Layout() {
  const icons: Record<string, ComponentProps<typeof Ionicons>["name"]> = {
    index: "grid-outline",
    reports: "document-text-outline",
    classify: "scan-outline",
    guide: "leaf-outline",
    profile: "person-outline",
  };
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: "#215B3C",
        tabBarInactiveTintColor: "#56665C",
        tabBarStyle: { backgroundColor: "#FFF", borderTopColor: "#DCE4DC" },
        tabBarIcon: ({ color, size }) => (
          <Ionicons
            name={icons[route.name] || "ellipse-outline"}
            color={typeof color === "string" ? color : "#215B3C"}
            size={size}
          />
        ),
      })}
    >
      <Tabs.Screen name="index" options={{ title: "Ringkasan" }} />
      <Tabs.Screen name="reports" options={{ title: "Laporan" }} />
      <Tabs.Screen name="classify" options={{ title: "Klasifikasi" }} />
      <Tabs.Screen name="guide" options={{ title: "Panduan" }} />
      <Tabs.Screen name="profile" options={{ title: "Profil" }} />
    </Tabs>
  );
}
