import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../api";
import { Failure } from "../ui";
import type { Report } from "../types";
import type { Post } from "../../../shared/community";
export default function ShareReport({ report }: { report: Report }) {
  const [consent, setConsent] = useState(false);
  const client = useQueryClient();
  const publish = useMutation({
    mutationFn: () =>
      api<Post>("/api/v1/community/posts", {
        method: "POST",
        body: JSON.stringify({
          report_id: report.id,
          caption: report.description,
          consent: true,
        }),
      }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ["community"] }),
  });
  return (
    <section
      className="panel"
      style={{ padding: 24, display: "grid", gap: 14 }}
    >
      <h2>Bagikan ke lingkunganmu</h2>
      <p>
        Foto dan koordinat GPS presisi ({report.latitude.toFixed(5)},{" "}
        {report.longitude.toFixed(5)}) akan terlihat oleh semua pengguna yang
        masuk. Pastikan foto dan deskripsi tidak memuat data pribadi.
      </p>
      {publish.data ? (
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
