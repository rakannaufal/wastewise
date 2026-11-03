import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { TextInputProps } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import categories from "../../shared/categories.json";
export { categories };
export const categoryName = (id: string) =>
  categories.find((c) => c.id === id)?.name || id;
export const statusName: Record<string, string> = {
  Pending: "Menunggu",
  "In Progress": "Diproses",
  Completed: "Selesai",
  Rejected: "Ditolak",
};
export const colors = {
  bg: "#F5F7F4",
  ink: "#17281F",
  muted: "#56665C",
  accent: "#215B3C",
  border: "#DCE4DC",
};
export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: {
    padding: 20,
    gap: 18,
    paddingBottom: 42,
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
  },
  title: {
    fontFamily: "Caveat_700",
    fontSize: 34,
    lineHeight: 42,
    fontWeight: "700",
    color: colors.ink,
    letterSpacing: 0,
  },
  heading: {
    fontFamily: "Caveat_700",
    fontSize: 27,
    lineHeight: 34,
    fontWeight: "700",
    color: colors.ink,
  },
  text: {
    fontFamily: "Manrope_400",
    fontSize: 15,
    lineHeight: 22,
    color: colors.muted,
  },
  label: {
    fontFamily: "Manrope_600",
    fontSize: 12,
    fontWeight: "600",
    color: colors.muted,
  },
  panel: {
    padding: 20,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    gap: 12,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: "#A9BBAC",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.ink,
    backgroundColor: "#FFF",
    fontFamily: "Manrope_400",
    fontSize: 15,
  },
  photo: {
    width: "100%",
    height: 250,
    borderRadius: 12,
    backgroundColor: "#E7EDE2",
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  chip: {
    minHeight: 44,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#FFF",
  },
  error: {
    fontFamily: "Manrope_400",
    color: "#9A332B",
    backgroundColor: "#FFF0ED",
    padding: 14,
    borderRadius: 10,
    fontSize: 13,
    lineHeight: 21,
  },
  action: { padding: 18, borderRadius: 12, backgroundColor: "#E4EFE5", gap: 8 },
  filterTrigger: {
    minHeight: 44,
    minWidth: 44,
    padding: 10,
    flexDirection: "row",
    gap: 4,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: "#fff",
  },
  activeFilter: {
    paddingHorizontal: 10,
    paddingVertical: 12,
    minHeight: 44,
    backgroundColor: "#E4EFE5",
    borderRadius: 8,
  },
});
export function Screen({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
        keyboardDismissMode="on-drag"
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
export function Button({
  title,
  onPress,
  secondary = false,
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 48,
        padding: 14,
        borderRadius: 10,
        backgroundColor: secondary ? "#E4EFE5" : colors.accent,
        opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
        justifyContent: "center",
        alignItems: "center",
      })}
    >
      <Text
        style={{
          color: secondary ? colors.accent : "#FFF",
          fontFamily: "Manrope_600",
          fontWeight: "600",
          fontSize: 14,
          textAlign: "center",
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
}
export function Input({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="#66786A"
        style={styles.input}
        {...props}
      />
    </View>
  );
}
export function ErrorText({ message }: { message: string }) {
  return message ? (
    <Text accessibilityRole="alert" style={styles.error}>
      {message}
    </Text>
  ) : null;
}
export function Loading() {
  return (
    <View style={{ padding: 30 }}>
      <ActivityIndicator size="large" color={colors.accent} />
    </View>
  );
}
export function Action({ category }: { category: string }) {
  return (
    <View style={styles.action}>
      <Text style={[styles.label, { color: colors.accent }]}>
        LANGKAH BERIKUTNYA
      </Text>
      <Text style={styles.text}>
        {categories.find((c) => c.id === category)?.action}
      </Text>
    </View>
  );
}
