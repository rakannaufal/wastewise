import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import type { Region as MapRegion } from "react-native-maps";
import { router } from "expo-router";
import { api } from "./api";
import type { MapPoints } from "../../shared/community";
import { ErrorText, styles } from "./ui";
export default function CommunityMap({ query }: { query: string }) {
  const map = useRef<MapView>(null);
  const [view, setView] = useState<MapRegion>({
    latitude: -2.5,
    longitude: 118,
    latitudeDelta: 18,
    longitudeDelta: 35,
  });
  const [points, setPoints] = useState<MapPoints | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    const west = Math.max(-180, view.longitude - view.longitudeDelta / 2),
      east = Math.min(180, view.longitude + view.longitudeDelta / 2),
      south = Math.max(-90, view.latitude - view.latitudeDelta / 2),
      north = Math.min(90, view.latitude + view.latitudeDelta / 2);
    const zoom = Math.max(
      2,
      Math.min(20, Math.floor(Math.log2(360 / view.longitudeDelta))),
    );
    const timer = setTimeout(() => {
      api<MapPoints>(
        `/api/v1/community/map?bbox=${[west, south, east, north]}&zoom=${zoom}&${query}`,
        { signal: controller.signal },
      )
        .then((r) => {
          setPoints(r);
          setError("");
        })
        .catch((e) => {
          if (!controller.signal.aborted) setError((e as Error).message);
        });
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [view, query]);
  return (
    <View style={{ gap: 12 }}>
      <ErrorText message={error} />
      <MapView
        ref={map}
        style={{ height: 430, width: "100%", borderRadius: 16 }}
        initialRegion={view}
        onRegionChangeComplete={setView}
        onMapReady={() => setError("")}
      >
        {points?.features.map((p, i) => (
          <Marker
            key={`${p.longitude}-${p.latitude}-${i}`}
            coordinate={{ latitude: p.latitude, longitude: p.longitude }}
            title={p.count > 1 ? `${p.count} laporan` : "Laporan sampah"}
            description="Tekan untuk melihat"
            pinColor="#215B3C"
            onPress={() => {
              if (p.post_id) router.push(`/post/${p.post_id}`);
              else
                map.current?.animateToRegion({
                  latitude: p.latitude,
                  longitude: p.longitude,
                  latitudeDelta: view.latitudeDelta / 3,
                  longitudeDelta: view.longitudeDelta / 3,
                });
            }}
          />
        ))}
      </MapView>
      <Text style={styles.text}>
        {points?.features.length || 0} titik atau kelompok.{" "}
        {points?.truncated
          ? "Perbesar area untuk titik lainnya."
          : "Tekan kelompok untuk memperbesar."}
      </Text>
      <Text style={styles.label}>
        Peta memerlukan internet. Koordinat hanya berasal dari laporan yang
        dibagikan.
      </Text>
    </View>
  );
}
