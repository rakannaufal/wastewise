import { useEffect, useState } from "react";
import { Linking, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { api } from "./api";
import type { MapPoints } from "../../shared/community";
import { Button, ErrorText, styles } from "./ui";
export default function CommunityMap({
  query,
}: {
  query: string;
  focus?: { latitude: number; longitude: number };
}) {
  const [points, setPoints] = useState<MapPoints | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    api<MapPoints>(`/api/v1/community/map?${query}`, {
      signal: controller.signal,
    })
      .then(setPoints)
      .catch((e) => {
        if (!controller.signal.aborted) setError((e as Error).message);
      });
    return () => controller.abort();
  }, [query]);
  return (
    <ScrollView contentContainerStyle={{ gap: 12, padding: 16 }}>
      <Text style={styles.heading}>Lokasi laporan komunitas</Text>
      <Text style={styles.text}>
        Expo web menampilkan daftar lokasi. Peta interaktif tersedia di aplikasi
        iOS/Android dan website WasteWise.
      </Text>
      <ErrorText message={error} />
      {points?.features.map((p, i) => (
        <View style={styles.panel} key={i}>
          <Text style={styles.text}>
            {p.count} laporan · {p.latitude.toFixed(5)},{" "}
            {p.longitude.toFixed(5)}
          </Text>
          {p.post_id ? (
            <Button
              title="Lihat laporan"
              onPress={() => router.push(`/post/${p.post_id}`)}
            />
          ) : (
            <Button
              secondary
              title="Buka area di OpenStreetMap"
              onPress={() =>
                void Linking.openURL(
                  `https://www.openstreetmap.org/#map=14/${p.latitude}/${p.longitude}`,
                )
              }
            />
          )}
        </View>
      ))}
    </ScrollView>
  );
}
