import { useState } from "react";
import { FlatList, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useFeed, emptyFilters } from "../../src/community";
import { filterCount } from "../../../shared/filters";
import CommunityFilters from "../../src/CommunityFilters";
import PostCard, { PostSkeleton } from "../../src/PostCard";
import { Button, ErrorText, styles } from "../../src/ui";
export default function Home() {
  const [filters, setFilters] = useState(emptyFilters);
  const feed = useFeed(filters);
  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      <FlatList
        data={feed.posts}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 40,
          width: "100%",
          maxWidth: 760,
          alignSelf: "center",
        }}
        renderItem={({ item }) => <PostCard post={item} reload={feed.reload} />}
        refreshing={feed.loading}
        onRefresh={feed.reload}
        initialNumToRender={4}
        maxToRenderPerBatch={4}
        windowSize={5}
        ListHeaderComponent={
          <View style={{ gap: 12, marginBottom: 20 }}>
            <CommunityFilters value={filters} onChange={setFilters} />
            <Text style={styles.text}>Foto dan kabar dari lingkunganmu.</Text>
            <ErrorText message={feed.error} />
            {!!feed.error && (
              <Button secondary title="Muat ulang" onPress={feed.reload} />
            )}
          </View>
        }
        ListEmptyComponent={
          feed.loading ? (
            <PostSkeleton />
          ) : !feed.error ? (
            <View style={styles.panel}>
              <Text style={styles.heading}>
                {filterCount(filters)
                  ? "Belum ada posting yang cocok."
                  : "Belum ada posting komunitas."}
              </Text>
              <Text style={styles.text}>
                {filterCount(filters)
                  ? "Coba ubah atau hapus filter untuk melihat posting lainnya."
                  : "Laporan publik Menunggu, Diproses, dan Selesai muncul di sini. Laporan Ditolak tidak ditampilkan."}
              </Text>
              {filterCount(filters) > 0 && (
                <Button
                  secondary
                  title="Hapus semua filter"
                  onPress={() => setFilters(emptyFilters)}
                />
              )}
              <Button
                title="Buat laporan"
                onPress={() => router.push("/new-report")}
              />
            </View>
          ) : undefined
        }
        ListFooterComponent={
          feed.cursor ? (
            <View style={{ gap: 12 }}>
              <ErrorText message={feed.pageError} />
              <Button
                secondary
                disabled={feed.loadingMore || feed.loading}
                title={
                  feed.loadingMore
                    ? "Memuat…"
                    : feed.pageError
                      ? "Coba muat berikutnya"
                      : "Lihat berikutnya"
                }
                onPress={() => void feed.more()}
              />
            </View>
          ) : undefined
        }
      />
    </SafeAreaView>
  );
}
