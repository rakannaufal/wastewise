import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { api } from "./api";
import { Button, ErrorText, Input, styles, categories, statusName } from "./ui";
import { regionLevels } from "../../shared/community";
import type { Region } from "../../shared/community";
import type { Filters } from "./community";
export default function CommunityFilters({
  value,
  onChange,
}: {
  value: Filters;
  onChange: (v: Filters) => void;
}) {
  const [open, setOpen] = useState(false);
  const [level, setLevel] = useState(0);
  const [rows, setRows] = useState<Region[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [retry, setRetry] = useState(0);
  const [labels, setLabels] = useState<string[]>([]);
  const parent = level > 0 ? value.codes[level - 1] : null;
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setLoading(true);
    setRows([]);
    setError("");
    const timer = setTimeout(() => {
      const q = new URLSearchParams();
      if (parent) q.set("parent", parent);
      if (search) q.set("search", search);
      q.set("level", String(level + 1));
      api<{ regions: Region[]; truncated: boolean }>(`/api/v1/regions?${q}`, {
        signal: controller.signal,
      })
        .then((r) => setRows(r.regions))
        .catch((e) => {
          if (!controller.signal.aborted) setError((e as Error).message);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [level, parent, search, open, retry]);
  return (
    <View style={{ gap: 10 }}>
      <Button
        secondary
        title={labels.filter(Boolean).join(" / ") || "Filter wilayah Indonesia"}
        onPress={() => {
          setLevel(0);
          setSearch("");
          setOpen(true);
        }}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        {[{ id: "", name: "Semua material" }, ...categories].map((c) => (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: value.category === c.id }}
            key={c.id}
            style={[
              styles.chip,
              value.category === c.id && { backgroundColor: "#e4efe5" },
            ]}
            onPress={() => onChange({ ...value, category: c.id })}
          >
            <Text style={styles.text}>{c.name}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        {[["", "Semua status"], ...Object.entries(statusName)].map(
          ([id, name]) => (
            <Pressable
              key={id}
              accessibilityRole="button"
              accessibilityState={{ selected: value.status === id }}
              style={[
                styles.chip,
                value.status === id && { backgroundColor: "#e4efe5" },
              ]}
              onPress={() => onChange({ ...value, status: id })}
            >
              <Text style={styles.text}>{name}</Text>
            </Pressable>
          ),
        )}
      </ScrollView>
      <Modal
        visible={open}
        animationType="slide"
        onRequestClose={() => setOpen(false)}
        presentationStyle="pageSheet"
      >
        <View style={[styles.screen, { padding: 24, paddingTop: 48, gap: 16 }]}>
          <Text style={styles.heading}>{regionLevels[level]}</Text>
          <Text style={styles.text}>
            {labels.slice(0, level).join(" / ") || "Indonesia"}
          </Text>
          <Input label="Cari wilayah" value={search} onChangeText={setSearch} />
          <ErrorText message={error} />
          {error && (
            <Button
              secondary
              title="Coba kembali"
              onPress={() => setRetry((v) => v + 1)}
            />
          )}
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.text}>{loading ? "Memuat wilayah…" : ""}</Text>
            {rows.map((r) => (
              <Pressable
                key={r.code}
                style={styles.chip}
                accessibilityRole="button"
                onPress={() => {
                  const codes = value.codes.slice(0, level);
                  codes.push(r.code);
                  onChange({ ...value, codes });
                  setLabels((v) => [...v.slice(0, level), r.name]);
                  setSearch("");
                  if (level < 3) setLevel((v) => v + 1);
                  else setOpen(false);
                }}
              >
                <Text style={styles.text}>{r.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <Button
            title="Gunakan wilayah terpilih"
            onPress={() => setOpen(false)}
          />
          <Button
            secondary
            title={level ? "Kembali satu tingkat" : "Hapus filter lokasi"}
            onPress={() => {
              if (level) {
                setLevel((v) => v - 1);
                setSearch("");
              } else {
                onChange({ ...value, codes: [] });
                setLabels([]);
                setOpen(false);
              }
            }}
          />
        </View>
      </Modal>
    </View>
  );
}
