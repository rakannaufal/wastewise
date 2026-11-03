import { useState } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { api } from "./api";
import { Button, ErrorText, styles } from "./ui";
import type { Report } from "../../shared/contracts";
import type { Post } from "../../shared/community";
export default function ShareReport({ report }: { report: Report }) {
  const [consent, setConsent] = useState(false);
  const [post, setPost] = useState<Post | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function publish() {
    setBusy(true);
    setError("");
    try {
      setPost(
        await api<Post>("/api/v1/community/posts", {
          method: "POST",
          body: JSON.stringify({
            report_id: report.id,
            caption: report.description,
            consent: true,
          }),
        }),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={styles.panel}>
      <Text style={styles.heading}>Bagikan ke lingkunganmu</Text>
      <Text style={styles.text}>
        Foto, deskripsi, dan GPS presisi ({report.latitude.toFixed(5)},{" "}
        {report.longitude.toFixed(5)}) akan terlihat oleh semua pengguna yang
        masuk. Periksa informasi pribadi sebelum berbagi.
      </Text>
      {post ? (
        <Button
          secondary
          title="Lihat dan kelola posting"
          onPress={() => router.push(`/post/${post.id}`)}
        />
      ) : (
        <>
          <Button
            secondary
            title={
              consent
                ? "Persetujuan berbagi aktif: batalkan"
                : "Saya setuju membagikan foto dan GPS"
            }
            disabled={busy}
            onPress={() => setConsent(!consent)}
          />
          <Button
            title={busy ? "Menyiapkan…" : "Bagikan laporan"}
            disabled={busy || !consent}
            onPress={() => void publish()}
          />
        </>
      )}
      <ErrorText message={error} />
    </View>
  );
}
