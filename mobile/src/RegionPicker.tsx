import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { api } from "./api";
import { Button, colors, ErrorText, Input, styles } from "./ui";
import { regionLevels } from "../../shared/community";
import type { Region } from "../../shared/community";
import { chooseRegion } from "../../shared/filters";
import type { CommunityFilters } from "../../shared/filters";
export default function RegionPicker({
  value,
  onChange,
}: {
  value: CommunityFilters;
  onChange: (v: CommunityFilters) => void;
}) {
  const [level, setLevel] = useState(0);
  const [rows, setRows] = useState<Region[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [truncated, setTruncated] = useState(false);
  const [retry, setRetry] = useState(0);
  const parent = level > 0 ? value.codes[level - 1] : null;
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setRows([]);
    setError("");
    setTruncated(false);
    const timer = setTimeout(() => {
      const q = new URLSearchParams({ level: String(level + 1), search });
      if (parent) q.set("parent", parent);
      api<{ regions: Region[]; truncated: boolean }>(`/api/v1/regions?${q}`, {
        signal: controller.signal,
      })
        .then((r) => {
          if (!controller.signal.aborted) {
            setRows(r.regions);
            setTruncated(r.truncated);
          }
        })
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
  }, [level, parent, search, retry]);
  return (
    <View style={{ gap: 12 }}>
      <Text style={styles.label}>Lokasi</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {regionLevels.map((label, i) => (
          <Pressable
            key={label}
            accessibilityRole="button"
            accessibilityState={{
              selected: i === level,
              disabled: i > 0 && !value.codes[i - 1],
            }}
            disabled={i > 0 && !value.codes[i - 1]}
            onPress={() => {
              setLevel(i);
              setSearch("");
            }}
            style={[
              styles.chip,
              { width: "48%", opacity: i > 0 && !value.codes[i - 1] ? 0.5 : 1 },
              i === level && {
                borderColor: colors.accent,
                backgroundColor: "#E4EFE5",
              },
            ]}
          >
            <Text style={styles.label}>{label}</Text>
            <Text style={styles.text}>
              {value.labels?.[i] || value.codes[i] || "Pilih wilayah"}
            </Text>
          </Pressable>
        ))}
      </View>
      <Input
        label={`Cari ${regionLevels[level]}`}
        value={search}
        onChangeText={setSearch}
        autoCorrect={false}
      />
      <ErrorText message={error} />
      {error && (
        <Button
          secondary
          title="Muat ulang wilayah"
          onPress={() => setRetry((v) => v + 1)}
        />
      )}
      <ScrollView
        style={{
          height: 180,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 10,
        }}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
      >
        <Pressable
          style={styles.chip}
          accessibilityRole="button"
          onPress={() => onChange(chooseRegion(value, level, "", ""))}
        >
          <Text style={styles.text}>
            Semua {regionLevels[level].toLowerCase()}
          </Text>
        </Pressable>
        {loading ? (
          <Text style={[styles.text, { padding: 12 }]}>Memuat wilayah…</Text>
        ) : (
          rows.map((item) => (
            <Pressable
              key={item.code}
              accessibilityRole="button"
              style={styles.chip}
              onPress={() => {
                onChange(chooseRegion(value, level, item.code, item.name));
                if (level < 3) setLevel(level + 1);
                setSearch("");
              }}
            >
              <Text style={styles.text}>{item.name}</Text>
            </Pressable>
          ))
        )}
        {!loading && !error && !rows.length && (
          <Text style={[styles.text, { padding: 12 }]}>
            Tidak ada wilayah yang cocok.
          </Text>
        )}
      </ScrollView>
      {truncated && (
        <Text style={styles.label}>
          Gunakan pencarian untuk mempersempit pilihan.
        </Text>
      )}
    </View>
  );
}
