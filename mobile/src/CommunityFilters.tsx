import { useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Button, styles, categories, statusName, colors } from "./ui";
import { emptyFilters, filterCount } from "../../shared/filters";
import type { Filters } from "./community";
import RegionPicker from "./RegionPicker";
function Choices({
  title,
  choices,
  value,
  onChange,
}: {
  title: string;
  choices: { id: string; name: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <View style={{ gap: 10 }}>
      <Text style={styles.label}>{title}</Text>
      <View
        style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
        accessibilityRole="radiogroup"
        accessibilityLabel={title}
      >
        {choices.map((c) => (
          <Pressable
            key={c.id}
            accessibilityRole="radio"
            accessibilityState={{ checked: value === c.id }}
            onPress={() => onChange(c.id)}
            style={[
              styles.chip,
              value === c.id && {
                backgroundColor: "#E4EFE5",
                borderColor: colors.accent,
              },
            ]}
          >
            <Text style={styles.text}>{c.name}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
export default function CommunityFilters({
  value,
  onChange,
  title = "Beranda",
  statusOnly = false,
}: {
  value: Filters;
  onChange: (v: Filters) => void;
  title?: string;
  statusOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Filters>(value);
  const [resetVersion, setResetVersion] = useState(0);
  const count = filterCount(value);
  const chips = [
    {
      name: "lokasi",
      text: value.labels?.filter(Boolean).at(-1) || value.codes.at(-1),
      clear: () => onChange({ ...value, codes: [], labels: [] }),
    },
    {
      name: "kategori",
      text: categories.find((c) => c.id === value.category)?.name,
      clear: () => onChange({ ...value, category: "" }),
    },
    {
      name: "status",
      text: value.status ? statusName[value.status] : "",
      clear: () => onChange({ ...value, status: "" }),
    },
  ];
  return (
    <View style={{ gap: 10 }}>
      <View style={[styles.row, { justifyContent: "space-between" }]}>
        <Text accessibilityRole="header" style={[styles.title, { flex: 1 }]}>
          {title}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Buka filter${count ? `, ${count} aktif` : ""}`}
          accessibilityState={{ expanded: open }}
          onPress={() => {
            setDraft(value);
            setResetVersion((v) => v + 1);
            setOpen(true);
          }}
          style={styles.filterTrigger}
        >
          <Ionicons name="options-outline" size={23} color={colors.accent} />
          {count > 0 && (
            <Text style={[styles.label, { color: colors.accent }]}>
              {count}
            </Text>
          )}
        </Pressable>
      </View>
      {count > 0 && (
        <View style={[styles.row, { flexWrap: "wrap", gap: 8 }]}>
          {chips
            .filter((c) => c.text)
            .map((c) => (
              <Pressable
                key={c.name}
                accessibilityRole="button"
                accessibilityLabel={`Hapus filter ${c.name}`}
                style={[
                  styles.activeFilter,
                  styles.row,
                  { gap: 6, flexShrink: 1 },
                ]}
                onPress={c.clear}
              >
                <Text style={[styles.label, { flexShrink: 1 }]}>{c.text}</Text>
                <Ionicons name="close" size={14} color={colors.muted} />
              </Pressable>
            ))}
        </View>
      )}
      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{
            flex: 1,
            justifyContent: "flex-end",
            backgroundColor: "#17281f66",
          }}
        >
          <SafeAreaView
            edges={["bottom", "left", "right"]}
            style={{
              maxHeight: "92%",
              backgroundColor: "#fff",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
            }}
          >
            <View
              accessibilityViewIsModal
              style={{ padding: 20, gap: 16, flexShrink: 1 }}
            >
              <View style={[styles.row, { justifyContent: "space-between" }]}>
                <Text accessibilityRole="header" style={styles.heading}>
                  Filter
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Tutup filter"
                  onPress={() => setOpen(false)}
                  style={styles.filterTrigger}
                >
                  <Ionicons name="close" size={24} color={colors.ink} />
                </Pressable>
              </View>
              <ScrollView
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
                contentContainerStyle={{ gap: 20 }}
              >
                {!statusOnly && (
                  <>
                    <RegionPicker
                      key={resetVersion}
                      value={draft}
                      onChange={setDraft}
                    />
                    <Choices
                      title="Kategori sampah"
                      choices={[
                        { id: "", name: "Semua material" },
                        ...categories,
                      ]}
                      value={draft.category}
                      onChange={(category) => setDraft({ ...draft, category })}
                    />
                  </>
                )}
                <Choices
                  title="Status laporan"
                  choices={[
                    ["", "Semua status"],
                    ...Object.entries(statusName),
                  ].map(([id, name]) => ({ id, name }))}
                  value={draft.status}
                  onChange={(status) => setDraft({ ...draft, status })}
                />
              </ScrollView>
              <View
                style={[
                  styles.row,
                  {
                    borderTopWidth: 1,
                    borderColor: colors.border,
                    paddingTop: 16,
                  },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Button
                    secondary
                    title="Reset"
                    onPress={() => {
                      setDraft(emptyFilters);
                      setResetVersion((v) => v + 1);
                    }}
                  />
                </View>
                <View style={{ flex: 2 }}>
                  <Button
                    title="Terapkan"
                    onPress={() => {
                      onChange(draft);
                      setOpen(false);
                    }}
                  />
                </View>
              </View>
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
