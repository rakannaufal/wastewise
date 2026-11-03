import ShareReport from "../../src/ShareReport";
import { useCallback, useRef, useState } from "react";
import { Alert, Image, Linking, Platform, Text, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { api } from "../../src/api";
import { useSession } from "../../src/session";
import type { Report, ReportEvent, Status } from "../../../shared/contracts";
import { locationNames, transitions } from "../../../shared/contracts";
import {
  Action,
  Button,
  categories,
  categoryName,
  ErrorText,
  Input,
  Loading,
  Screen,
  statusName,
  styles,
} from "../../src/ui";

export default function Detail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useSession();
  const [row, setRow] = useState<Report | null>(null);
  const [events, setEvents] = useState<ReportEvent[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState("");
  const [reviewCategory, setReviewCategory] = useState("");
  const [reviewReason, setReviewReason] = useState("");
  const controller = useRef<AbortController | null>(null);
  const load = useCallback(() => {
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    setError("");
    Promise.all([
      api<Report>(`/api/v1/reports/${id}`, { signal: abort.signal }),
      api<ReportEvent[]>(`/api/v1/reports/${id}/events`, {
        signal: abort.signal,
      }),
    ])
      .then(([report, history]) => {
        if (!abort.signal.aborted) {
          setRow(report);
          setEvents(history);
        }
      })
      .catch((e) => {
        if (!abort.signal.aborted) setError(e.message);
      });
  }, [id, user?.id]);
  useFocusEffect(
    useCallback(() => {
      setRow(null);
      load();
      return () => controller.current?.abort();
    }, [load]),
  );
  async function mutate(path: string, body?: object, method = "PATCH") {
    setBusy(true);
    setError("");
    try {
      await api(`/api/v1/reports/${id}${path}`, {
        method,
        ...(body && { body: JSON.stringify(body) }),
      });
      if (method === "DELETE") router.replace("/reports");
      else {
        setReason("");
        setReviewReason("");
        load();
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function remove() {
    const message =
      "Laporan akan dihapus. Foto dijadwalkan untuk dihapus. Tindakan ini tidak dapat dibatalkan.";
    if (Platform.OS === "web") {
      if (window.confirm(message)) void mutate("", undefined, "DELETE");
    } else
      Alert.alert("Hapus laporan?", message, [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus",
          style: "destructive",
          onPress: () => {
            void mutate("", undefined, "DELETE");
          },
        },
      ]);
  }
  const stamp = (value: string) => new Date(value).toLocaleString("id-ID");
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
            {statusName[row.status]} · {stamp(row.created_at)}
          </Text>
          <Image
            source={{ uri: row.image_url }}
            style={styles.photo}
            resizeMode="contain"
            accessibilityLabel="Foto laporan sampah"
          />
          <Action category={row.category} />
          <Text style={styles.heading}>Catatan laporan</Text>
          <Text style={styles.text}>{row.description}</Text>
          <Text style={styles.text}>Pelapor: {row.user_name}</Text>
          <View style={styles.panel}>
            <Text style={styles.heading}>Lokasi laporan</Text>
            <Text style={styles.text}>
              {locationNames[row.location_source] || row.location_source}
            </Text>
            <Text style={styles.text}>
              {row.latitude.toFixed(6)}, {row.longitude.toFixed(6)}
            </Text>
            <Text style={styles.text}>
              {row.location_accuracy_m !== null
                ? `Akurasi ±${row.location_accuracy_m} m. `
                : ""}
              {row.location_recorded_at
                ? stamp(row.location_recorded_at)
                : "Waktu lokasi tidak tersedia."}
            </Text>
            {row.captured_at && (
              <Text style={styles.text}>
                Foto diambil {stamp(row.captured_at)}
              </Text>
            )}
            <Button
              secondary
              title="Lihat lokasi di peta"
              onPress={() => {
                Linking.openURL(
                  `https://www.openstreetmap.org/?mlat=${row.latitude}&mlon=${row.longitude}#map=18/${row.latitude}/${row.longitude}`,
                ).catch(() => setError("Peta tidak dapat dibuka."));
              }}
            />
          </View>
          <Text style={styles.text}>
            Prediksi AI asli:{" "}
            {row.ai_predicted_category
              ? `${categoryName(row.ai_predicted_category)} · ${row.ai_confidence?.toFixed(1)}% · ${row.ai_model_version}`
              : "Tidak tersedia pada laporan lama"}
          </Text>
          <Text style={styles.text}>
            {row.classification_state === "needs_review"
              ? "Perlu review kategori oleh admin"
              : row.classification_state === "reviewed"
                ? "Kategori sudah ditinjau admin"
                : "Kategori hasil otomatis / data lama"}
          </Text>
          {(user?.role === "admin" || row.status === "Pending") && (
            <Button
              secondary
              title="Edit deskripsi / ganti foto"
              onPress={() =>
                router.push({
                  pathname: "/new-report",
                  params: { edit: row.id },
                })
              }
            />
          )}
          {user?.role === "admin" && (
            <View style={styles.panel}>
              <Text style={styles.heading}>Penanganan laporan</Text>
              <Input
                label="Alasan perubahan (wajib untuk penolakan / buka ulang)"
                value={reason}
                onChangeText={setReason}
                multiline
                maxLength={1000}
              />
              {transitions[row.status].map((status: Status) => (
                <Button
                  key={status}
                  secondary
                  title={`Ubah ke ${statusName[status]}`}
                  disabled={
                    busy ||
                    ((status === "Rejected" ||
                      row.status === "Completed" ||
                      row.status === "Rejected") &&
                      reason.trim().length < 5)
                  }
                  onPress={() => {
                    void mutate("/status", {
                      status,
                      revision: row.revision,
                      reason,
                    });
                  }}
                />
              ))}
            </View>
          )}
          {user?.role === "admin" && (
            <View style={styles.panel}>
              <Text style={styles.heading}>Review kategori</Text>
              <Text style={styles.text}>
                Koreksi admin menyimpan prediksi asli AI.
              </Text>
              <View style={{ gap: 8, flexDirection: "row", flexWrap: "wrap" }}>
                {categories.map((c) => (
                  <Button
                    key={c.id}
                    secondary
                    title={`${(reviewCategory || row.category) === c.id ? "Dipilih: " : ""}${c.name}`}
                    disabled={busy}
                    onPress={() => setReviewCategory(c.id)}
                  />
                ))}
              </View>
              <Input
                label="Alasan review"
                value={reviewReason}
                onChangeText={setReviewReason}
                multiline
                maxLength={1000}
              />
              <Button
                title="Simpan review"
                disabled={busy || reviewReason.trim().length < 5}
                onPress={() => {
                  void mutate("/review", {
                    category: reviewCategory || row.category,
                    revision: row.revision,
                    reason: reviewReason,
                  });
                }}
              />
            </View>
          )}
          <View style={styles.panel}>
            <Text style={styles.heading}>Riwayat laporan</Text>
            {events.length ? (
              events.map((event) => (
                <View key={event.id} style={{ gap: 6 }}>
                  <Text style={styles.label}>
                    {{
                      created: "Laporan dibuat",
                      edited: "Laporan diedit",
                      status_changed: "Status berubah",
                      category_reviewed: "Kategori diperiksa",
                    }[event.kind] || event.kind}
                  </Text>
                  <Text style={styles.text}>
                    {event.details.from
                      ? `${statusName[String(event.details.from)] || categoryName(String(event.details.from))} → `
                      : ""}
                    {event.details.to
                      ? statusName[String(event.details.to)] ||
                        categoryName(String(event.details.to))
                      : ""}
                    {event.reason ? ` · ${event.reason}` : ""}
                  </Text>
                  <Text style={styles.label}>
                    {event.actor_name || "Akun terhapus"} ·{" "}
                    {stamp(event.created_at)}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.text}>
                Laporan lama belum memiliki riwayat terperinci.
              </Text>
            )}
          </View>
          <Button
            secondary
            title="Perbarui data"
            disabled={busy}
            onPress={load}
          />
          <Button
            title={busy ? "Memproses…" : "Hapus laporan"}
            disabled={busy}
            onPress={remove}
          />
          {row.user_id === user?.id && <ShareReport report={row} />}
        </>
      )}
    </Screen>
  );
}
