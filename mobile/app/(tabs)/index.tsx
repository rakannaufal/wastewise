import { useState } from "react";
import { FlatList, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useFeed, emptyFilters } from "../../src/community";
import CommunityFilters from "../../src/CommunityFilters";
import PostCard from "../../src/PostCard";
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
          padding: 18,
          paddingBottom: 35,
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
          <View style={{ gap: 16, marginBottom: 22 }}>
            <Text
              style={[
                styles.title,
                { fontFamily: "Caveat_700", fontSize: 40, lineHeight: 48 },
              ]}
            >
              Kabar dari sekitar.
            </Text>
            <Text style={styles.text}>
              Foto, cerita, dan langkah baik di lingkunganmu.
            </Text>
            <CommunityFilters value={filters} onChange={setFilters} />
            <ErrorText message={feed.error} />
            {feed.error && (
              <Button secondary title="Muat ulang" onPress={feed.reload} />
            )}
          </View>
        }
        ListEmptyComponent={
          !feed.loading && !feed.error ? (
            <View style={styles.panel}>
              <Text style={styles.heading}>Belum ada cerita di sini.</Text>
              <Text style={styles.text}>
                Coba wilayah lain atau bagikan laporan pertamamu. Laporan privat
                tidak muncul di beranda.
              </Text>
              <Button
                title="Buat laporan"
                onPress={() => router.push("/new-report")}
              />
            </View>
          ) : undefined
        }
        ListFooterComponent={
          feed.cursor ? (
            <Button
              secondary
              disabled={feed.loading}
              title={feed.loading ? "Memuat…" : "Lihat berikutnya"}
              onPress={() => void feed.more()}
            />
          ) : undefined
        }
      />
    </SafeAreaView>
  );
}
