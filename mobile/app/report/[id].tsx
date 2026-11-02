import { useCallback, useState } from "react";
import { Alert, Image, Linking, Platform, Text, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { api } from "../../src/api";
import type { Report } from "../../src/api";
import { useSession } from "../../src/session";
import {
  Action,
  Button,
  categoryName,
  ErrorText,
  Loading,
  Screen,
  statusName,
  styles,
} from "../../src/ui";
export default function Detail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useSession();
  const [row, setRow] = useState<Report | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => {
    setError("");
    api<Report>(`/api/v1/reports/${id}`)
      .then(setRow)
      .catch((e) => setError(e.message));
  }, [id]);
  useFocusEffect(load);
  async function remove() {
    setBusy(true);
    try {
      await api(`/api/v1/reports/${id}`, { method: "DELETE" });
      router.replace("/reports");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function confirm() {
    if (Platform.OS === "web") {
      if (
        window.confirm(
          "Hapus laporan dan jadwalkan penghapusan foto? Tindakan ini tidak dapat dibatalkan.",
        )
      )
        void remove();
    } else
      Alert.alert(
        "Hapus laporan?",
        "Laporan akan dihapus. Foto dijadwalkan untuk dihapus. Tindakan ini tidak dapat dibatalkan.",
        [
          { text: "Batal", style: "cancel" },
          {
            text: "Hapus",
            style: "destructive",
            onPress: () => {
              void remove();
            },
          },
        ],
      );
  }
  return (
    <Screen>
      <Button
        secondary
        title="Kembali ke laporan"
        onPress={() => router.replace("/reports")}
      />
      <ErrorText message={error} />
      {!row ? (
        error ? (
          <Button title="Coba lagi" onPress={load} />
        ) : (
          <Loading />
        )
      ) : (
        <>
          <Text style={styles.title}>{categoryName(row.category)}</Text>
          <Text style={styles.label}>
            {statusName[row.status]} ·{" "}
            {new Date(row.created_at).toLocaleDateString("id-ID")}
          </Text>
          <Image
            source={{ uri: row.image_url }}
            style={styles.photo}
            resizeMode="contain"
          />
          <Action category={row.category} />
          <Text style={styles.heading}>Catatan laporan</Text>
          <Text style={styles.text}>{row.description}</Text>
          <Text style={styles.text}>Pelapor: {row.user_name}</Text>
          <Text style={styles.text}>
            {row.latitude.toFixed(6)}, {row.longitude.toFixed(6)}
          </Text>
          <Button
            secondary
            title="Lihat lokasi di peta"
            onPress={() => {
              Linking.openURL(
                `https://www.openstreetmap.org/?mlat=${row.latitude}&mlon=${row.longitude}#map=18/${row.latitude}/${row.longitude}`,
              ).catch(() => setError("Peta tidak dapat dibuka."));
            }}
          />
          <Text style={styles.text}>
            Prediksi AI:{" "}
            {row.ai_predicted_category
              ? `${categoryName(row.ai_predicted_category)} · ${row.ai_confidence?.toFixed(1)}%`
              : "Tidak tersedia; kategori manual"}
          </Text>
          {user?.role === "admin" && (
            <View style={{ gap: 10 }}>
              <Text style={styles.heading}>Ubah status</Text>
              {Object.entries(statusName).map(([value, label]) => (
                <Button
                  key={value}
                  secondary
                  title={`${row.status === value ? "✓ " : ""}${label}`}
                  disabled={busy}
                  onPress={async () => {
                    setBusy(true);
                    try {
                      await api(`/api/v1/reports/${id}/status`, {
                        method: "PATCH",
                        body: JSON.stringify({ status: value }),
                      });
                      load();
                    } catch (e) {
                      setError((e as Error).message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                />
              ))}
            </View>
          )}
          <Button secondary title="Perbarui foto dan detail" onPress={load} />
          <Button
            title={busy ? "Memproses…" : "Hapus laporan"}
            disabled={busy}
            onPress={confirm}
          />
        </>
      )}
    </Screen>
  );
}
