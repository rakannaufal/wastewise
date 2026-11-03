import { useCallback, useEffect, useRef, useState } from "react";
import { Modal, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MapView, { Marker } from "react-native-maps";
import type { Region as MapRegion } from "react-native-maps";
import { router, useFocusEffect } from "expo-router";
import { api } from "./api";
import type { MapPoints, Post } from "../../shared/community";
import { Button, categoryName, ErrorText, statusName, styles } from "./ui";
type Focus = { latitude: number; longitude: number };
export default function CommunityMap({
  query,
  focus,
}: {
  query: string;
  focus?: Focus;
}) {
  const map = useRef<MapView>(null);
  const [view, setView] = useState<MapRegion>({
    latitude: -2.5,
    longitude: 118,
    latitudeDelta: 18,
    longitudeDelta: 35,
  });
  const [points, setPoints] = useState<MapPoints | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  const [list, setList] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [post, setPost] = useState<Post | null>(null);
  const [postError, setPostError] = useState("");
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  useFocusEffect(
    useCallback(() => {
      reload();
      const timer = setInterval(reload, 60000);
      return () => clearInterval(timer);
    }, [reload]),
  );
  const focusLat = focus?.latitude,
    focusLng = focus?.longitude;
  useEffect(() => {
    if (focusLat === undefined || focusLng === undefined) return;
    const next = {
      latitude: focusLat,
      longitude: focusLng,
      latitudeDelta: 0.015,
      longitudeDelta: 0.015,
    };
    map.current?.animateToRegion(next);
    setView(next);
  }, [focusLat, focusLng]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
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
          if (!controller.signal.aborted) setPoints(r);
        })
        .catch((e) => {
          if (!controller.signal.aborted) setError((e as Error).message);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [view, query, version]);
  useEffect(() => {
    setSelected(null);
    setPost(null);
    setPoints(null);
  }, [query]);
  useEffect(() => {
    setPost(null);
    setPostError("");
    if (!selected) return;
    const controller = new AbortController();
    api<Post>(`/api/v1/community/posts/${selected}`, {
      signal: controller.signal,
    })
      .then((p) => {
        if (!controller.signal.aborted) setPost(p);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setPostError((e as Error).message);
      });
    return () => controller.abort();
  }, [selected]);
  function zoomTo(p: MapPoints["features"][number]) {
    map.current?.animateToRegion({
      latitude: p.latitude,
      longitude: p.longitude,
      latitudeDelta: view.latitudeDelta / 3,
      longitudeDelta: view.longitudeDelta / 3,
    });
  }
  return (
    <View style={{ flex: 1 }}>
      <MapView
        ref={map}
        style={{ flex: 1 }}
        initialRegion={view}
        onRegionChangeComplete={setView}
      >
        {points?.features.map((p, i) => (
          <Marker
            key={`${p.longitude}-${p.latitude}-${i}`}
            coordinate={{ latitude: p.latitude, longitude: p.longitude }}
            title={p.count > 1 ? `${p.count} laporan` : "Laporan sampah"}
            pinColor="#215B3C"
            onPress={() => (p.post_id ? setSelected(p.post_id) : zoomTo(p))}
          />
        ))}
      </MapView>
      <View style={{ position: "absolute", right: 12, top: 12 }}>
        <Button secondary title="Daftar lokasi" onPress={() => setList(true)} />
      </View>
      <View
        style={[
          styles.panel,
          {
            position: "absolute",
            left: 12,
            right: 12,
            bottom: 28,
            padding: 14,
            gap: 8,
          },
        ]}
      >
        <ErrorText message={error} />
        {error && (
          <Button secondary title="Muat ulang titik" onPress={reload} />
        )}
        {selected ? (
          <>
            <Text style={styles.heading}>
              {post ? categoryName(post.category) : "Lokasi laporan"}
            </Text>
            <ErrorText message={postError} />
            {post && (
              <>
                <Text style={styles.label}>{statusName[post.status]}</Text>
                <Text numberOfLines={2} style={styles.text}>
                  {post.caption}
                </Text>
                <Button
                  title="Lihat laporan"
                  onPress={() => router.push(`/post/${post.id}`)}
                />
              </>
            )}
            <Button
              secondary
              title="Tutup ringkasan"
              onPress={() => setSelected(null)}
            />
          </>
        ) : (
          <Text style={styles.text}>
            {loading
              ? "Memuat titik…"
              : `${points?.features.length || 0} titik atau kelompok di area ini.`}{" "}
            {points?.truncated
              ? "Perbesar untuk titik lainnya."
              : "Ketuk titik untuk melihat laporan."}
          </Text>
        )}
      </View>
      <Modal
        visible={list}
        animationType="slide"
        onRequestClose={() => setList(false)}
      >
        <SafeAreaView style={[styles.screen, { padding: 20, gap: 16 }]}>
          <Text style={styles.heading}>Daftar lokasi</Text>
          <Text style={styles.text}>
            Hanya posting yang dibagikan. Semua status tampil kecuali kamu
            menerapkan filter.
          </Text>
          <ScrollView contentContainerStyle={{ gap: 12 }}>
            <ErrorText message={error} />
            {!loading && !error && !points?.features.length && (
              <Text style={styles.text}>
                Belum ada titik pada area atau filter ini.
              </Text>
            )}
            {points?.features.map((p, i) => (
              <View key={i} style={styles.panel}>
                <Text style={styles.text}>
                  {p.count} laporan · {p.latitude.toFixed(5)},{" "}
                  {p.longitude.toFixed(5)}
                </Text>
                <Button
                  secondary
                  title={p.post_id ? "Lihat laporan" : "Perbesar kelompok"}
                  onPress={() => {
                    setList(false);
                    if (p.post_id) router.push(`/post/${p.post_id}`);
                    else zoomTo(p);
                  }}
                />
              </View>
            ))}
          </ScrollView>
          <Button
            secondary
            title="Kembali ke peta"
            onPress={() => setList(false)}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}
