import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../api";
import { Failure } from "../ui";
import type { Report } from "../types";
import type { Post } from "../../../shared/community";
export default function ShareReport({ report }: { report: Report }) {
  const [consent, setConsent] = useState(false);
  const client = useQueryClient();
  const current = useQuery({
    queryKey: ["community", "publication", report.id],
    queryFn: () => api<Post | null>(`/api/v1/reports/${report.id}/publication`),
  });
  const post = current.data;
  const publish = useMutation({
    mutationFn: () =>
      api<Post>("/api/v1/community/posts", {
        method: "POST",
        body: JSON.stringify({
          report_id: report.id,
          caption: report.description,
          consent: true,
          publication_policy: "public-gps-v2",
        }),
      }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ["community"] }),
  });
  return (
    <section
      className="panel"
      style={{ padding: 24, display: "grid", gap: 14 }}
    >
      <h2>Publikasi laporan</h2>
      <p>
        Foto dan koordinat GPS presisi ({report.latitude.toFixed(5)},{" "}
        {report.longitude.toFixed(5)}) akan terlihat oleh publik, termasuk
        pengunjung tanpa akun. Pastikan foto dan deskripsi tidak memuat data
        pribadi.
      </p>
      {current.isPending ? (
        <p role="status">Memuat publikasi…</p>
      ) : current.error ? (
        <Failure error={current.error} retry={() => void current.refetch()} />
      ) : post && post.state !== "withdrawn" ? (
        <>
          <p>
            {post.state === "hidden"
              ? "Posting disembunyikan moderator."
              : post.state === "processing"
                ? "Foto sedang disiapkan untuk publikasi."
                : report.status === "Rejected"
                  ? "Laporan Ditolak tidak ditampilkan kepada publik."
                  : "Foto dan GPS tersedia di komunitas dan peta publik."}
          </p>
          {report.status !== "Rejected" && (
            <Link className="button secondary" to={`/community/${post.id}`}>
              Lihat posting dan kelola publikasi
            </Link>
          )}
        </>
      ) : report.status === "Rejected" ? (
        <p>Laporan Ditolak tidak dapat dipublikasikan.</p>
      ) : publish.data ? (
        <Link className="button secondary" to={`/community/${publish.data.id}`}>
          Lihat posting dan kelola publikasi
        </Link>
      ) : (
        <>
          <label className="share-consent">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            Saya setuju membagikan foto, deskripsi, dan GPS presisi ke
            komunitas.
          </label>
          <button
            className="button primary"
            disabled={!consent || publish.isPending}
            onClick={() => publish.mutate()}
          >
            {publish.isPending ? "Menyiapkan…" : "Bagikan laporan"}
          </button>
        </>
      )}
      {publish.error && <Failure error={publish.error} />}
    </section>
  );
}
