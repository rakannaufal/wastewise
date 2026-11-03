import { Tabs, router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, View } from "react-native";
import type { ComponentProps } from "react";
export default function Layout() {
  const icons: Record<string, ComponentProps<typeof Ionicons>["name"]> = {
    index: "home-outline",
    map: "map-outline",
    reports: "document-text-outline",
    profile: "person-outline",
  };
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: "#215B3C",
        tabBarInactiveTintColor: "#56665C",
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopColor: "#DCE4DC",
          minHeight: 72,
        },
        tabBarLabelStyle: { fontFamily: "Manrope_600", fontSize: 11 },
        tabBarAllowFontScaling: true,
        tabBarAccessibilityLabel: (
          {
            index: "Beranda",
            map: "Peta",
            reports: "Laporan",
            profile: "Profil",
            capture: "Foto",
            guide: "Panduan",
            classify: "Klasifikasi",
          } as Record<string, string>
        )[route.name],
        tabBarIcon: ({ color, size }) => (
          <Ionicons
            accessible={false}
            accessibilityElementsHidden
            importantForAccessibility="no"
            name={icons[route.name] || "ellipse-outline"}
            color={typeof color === "string" ? color : "#215B3C"}
            size={size}
          />
        ),
      })}
    >
      <Tabs.Screen name="index" options={{ title: "Beranda" }} />
      <Tabs.Screen name="map" options={{ title: "Peta" }} />
      <Tabs.Screen
        name="capture"
        options={{
          title: "Foto",
          tabBarButton: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Ambil foto sampah"
              onPress={() =>
                router.push({ pathname: "/camera", params: { origin: "tab" } })
              }
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <View
                style={{
                  width: 68,
                  height: 68,
                  borderRadius: 34,
                  backgroundColor: "#215B3C",
                  alignItems: "center",
                  justifyContent: "center",
                  marginTop: -23,
                  borderWidth: 5,
                  borderColor: "#F5F7F4",
                }}
              >
                <Ionicons name="camera" size={32} color="#fff" />
              </View>
            </Pressable>
          ),
        }}
      />
      <Tabs.Screen name="reports" options={{ title: "Laporan" }} />
      <Tabs.Screen name="profile" options={{ title: "Profil" }} />
      <Tabs.Screen name="guide" options={{ href: null }} />
      <Tabs.Screen name="classify" options={{ href: null }} />
    </Tabs>
  );
}
