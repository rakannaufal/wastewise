import { useState } from "react";
import { setDraft } from "../../src/draft";
import { Image, Text, View } from "react-native";
import { router } from "expo-router";
import { api } from "../../src/api";
import type { Prediction } from "../../src/api";
import { appendPhoto, pickPhoto } from "../../src/photo";
import type { Photo } from "../../src/photo";
import {
  Action,
  Button,
  categoryName,
  ErrorText,
  Screen,
  styles,
} from "../../src/ui";
export default function Classify() {
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [result, setResult] = useState<Prediction | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function choose(camera: boolean) {
    setError("");
    try {
      const value = await pickPhoto(camera);
      if (value) {
        setPhoto(value);
        setResult(null);
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function classify() {
    if (!photo) return;
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const form = new FormData();
      await appendPhoto(form, photo);
      setResult(
        await api<Prediction>("/api/v1/predict", {
          method: "POST",
          body: form,
        }),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen>
      <Text style={styles.title}>Klasifikasi foto</Text>
      <Text style={styles.text}>
        Satu objek, cahaya cukup, latar sederhana. JPEG, PNG, WebP maksimal 5
        MiB.
      </Text>
      {photo ? (
        <Image
          source={{ uri: photo.uri }}
          style={styles.photo}
          resizeMode="contain"
          accessibilityLabel="Foto material yang dipilih"
        />
      ) : (
        <View
          style={[styles.panel, { minHeight: 170, justifyContent: "center" }]}
        >
          <Text style={styles.heading}>Foto. Kenali. Pilah.</Text>
          <Text style={styles.text}>Pilih foto atau gunakan kamera.</Text>
        </View>
      )}
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Button
            secondary
            title="Galeri"
            onPress={() => {
              void choose(false);
            }}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            secondary
            title="Kamera"
            onPress={() => {
              void choose(true);
            }}
          />
        </View>
      </View>
      <ErrorText message={error} />
      <Button
        title={busy ? "Mengenali…" : "Kenali material"}
        disabled={!photo || busy}
        onPress={classify}
      />
      {result && (
        <View style={{ gap: 18 }}>
          <Text style={styles.label}>PERKIRAAN KATEGORI</Text>
          <Text style={styles.title}>{categoryName(result.category)}</Text>
          <Text style={styles.heading}>
            {result.confidence.toFixed(1)}% confidence model
          </Text>
          <Action category={result.category} />
          {Object.entries(result.probabilities)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([key, value]) => (
              <Text key={key} style={styles.text}>
                {categoryName(key)} · {value.toFixed(1)}%
              </Text>
            ))}
          <Text style={[styles.text, { fontSize: 12 }]}>
            Hasil AI dapat keliru. Periksa kembali kategori dan aturan fasilitas
            setempat.
          </Text>
          <Button
            title="Lanjutkan menjadi laporan"
            onPress={() => {
              photo && setDraft({ photo, category: result.category });
              router.push("/new-report");
            }}
          />
        </View>
      )}
      {error && (
        <Button
          secondary
          title="Buat laporan manual"
          onPress={() => router.push("/new-report")}
        />
      )}
    </Screen>
  );
}
