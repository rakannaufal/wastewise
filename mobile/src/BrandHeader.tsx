import type { ComponentProps, ReactNode } from "react";
import { Alert, Image, Platform, Pressable, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { colors, styles, Loading } from "./ui";

export function BrandHeader({ children }: { children?: ReactNode }) {
  return (
    <View
      style={[styles.row, { justifyContent: "space-between", minHeight: 48 }]}
    >
      <View
        accessibilityRole="header"
        accessibilityLabel="WasteWise"
        style={[styles.row, { gap: 9, flexShrink: 1 }]}
      >
        <Image
          source={require("../assets/brand/icon.png")}
          style={{ width: 34, height: 34, borderRadius: 9 }}
          accessible={false}
        />
        <Text
          style={{
            fontFamily: "Manrope_700",
            fontSize: 25,
            letterSpacing: -0.8,
            color: colors.accent,
          }}
        >
          WasteWise
        </Text>
      </View>
      {children}
    </View>
  );
}
export function IconAction({
  name,
  label,
  onPress,
  disabled = false,
  destructive = false,
}: {
  name: ComponentProps<typeof Ionicons>["name"];
  label: string;
  onPress: () => void;
  disabled?: boolean;
  destructive?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minWidth: 44,
        minHeight: 44,
        alignItems: "center",
        justifyContent: "center",
        opacity: disabled ? 0.4 : pressed ? 0.6 : 1,
      })}
    >
      <Ionicons
        name={name}
        size={23}
        color={destructive ? "#9A332B" : colors.accent}
      />
    </Pressable>
  );
}
export function BackButton({
  label = "Kembali",
  onPress,
}: {
  label?: string;
  onPress?: () => void;
}) {
  return (
    <View style={{ alignSelf: "flex-start" }}>
      <IconAction
        name="chevron-back"
        label={label}
        onPress={
          onPress ||
          (() => (router.canGoBack() ? router.back() : router.replace("/")))
        }
      />
    </View>
  );
}
export function LaunchScreen() {
  return (
    <View
      accessibilityLabel="Memuat WasteWise"
      style={{
        flex: 1,
        backgroundColor: colors.bg,
        alignItems: "center",
        justifyContent: "center",
        gap: 18,
      }}
    >
      <Image
        source={require("../assets/brand/icon.png")}
        style={{ width: 104, height: 104, borderRadius: 26 }}
        accessibilityLabel="Logo WasteWise"
      />
      <Text
        style={{
          fontFamily: "Manrope_700",
          fontSize: 30,
          color: colors.accent,
        }}
      >
        WasteWise
      </Text>
      <Loading compact label="Memuat aplikasi" />
    </View>
  );
}

export function confirmAction(
  title: string,
  message: string,
  action: () => void,
) {
  if (Platform.OS === "web") {
    if (window.confirm(message)) action();
  } else
    Alert.alert(title, message, [
      { text: "Batal", style: "cancel" },
      { text: "Lanjutkan", style: "destructive", onPress: action },
    ]);
}
