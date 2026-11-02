import { useCallback, useRef, useState } from "react";
import { Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { api } from "../../src/api";
import { useSession } from "../../src/session";
import { Button, ErrorText, Screen, styles } from "../../src/ui";
export default function Home() {
  const { user, logout } = useSession();
  const [summary, setSummary] = useState<{
    total_reports: number;
    by_status: Record<string, number>;
  } | null>(null);
  const [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);
  const load = useCallback(() => {
    controller.current?.abort(); const abort = new AbortController(); controller.current = abort;
    setError("");
    api<{ total_reports: number; by_status: Record<string, number> }>(
      "/api/v1/stats/summary",
      { signal: abort.signal },
    )
      .then((value) => { if (!abort.signal.aborted) setSummary(value); })
      .catch((e) => { if (!abort.signal.aborted) setError(e.message); });
  }, [user?.id]);
  useFocusEffect(useCallback(() => { setSummary(null); load(); return () => controller.current?.abort(); }, [load]));
  return (
    <Screen>
      <Text style={[styles.heading, { color: "#215B3C" }]}>WasteWise.</Text>
      <Text style={styles.title}>
        Langkah baik,{"\n"}
        {user?.full_name.split(" ")[0]}.
      </Text>
      <Text style={styles.text}>
        Sampah terpilah dimulai dari keputusan kecil hari ini.
      </Text>
      <ErrorText message={error} />
      {error ? <Button title="Coba lagi" secondary onPress={load} /> : null}
      <View style={[styles.panel, { backgroundColor: "#E8EFE2" }]}>
        <Text style={styles.label}>TOTAL LAPORAN</Text>
        <Text style={[styles.title, { fontSize: 42 }]}>
          {summary?.total_reports ?? "…"}
        </Text>
        <Text style={styles.text}>
          {user?.role === "admin" ? "Seluruh laporan masuk" : "Laporan milikmu"}
        </Text>
      </View>
      <View style={styles.row}>
        <View style={[styles.panel, { flex: 1 }]}>
          <Text style={styles.label}>Menunggu</Text>
          <Text style={styles.heading}>
            {summary?.by_status.Pending ?? "…"}
          </Text>
        </View>
        <View style={[styles.panel, { flex: 1 }]}>
          <Text style={styles.label}>Selesai</Text>
          <Text style={styles.heading}>
            {summary?.by_status.Completed ?? "…"}
          </Text>
        </View>
      </View>
      <Button title="Buat laporan" onPress={() => router.push("/new-report")} />
      <View style={styles.action}>
        <Text style={styles.heading}>Foto. Kenali. Pilah.</Text>
        <Text style={styles.text}>
          Perkiraan kategori dari foto, disertai panduan tindakan.
        </Text>
        <Button
          secondary
          title="Klasifikasi foto"
          onPress={() => router.push("/classify")}
        />
      </View>
      <Button
        secondary
        title="Keluar dari akun"
        onPress={() => {
          void logout();
        }}
      />
    </Screen>
  );
}
