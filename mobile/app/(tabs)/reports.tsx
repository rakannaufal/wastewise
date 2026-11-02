import { useCallback, useRef, useState } from "react";
import { FlatList, Image, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { api } from "../../src/api";
import type { Report } from "../../src/api";
import { useSession } from "../../src/session";
import {
  Button,
  categoryName,
  ErrorText,
  Input,
  statusName,
  styles,
} from "../../src/ui";
export default function Reports() {
  const { user } = useSession();
  const controller = useRef<AbortController | null>(null);
  const [rows, setRows] = useState<Report[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(() => {
    controller.current?.abort(); const abort = new AbortController(); controller.current = abort;
    setBusy(true);
    setError("");
    api<{ reports: Report[]; pagination: { total_pages: number } }>(
      `/api/v1/reports?page=${page}&search=${encodeURIComponent(filter)}${status ? `&status=${encodeURIComponent(status)}` : ""}`,
      { signal: abort.signal },
    )
      .then((data) => {
        if (abort.signal.aborted) return;
        setRows(data.reports);
        setPages(data.pagination.total_pages);
      })
      .catch((e) => { if (!abort.signal.aborted) setError(e.message); })
      .finally(() => { if (!abort.signal.aborted) setBusy(false); });
  }, [page, filter, status, user?.id]);
  useFocusEffect(useCallback(() => { setRows([]); load(); return () => controller.current?.abort(); }, [load]));
  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        refreshing={busy}
        onRefresh={load}
        ListHeaderComponent={
          <View style={{ gap: 16 }}>
            <Text style={styles.title}>Laporan sampah</Text>
            <Button
              title="Buat laporan"
              onPress={() => router.push("/new-report")}
            />
            <Input
              label="Cari deskripsi"
              value={search}
              onChangeText={setSearch}
              onSubmitEditing={() => {
                setPage(1);
                setFilter(search);
              }}
              returnKeyType="search"
            />
            <Button
              secondary
              title="Cari laporan"
              onPress={() => {
                setPage(1);
                setFilter(search);
              }}
            />
            <View
              style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
              accessibilityRole="radiogroup"
              accessibilityLabel="Filter status"
            >
              {[["", "Semua"], ...Object.entries(statusName)].map(
                ([value, label]) => (
                  <Pressable
                    key={value}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: status === value }}
                    onPress={() => {
                      setPage(1);
                      setStatus(value);
                    }}
                    style={[
                      styles.chip,
                      status === value && {
                        backgroundColor: "#E4EFE5",
                        borderColor: "#215B3C",
                      },
                    ]}
                  >
                    <Text style={styles.label}>{label}</Text>
                  </Pressable>
                ),
              )}
            </View>
            <ErrorText message={error} />
            {error ? (
              <Button title="Coba lagi" secondary onPress={load} />
            ) : null}
          </View>
        }
        ListEmptyComponent={
          !busy ? (
            <Text style={[styles.text, { textAlign: "center", padding: 25 }]}>
              Belum ada laporan yang cocok.
            </Text>
          ) : undefined
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Laporan ${categoryName(item.category)}`}
            onPress={() => router.push(`/report/${item.id}`)}
            style={[styles.panel, styles.row]}
          >
            <Image
              source={{ uri: item.thumbnail_url || item.image_url }}
              style={{ width: 62, height: 70, borderRadius: 9 }}
            />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.heading}>{categoryName(item.category)}</Text>
              <Text style={styles.text} numberOfLines={2}>
                {item.description}
              </Text>
              {item.classification_state === "needs_review" && <Text style={styles.label}>Perlu review AI</Text>}
              <Text style={[styles.label, { color: "#215B3C" }]}>
                {statusName[item.status]}
              </Text>
            </View>
          </Pressable>
        )}
        ListFooterComponent={
          <View style={{ gap: 12 }}>
            <Text style={styles.label}>Halaman {page}</Text>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Button
                  secondary
                  title="Sebelumnya"
                  disabled={page === 1 || busy}
                  onPress={() => setPage(page - 1)}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  secondary
                  title="Berikutnya"
                  disabled={page >= pages || busy}
                  onPress={() => setPage(page + 1)}
                />
              </View>
            </View>
          </View>
        }
      />
    </SafeAreaView>
  );
}
