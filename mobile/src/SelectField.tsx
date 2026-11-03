import { useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, Input, styles } from "./ui";

type Choice = { id: string; name: string };
export default function SelectField({
  title,
  choices,
  value,
  onChange,
  disabled = false,
  open: controlled,
  onToggle,
  search: remoteSearch,
  onSearch,
  loading = false,
}: {
  title: string;
  choices: Choice[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  open?: boolean;
  onToggle?: (open: boolean) => void;
  search?: string;
  onSearch?: (value: string) => void;
  loading?: boolean;
}) {
  const [localOpen, setOpen] = useState(false);
  const [localSearch, setSearch] = useState("");
  const open = controlled ?? localOpen;
  const search = remoteSearch ?? localSearch;
  const toggle = (next: boolean) => {
    setOpen(next);
    onToggle?.(next);
    if (!next) {
      setSearch("");
      onSearch?.("");
    }
  };
  const rows = onSearch
    ? choices
    : choices.filter((c) =>
        c.name.toLocaleLowerCase("id").includes(search.toLocaleLowerCase("id")),
      );
  return (
    <View style={{ gap: 8 }}>
      <Text style={styles.label}>{title}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ expanded: open, disabled }}
        disabled={disabled}
        onPress={() => toggle(!open)}
        style={{
          minHeight: 48,
          padding: 12,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 12,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          opacity: disabled ? 0.45 : 1,
        }}
      >
        <Text style={[styles.text, { flex: 1 }]}>
          {choices.find((c) => c.id === value)?.name || value || "Pilih"}
        </Text>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={18}
          color={colors.muted}
        />
      </Pressable>
      {open && (
        <View style={{ gap: 8 }}>
          {(choices.length > 6 || onSearch) && (
            <Input
              label={`Cari ${title}`}
              value={search}
              onChangeText={onSearch || setSearch}
              autoCorrect={false}
            />
          )}
          {loading ? (
            <Text style={styles.text}>Memuat pilihan…</Text>
          ) : (
            <FlatList
              style={{ height: Math.min(Math.max(rows.length, 1) * 48, 240) }}
              data={rows}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
              keyExtractor={(c) => c.id}
              ListEmptyComponent={
                <Text style={styles.text}>Tidak ada pilihan yang cocok.</Text>
              }
              renderItem={({ item }) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: item.id === value }}
                  onPress={() => {
                    onChange(item.id);
                    toggle(false);
                  }}
                  style={{
                    minHeight: 48,
                    padding: 12,
                    backgroundColor:
                      item.id === value ? "#E4EFE5" : "transparent",
                    borderRadius: 8,
                  }}
                >
                  <Text style={styles.text}>{item.name}</Text>
                </Pressable>
              )}
            />
          )}
        </View>
      )}
    </View>
  );
}
