import { useCallback, useRef, useState } from "react";
import { AppState, Linking, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Location from "expo-location";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { pickPhoto } from "../src/photo";
import { setCapture } from "../src/draft";
import { Button, ErrorText, Screen, styles } from "../src/ui";

export default function Camera() {
  const { origin } = useLocalSearchParams<{ origin?: string }>();
  const camera = useRef<CameraView | null>(null);
  const fix = useRef<Location.LocationObject | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [active, setActive] = useState(true);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [gps, setGps] = useState("GPS sedang diperoleh…");
  const [error, setError] = useState("");
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      let watch: Location.LocationSubscription | null = null;
      let generation = 0;
      const stop = () => {
        generation++;
        watch?.remove();
        watch = null;
        fix.current = null;
        setReady(false);
      };
      async function locate() {
        const version = ++generation;
        try {
          const grant = await Location.requestForegroundPermissionsAsync();
          if (!grant.granted)
            throw new Error(
              "GPS belum diizinkan. Foto tetap bisa diklasifikasi; laporan memerlukan lokasi.",
            );
          const subscription = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.High,
              timeInterval: 1000,
              distanceInterval: 1,
            },
            (value) => {
              if (alive && version === generation) {
                fix.current = value;
                setGps(
                  value.coords.accuracy !== null && value.coords.accuracy <= 50
                    ? `GPS ±${Math.round(value.coords.accuracy)} m`
                    : "GPS belum cukup akurat; coba tempat terbuka.",
                );
              }
            },
          );
          if (
            !alive ||
            version !== generation ||
            AppState.currentState !== "active"
          )
            subscription.remove();
          else watch = subscription;
        } catch (e) {
          if (alive) setGps((e as Error).message);
        }
      }
      setActive(AppState.currentState === "active");
      void locate();
      const listener = AppState.addEventListener("change", (state) => {
        setActive(state === "active");
        stop();
        if (state === "active") void locate();
      });
      return () => {
        alive = false;
        stop();
        listener.remove();
      };
    }, []),
  );
  async function gallery() {
    setBusy(true);
    setError("");
    try {
      const photo = await pickPhoto();
      if (photo) {
        setCapture(photo);
        if (origin === "tab") router.replace("/new-report");
        else router.back();
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function take() {
    if (!camera.current || !ready) return;
    setBusy(true);
    setError("");
    try {
      const stamp = Date.now();
      const position = fix.current;
      const photo = await camera.current.takePictureAsync({ quality: 0.9 });
      const good =
        position &&
        Math.abs(stamp - position.timestamp) <= 30000 &&
        position.coords.accuracy !== null &&
        position.coords.accuracy <= 50;
      setCapture({
        uri: photo.uri,
        width: photo.width,
        height: photo.height,
        name: "sampah.jpg",
        type: "image/jpeg",
        source: "camera",
        capturedAt: new Date(stamp).toISOString(),
        location: good
          ? {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              location_source: "device_capture",
              location_recorded_at: new Date(position.timestamp).toISOString(),
              location_accuracy_m: position.coords.accuracy,
            }
          : null,
      });
      if (origin === "tab") router.replace("/new-report");
      else router.back();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen>
      <Text style={styles.title}>Foto sampah</Text>
      <Text style={styles.text}>
        Satu objek dominan. Gunakan cahaya cukup dan latar sederhana.
      </Text>
      {!permission?.granted ? (
        <>
          <Button
            title="Izinkan kamera"
            onPress={() => {
              void requestPermission();
            }}
          />
          <Button
            secondary
            title="Buka pengaturan izin"
            onPress={() => {
              void Linking.openSettings();
            }}
          />
        </>
      ) : (
        <View style={{ height: 380, overflow: "hidden", borderRadius: 16 }}>
          {active && (
            <CameraView
              ref={camera}
              style={{ flex: 1 }}
              facing="back"
              onCameraReady={() => setReady(true)}
            />
          )}
        </View>
      )}
      <Text style={styles.text}>{gps}</Text>
      <ErrorText message={error} />
      <Button
        title={busy ? "Mengambil foto…" : "Ambil foto"}
        disabled={!permission?.granted || !active || !ready || busy}
        onPress={() => {
          void take();
        }}
      />
      <Button
        secondary
        title="Pilih dari galeri"
        disabled={busy}
        onPress={() => void gallery()}
      />
      <Button secondary title="Batal" onPress={() => router.back()} />
    </Screen>
  );
}
