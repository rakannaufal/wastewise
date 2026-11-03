import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { api } from "./api";
import { Button, ErrorText, styles } from "./ui";
import { regionLevels } from "../../shared/community";
import type { Region } from "../../shared/community";
import { chooseRegion } from "../../shared/filters";
import type { CommunityFilters } from "../../shared/filters";
import SelectField from "./SelectField";

export default function RegionPicker({
  value,
  onChange,
  active,
  setActive,
}: {
  value: CommunityFilters;
  onChange: (v: CommunityFilters) => void;
  active: string;
  setActive: (key: string) => void;
}) {
  const level = active.startsWith("region-") ? Number(active.slice(7)) : -1;
  const [rows, setRows] = useState<Region[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [truncated, setTruncated] = useState(false);
  const [retry, setRetry] = useState(0);
  const parent = level > 0 ? value.codes[level - 1] : "";
  useEffect(() => {
    setSearch("");
    setRows([]);
  }, [active]);
  useEffect(() => {
    if (level < 0) return;
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
    <View style={{ gap: 14 }}>
      {regionLevels.map((label, i) => (
        <SelectField
          key={label}
          title={label}
          disabled={i > 0 && !value.codes[i - 1]}
          value={value.codes[i] || ""}
          open={level === i}
          onToggle={(open) => setActive(open ? `region-${i}` : "")}
          choices={[
            { id: "", name: `Semua ${label.toLowerCase()}` },
            ...(value.codes[i]
              ? [
                  {
                    id: value.codes[i],
                    name: value.labels?.[i] || value.codes[i],
                  },
                ]
              : []),
            ...(level === i
              ? rows
                  .filter((r) => r.code !== value.codes[i])
                  .map((r) => ({ id: r.code, name: r.name }))
              : []),
          ]}
          loading={loading}
          search={search}
          onSearch={setSearch}
          onChange={(code) =>
            onChange(
              chooseRegion(
                value,
                i,
                code,
                rows.find((r) => r.code === code)?.name ||
                  value.labels?.[i] ||
                  "",
              ),
            )
          }
        />
      ))}
      <ErrorText message={error} />
      {error && (
        <Button
          secondary
          title="Muat ulang wilayah"
          onPress={() => setRetry((v) => v + 1)}
        />
      )}
      {truncated && (
        <Text style={styles.label}>
          Gunakan pencarian untuk mempersempit pilihan.
        </Text>
      )}
    </View>
  );
}
