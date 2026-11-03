import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Text,
  View,
} from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { randomUUID } from "expo-crypto";
import { api } from "./api";
import { useSession } from "./session";
import {
  consumeCapture,
  deletePhoto,
  loadDraft,
  removeDraft,
  saveDraft,
} from "./draft";
import { appendPhoto, pickPhoto, preparePhoto } from "./photo";
import type { Photo } from "./photo";
import type {
  LocationEvidence,
  PhotoDraft,
  Report,
} from "../../shared/contracts";
import { locationNames } from "../../shared/contracts";
import { currentLocation } from "./location";
import {
  Action,
  Button,
  categoryName,
  ErrorText,
  Input,
  Screen,
  styles,
} from "./ui";

export function ReportComposer({
  title = "Foto dan laporkan",
}: {
  title?: string;
}) {
  const { user } = useSession();
  const params = useLocalSearchParams<{ edit?: string }>();
  const editId = params.edit || "";
  const owner = user?.id || "";
  const [stored] = useState(() => loadDraft(owner, editId));
  const [photo, setPhoto] = useState<Photo | null>(stored?.photo || null);
  const [draft, setDraft] = useState<PhotoDraft | null>(stored?.remote || null);
  const [description, setDescription] = useState(stored?.description || "");
  const [original, setOriginal] = useState<Report | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [gpsError, setGpsError] = useState("");
  const generation = useRef(0);
  const abort = useRef<AbortController | null>(null);
  const ids = useRef({
    requestId: stored?.requestId || randomUUID(),
    finalKey: stored?.finalKey || randomUUID(),
  });
  const expiry = useRef(stored?.expiresAt || Date.now() + 86400000);
  const submitted = useRef(false);
  useEffect(() => {
    if (submitted.current || !owner || (!photo && !draft)) return;
    try {
      saveDraft(owner, editId, {
        photo,
        remote: draft,
        description,
        ...ids.current,
        expiresAt: expiry.current,
      });
    } catch {
      setError(
        "Draft lokal belum dapat disimpan. Jangan tutup aplikasi sebelum laporan terkirim.",
      );
    }
  }, [owner, editId, photo, draft, description]);
  useEffect(() => {
    let active = true;
    if (editId)
      api<Report>(`/api/v1/reports/${editId}`)
        .then((row) => {
          if (active) {
            setOriginal(row);
            if (!stored) setDescription(row.description);
          }
        })
        .catch((e) => {
          if (active) setError(e.message);
        });
    if (stored?.remote)
      api<PhotoDraft>(`/api/v1/report-drafts/${stored.remote.id}`)
        .then((row) => {
          if (active) setDraft(row);
        })
        .catch((e) => {
          if (active) {
            setError(e.message);
            setDraft(null);
          }
        });
    return () => {
      active = false;
    };
  }, [editId, stored]);
  async function analyze(value: Photo, version: number, requestId: string) {
    setError("");
    const controller = new AbortController();
    abort.current = controller;
    try {
      const form = new FormData();
      await appendPhoto(form, value);
      form.append("request_id", requestId);
      form.append("photo_source", value.source);
      if (value.capturedAt) form.append("captured_at", value.capturedAt);
      let row = await api<PhotoDraft>("/api/v1/report-drafts", {
        method: "POST",
        body: form,
        signal: controller.signal,
      });
      if (version === generation.current) setDraft(row);
      if (value.location && version === generation.current) {
        setBusy("Menyimpan lokasi foto…");
        row = await api<PhotoDraft>(`/api/v1/report-drafts/${row.id}`, {
          method: "PATCH",
          body: JSON.stringify(value.location),
          signal: controller.signal,
        });
      }
      if (version === generation.current) setDraft(row);
    } catch (e) {
      if (!controller.signal.aborted && version === generation.current)
        setError((e as Error).message);
    } finally {
      if (version === generation.current) setBusy("");
    }
  }
  const choose = useCallback(
    async (value: Photo) => {
      submitted.current = false;
      const version = ++generation.current;
      abort.current?.abort();
      ids.current = { requestId: randomUUID(), finalKey: randomUUID() };
      expiry.current = Date.now() + 86400000;
      setBusy("Menyiapkan foto dan menjalankan ML…");
      setError("");
      setGpsError("");
      setDraft(null);
      setPhoto(null);
      try {
        const prepared = await preparePhoto(value, owner);
        if (version !== generation.current) {
          deletePhoto(owner, prepared.uri);
          return;
        }
        setPhoto(prepared);
        await analyze(prepared, version, ids.current.requestId);
      } catch (e) {
        if (version === generation.current) {
          setError((e as Error).message);
          setBusy("");
        }
      }
    },
    [owner],
  );
  useFocusEffect(
    useCallback(() => {
      const pending = consumeCapture();
      if (pending) void choose(pending);
      return () => {
        generation.current++;
        abort.current?.abort();
        setBusy("");
      };
    }, [choose]),
  );
  async function gallery() {
    setError("");
    try {
      const value = await pickPhoto();
      if (value) await choose(value);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function locate() {
    if (!draft) return;
    const version = generation.current;
    setBusy("Mengambil GPS otomatis…");
    setGpsError("");
    try {
      const evidence: LocationEvidence = await currentLocation();
      const row = await api<PhotoDraft>(`/api/v1/report-drafts/${draft.id}`, {
        method: "PATCH",
        body: JSON.stringify(evidence),
      });
      if (version === generation.current) setDraft(row);
    } catch (e) {
      if (version === generation.current) setGpsError((e as Error).message);
    } finally {
      if (version === generation.current) setBusy("");
    }
  }
  async function submit() {
    setBusy("Menyimpan laporan…");
    setError("");
    try {
      const row = await api<Report>(
        editId ? `/api/v1/reports/${editId}` : "/api/v1/reports",
        {
          method: editId ? "PATCH" : "POST",
          headers: { "Idempotency-Key": ids.current.finalKey },
          body: JSON.stringify({
            description,
            ...(!editId ? { publication_policy: "public-gps-v2" } : {}),
            ...(draft ? { draft_id: draft.id } : {}),
            ...(editId ? { revision: original?.revision } : {}),
          }),
        },
      );
      submitted.current = true;
      removeDraft(owner, editId);
      setPhoto(null);
      setDraft(null);
      setDescription("");
      router.replace(`/report/${row.id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  const deleting = busy === "Menghapus draft…";
  const result = draft?.prediction;
  async function discard() {
    if (busy) return;
    setBusy("Menghapus draft…");
    setError("");
    try {
      if (draft)
        await api(`/api/v1/report-drafts/${draft.id}`, { method: "DELETE" });
      submitted.current = true;
      removeDraft(owner, editId);
      setPhoto(null);
      setDraft(null);
      setDescription(original?.description || "");
      setGpsError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  const ready =
    (!editId || original) &&
    (draft
      ? result &&
        draft.latitude !== null &&
        draft.location_source !== "legacy_unknown"
      : editId && !photo);
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Screen>
        <Text style={styles.title}>{editId ? "Edit laporan" : title}</Text>
        <Text style={styles.text}>
          Ambil satu objek sampah. Kategori diisi otomatis oleh model.
        </Text>
        <Button
          title="Ambil foto sampah"
          disabled={!!busy}
          onPress={() => router.push("/camera")}
        />
        <Button
          secondary
          title="Pilih gambar dari galeri"
          disabled={!!busy}
          onPress={() => {
            void gallery();
          }}
        />
        {!deleting && (photo || draft) && (
          <Image
            source={{ uri: photo?.uri || draft?.image_url }}
            style={styles.photo}
            resizeMode="contain"
            accessibilityLabel="Foto yang dianalisis"
          />
        )}
        {busy ? (
          <View style={styles.panel} accessibilityLiveRegion="polite">
            <ActivityIndicator color="#245e43" />
            <Text style={styles.text}>{busy}</Text>
            {!deleting && !result && (
              <Text style={styles.text}>
                Kategori sampah akan muncul otomatis setelah analisis selesai.
              </Text>
            )}
          </View>
        ) : null}
        {!deleting && result && (
          <View style={styles.panel} accessibilityLiveRegion="polite">
            <Text style={styles.label}>KATEGORI OTOMATIS</Text>
            <Text style={styles.heading}>{categoryName(result.category)}</Text>
            <Text style={styles.text}>
              {result.confidence.toFixed(1)}% confidence model
            </Text>
            <Action category={result.category} />
            <Text style={styles.text}>
              {draft.classification_state === "needs_review"
                ? "Hasil belum cukup meyakinkan. Ambil ulang atau kirim untuk ditinjau admin."
                : "Hasil model dapat keliru, terutama pada objek campuran atau foto bukan sampah."}
            </Text>
          </View>
        )}
        {!deleting && (photo || draft) && (
          <Button
            secondary
            title="Hapus draft foto"
            disabled={!!busy}
            onPress={() => {
              void discard();
            }}
          />
        )}
        {!deleting && draft && !result && (
          <>
            <Text style={styles.text}>
              Model belum tersedia. Foto sudah disimpan sebagai draft; laporan
              belum dikirim.
            </Text>
            <Button
              secondary
              title="Coba model tanpa upload ulang"
              disabled={!!busy}
              onPress={async () => {
                setBusy("Mencoba analisis…");
                try {
                  setDraft(
                    await api<PhotoDraft>(
                      `/api/v1/report-drafts/${draft.id}/retry`,
                      { method: "POST" },
                    ),
                  );
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy("");
                }
              }}
            />
          </>
        )}
        {photo && !draft && !busy && (
          <Button
            secondary
            title="Coba kirim foto yang sama"
            onPress={() => {
              const version = ++generation.current;
              setBusy("Mengenali foto…");
              void analyze(photo, version, ids.current.requestId);
            }}
          />
        )}
        {!deleting && draft && (
          <View style={styles.panel}>
            <Text style={styles.heading}>Lokasi otomatis</Text>
            {draft.latitude !== null ? (
              <>
                <Text style={styles.text}>
                  {locationNames[draft.location_source]}
                </Text>
                <Text style={styles.text}>
                  {draft.latitude.toFixed(6)}, {draft.longitude?.toFixed(6)}
                  {draft.location_accuracy_m !== null
                    ? ` · ±${draft.location_accuracy_m} m`
                    : ""}
                </Text>
              </>
            ) : draft.photo_source === "camera" ? (
              <Text style={styles.text}>
                GPS saat pemotretan belum cukup akurat. Aktifkan lokasi lalu
                ambil foto ulang untuk mengirim laporan.
              </Text>
            ) : (
              <>
                <Text style={styles.text}>
                  GPS asli foto tidak tersedia. Lanjutkan hanya jika foto
                  diambil di lokasi kamu saat ini.
                </Text>
                <Button
                  secondary
                  title="Foto diambil di sini: konfirmasi & ambil GPS"
                  disabled={!!busy}
                  onPress={() => {
                    void locate();
                  }}
                />
              </>
            )}
            <ErrorText message={gpsError} />
            {gpsError ? (
              <Button
                secondary
                title="Buka pengaturan izin"
                onPress={() => {
                  void Linking.openSettings();
                }}
              />
            ) : null}
          </View>
        )}
        {!editId && (
          <View style={styles.action}>
            <Text style={styles.heading}>Laporan publik</Text>
            <Text style={styles.text}>
              Foto, lokasi GPS presisi, dan deskripsi yang kamu isi akan
              terlihat oleh publik, termasuk pengunjung tanpa akun. Hindari
              wajah dan data pribadi.
            </Text>
          </View>
        )}
        <Input
          label="Deskripsi (opsional)"
          editable={!deleting && (!editId || !!original)}
          value={description}
          onChangeText={setDescription}
          multiline
          maxLength={5000}
        />
        {editId && !photo && !draft && (
          <Text style={styles.text}>
            Kategori dan lokasi tetap memakai data laporan. Foto pengganti akan
            dianalisis ulang.
          </Text>
        )}
        <Text style={styles.text}>
          Draft foto hanya terlihat oleh pemilik dan pengelola. Draft disimpan
          sementara hingga 24 jam.
        </Text>
        <ErrorText message={error} />
        <Button
          title={
            busy || (editId ? "Simpan perubahan" : "Kirim dan publikasikan")
          }
          disabled={!!busy || !ready}
          onPress={() => {
            void submit();
          }}
        />
        <Button
          secondary
          title="Kembali"
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace("/reports");
          }}
        />
      </Screen>
    </KeyboardAvoidingView>
  );
}
