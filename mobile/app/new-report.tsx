import { useEffect, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { clearDraft, getDraft } from "../src/draft";
import * as Location from "expo-location";
import { api } from "../src/api";
import type { Report } from "../src/api";
import { appendPhoto, pickPhoto } from "../src/photo";
import type { Photo } from "../src/photo";
import {
  Button,
  categories,
  ErrorText,
  Input,
  Screen,
  styles,
} from "../src/ui";
export default function NewReport() {
  const [draft] = useState(getDraft);
  useEffect(() => {
    // Consume only after commit: route pre-render and React retries must stay pure.
    clearDraft(draft);
  }, [draft]);
  const [photo, setPhoto] = useState<Photo | null>(draft?.photo || null);
  const [category, setCategory] = useState(draft?.category || "");
  const [description, setDescription] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function locate() {
    setError("");
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted)
        throw new Error("Izin lokasi ditolak. Isi koordinat manual.");
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLatitude(location.coords.latitude.toFixed(7));
      setLongitude(location.coords.longitude.toFixed(7));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function save() {
    if (
      !photo ||
      !categories.some((c) => c.id === category) ||
      description.trim().length < 10 ||
      !latitude.trim() ||
      !longitude.trim() ||
      !Number.isFinite(Number(latitude)) ||
      Math.abs(Number(latitude)) > 90 ||
      !Number.isFinite(Number(longitude)) ||
      Math.abs(Number(longitude)) > 180
    ) {
      setError(
        "Lengkapi foto, material, deskripsi minimal 10 karakter, dan koordinat yang valid.",
      );
      return;
    }
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      await appendPhoto(form, photo);
      form.append("category", category);
      form.append("description", description.trim());
      form.append("latitude", latitude);
      form.append("longitude", longitude);
      const report = await api<Report>("/api/v1/reports", {
        method: "POST",
        body: form,
      });
      router.replace(`/report/${report.id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Screen>
        <Button secondary title="Kembali" onPress={() => router.back()} />
        <Text style={styles.title}>Buat laporan</Text>
        {photo && (
          <Image
            source={{ uri: photo.uri }}
            style={styles.photo}
            resizeMode="contain"
            accessibilityLabel="Foto laporan yang dipilih"
          />
        )}
        <Button
          secondary
          title="Pilih / ganti foto"
          onPress={() => {
            pickPhoto()
              .then((value) => {
                if (value) setPhoto(value);
              })
              .catch((e) => setError(e.message));
          }}
        />
        <Text style={styles.label}>PILIH MATERIAL</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {categories.map((c) => (
            <Pressable
              key={c.id}
              accessibilityRole="radio"
              accessibilityState={{ checked: category === c.id }}
              onPress={() => setCategory(c.id)}
              style={[
                styles.chip,
                category === c.id && {
                  backgroundColor: "#DCE9DB",
                  borderColor: "#215B3C",
                },
              ]}
            >
              <Text style={{ color: "#215B3C" }}>{c.name}</Text>
            </Pressable>
          ))}
        </View>
        <Input
          label="Deskripsi"
          value={description}
          onChangeText={setDescription}
          multiline
          maxLength={5000}
        />
        <Button secondary title="Gunakan lokasi saat ini" onPress={locate} />
        <Input
          label="Latitude (−90 hingga 90)"
          value={latitude}
          onChangeText={setLatitude}
          keyboardType="numbers-and-punctuation"
        />
        <Input
          label="Longitude (−180 hingga 180)"
          value={longitude}
          onChangeText={setLongitude}
          keyboardType="numbers-and-punctuation"
        />
        <Text style={styles.text}>
          Foto dan lokasi terlihat oleh pemilik dan pengelola. Hindari informasi
          pribadi dalam foto.
        </Text>
        <ErrorText message={error} />
        <Button
          title={busy ? "Menyimpan…" : "Simpan laporan"}
          disabled={busy}
          onPress={save}
        />
      </Screen>
    </KeyboardAvoidingView>
  );
}
