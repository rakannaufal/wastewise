import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { IconAction } from "./BrandHeader";
import { colors, styles } from "./ui";
export default function PostMenu({
  owner,
  disabled,
  edit,
  remove,
  report,
}: {
  owner: boolean;
  disabled: boolean;
  edit: () => void;
  remove: () => void;
  report: () => void;
}) {
  const [open, setOpen] = useState(false);
  const actions = [
    ...(owner
      ? [
          {
            name: "create-outline" as const,
            label: "Edit deskripsi",
            action: edit,
          },
          {
            name: "trash-outline" as const,
            label: "Batalkan publikasi",
            action: remove,
          },
        ]
      : []),
    { name: "flag-outline" as const, label: "Laporkan konten", action: report },
  ];
  return (
    <View style={{ position: "relative", zIndex: 10 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Opsi posting"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(!open)}
        style={{
          minWidth: 44,
          minHeight: 44,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name="ellipsis-horizontal" size={24} color={colors.ink} />
      </Pressable>
      {open && (
        <View
          style={{
            position: "absolute",
            top: 44,
            right: 0,
            width: 230,
            padding: 8,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 12,
            backgroundColor: "#fff",
            zIndex: 20,
          }}
        >
          {actions.map((item) => (
            <Pressable
              key={item.label}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              disabled={disabled}
              onPress={() => {
                setOpen(false);
                item.action();
              }}
              style={[
                styles.row,
                { minHeight: 44, padding: 8, opacity: disabled ? 0.4 : 1 },
              ]}
            >
              <Ionicons name={item.name} size={19} color={colors.accent} />
              <Text style={styles.text}>{item.label}</Text>
            </Pressable>
          ))}
          <View style={{ alignSelf: "flex-end" }}>
            <IconAction
              name="close"
              label="Tutup opsi posting"
              onPress={() => setOpen(false)}
            />
          </View>
        </View>
      )}
    </View>
  );
}
