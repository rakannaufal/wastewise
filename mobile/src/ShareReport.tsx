import { useEffect, useState } from "react";
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
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    api<Post | null>(`/api/v1/reports/${report.id}/publication`)
      .then((p) => {
        if (active) setPost(p);
      })
      .catch((e) => {
        if (active) setError((e as Error).message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [report.id, retry]);
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
            publication_policy: "public-gps-v2",
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
      <Text style={styles.heading}>Publikasi laporan</Text>
      <Text style={styles.text}>
        Foto, deskripsi, dan GPS presisi ({report.latitude.toFixed(5)},{" "}
        {report.longitude.toFixed(5)}) akan terlihat oleh publik, termasuk
        pengunjung tanpa akun. Periksa informasi pribadi sebelum berbagi.
      </Text>
      {loading ? (
        <Text style={styles.text}>Memuat publikasi…</Text>
      ) : report.status === "Rejected" ? (
        <Text style={styles.text}>
          Laporan Ditolak tidak ditampilkan kepada publik.
        </Text>
      ) : post && post.state !== "withdrawn" ? (
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
            disabled={busy || loading || !!error || !consent}
            onPress={() => void publish()}
          />
        </>
      )}
      <ErrorText message={error} />
      {error && (
        <Button
          secondary
          title="Muat ulang publikasi"
          onPress={() => setRetry((v) => v + 1)}
        />
      )}
    </View>
  );
}
