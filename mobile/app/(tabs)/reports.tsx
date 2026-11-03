import { useCallback, useRef, useState } from "react";
import { FlatList, Image, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { api } from "../../src/api";
import type { Report } from "../../src/api";
import { useSession } from "../../src/session";
import {
  Button,
  categoryName,
  colors,
  ErrorText,
  Input,
  statusName,
  styles,
} from "../../src/ui";
import CommunityFilters from "../../src/CommunityFilters";
import { emptyFilters } from "../../src/community";
import { PostSkeleton } from "../../src/PostCard";
export default function Reports() {
  const { user } = useSession();
  const controller = useRef<AbortController | null>(null);
  const identity = useRef("");
  const [rows, setRows] = useState<Report[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState(emptyFilters);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(() => {
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    const key = `${user?.id}:${page}:${query}:${filters.status}`;
    if (identity.current !== key) {
      setRows([]);
      identity.current = key;
    }
    setBusy(true);
    setError("");
    api<{ reports: Report[]; pagination: { total_pages: number } }>(
      `/api/v1/reports?page=${page}&search=${encodeURIComponent(query)}${filters.status ? `&status=${encodeURIComponent(filters.status)}` : ""}`,
      { signal: abort.signal },
    )
      .then((data) => {
        if (!abort.signal.aborted) {
          setRows(data.reports);
          setPages(data.pagination.total_pages);
        }
      })
      .catch((e) => {
        if (!abort.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!abort.signal.aborted) setBusy(false);
      });
  }, [page, query, filters.status, user?.id]);
  useFocusEffect(
    useCallback(() => {
      load();
      return () => controller.current?.abort();
    }, [load]),
  );
  const submitSearch = () => {
    setPage(1);
    setQuery(search.trim());
  };
  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.content, { padding: 16, gap: 12 }]}
        refreshing={busy}
        onRefresh={load}
        ListHeaderComponent={
          <View style={{ gap: 14, marginBottom: 8 }}>
            <CommunityFilters
              value={filters}
              statusOnly
              onChange={(v) => {
                setPage(1);
                setFilters(v);
              }}
            />
            <View
              style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}
            >
              <View style={{ flex: 1 }}>
                <Input
                  label="Cari deskripsi"
                  placeholder="Cari laporanmu"
                  value={search}
                  onChangeText={setSearch}
                  onSubmitEditing={submitSearch}
                  returnKeyType="search"
                />
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cari laporan"
                onPress={submitSearch}
                style={[styles.filterTrigger, { minHeight: 48 }]}
              >
                <Ionicons
                  name="search-outline"
                  size={22}
                  color={colors.accent}
                />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Buat laporan baru"
                onPress={() => router.push("/new-report")}
                style={[
                  styles.filterTrigger,
                  { minHeight: 48, backgroundColor: colors.accent },
                ]}
              >
                <Ionicons name="add" size={24} color="#fff" />
              </Pressable>
            </View>
            {!!query && (
              <Button
                secondary
                title={`Hapus pencarian: ${query}`}
                onPress={() => {
                  setSearch("");
                  setQuery("");
                  setPage(1);
                }}
              />
            )}
            <ErrorText message={error} />
            {!!error && <Button title="Coba lagi" secondary onPress={load} />}
          </View>
        }
        ListEmptyComponent={
          busy ? (
            <PostSkeleton />
          ) : !error ? (
            <View style={styles.panel}>
              <Text style={styles.heading}>
                {query || filters.status
                  ? "Tidak ada laporan yang cocok."
                  : "Belum ada laporan."}
              </Text>
              <Text style={styles.text}>
                {query || filters.status
                  ? "Ubah pencarian atau hapus filter untuk melihat laporan lainnya."
                  : "Ambil foto sampah atau pilih dari galeri. Kategori dikenali otomatis."}
              </Text>
              {query || filters.status ? (
                <Button
                  secondary
                  title="Hapus pencarian dan filter"
                  onPress={() => {
                    setSearch("");
                    setQuery("");
                    setFilters(emptyFilters);
                    setPage(1);
                  }}
                />
              ) : (
                <Button
                  title="Buat laporan"
                  onPress={() => router.push("/new-report")}
                />
              )}
            </View>
          ) : undefined
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Laporan ${categoryName(item.category)}`}
            onPress={() => router.push(`/report/${item.id}`)}
            style={[styles.panel, styles.row, { padding: 14 }]}
          >
            <Image
              source={{ uri: item.thumbnail_url || item.image_url }}
              style={{ width: 64, height: 76, borderRadius: 9 }}
              accessibilityLabel={`Foto ${categoryName(item.category)}`}
            />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[styles.heading, { fontSize: 16, lineHeight: 24 }]}>
                {categoryName(item.category)}
              </Text>
              <Text style={styles.text} numberOfLines={2}>
                {item.description}
              </Text>
              <Text style={styles.label}>
                {new Date(item.created_at).toLocaleDateString("id-ID")} ·{" "}
                {statusName[item.status]}
              </Text>
              {item.classification_state === "needs_review" && (
                <Text style={styles.label}>Perlu review AI</Text>
              )}
            </View>
          </Pressable>
        )}
        ListFooterComponent={
          rows.length > 0 && pages > 1 ? (
            <View style={{ gap: 12, paddingTop: 8 }}>
              <Text style={styles.label}>
                Halaman {page} dari {pages}
              </Text>
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
          ) : undefined
        }
      />
    </SafeAreaView>
  );
}
