import ShareReport from "../components/ShareReport";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, MapPin, Trash2 } from "lucide-react";
import { api } from "../api";
import { useAuth } from "../Auth";
import type { Report, ReportEvent, Status } from "../types";
import { locationNames, transitions } from "../types";
import {
  categoryName,
  categories,
  date,
  Dialog,
  Failure,
  Loading,
  NextAction,
  StatusBadge,
  statusName,
} from "../ui";
export default function ReportDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const client = useQueryClient();
  const [confirm, setConfirm] = useState(false);
  const [target, setTarget] = useState<Status | "">("");
  const [reason, setReason] = useState("");
  const [reviewCategory, setReviewCategory] = useState("");
  const [reviewReason, setReviewReason] = useState("");
  const report = useQuery({
    queryKey: ["report", user?.id, id],
    queryFn: ({ signal }) => api<Report>(`/api/v1/reports/${id}`, { signal }),
    refetchInterval: 12 * 60 * 1000,
  });
  const history = useQuery({
    queryKey: ["report-events", user?.id, id],
    queryFn: ({ signal }) =>
      api<ReportEvent[]>(`/api/v1/reports/${id}/events`, { signal }),
  });
  const remove = useMutation({
    mutationFn: () => api(`/api/v1/reports/${id}`, { method: "DELETE" }),
    onSuccess: async () => {
      await client.invalidateQueries();
      navigate("/reports");
    },
  });
  const update = useMutation({
    mutationFn: (status: Status) =>
      api<Pick<Report, "status" | "revision" | "updated_at">>(
        `/api/v1/reports/${id}/status`,
        {
          method: "PATCH",
          body: JSON.stringify({
            status,
            revision: report.data?.revision,
            reason,
          }),
        },
      ),
    onSuccess: async (value) => {
      client.setQueryData<Report>(["report", user?.id, id], (old) =>
        old ? { ...old, ...value } : old,
      );
      setTarget("");
      setReason("");
      await client.invalidateQueries();
    },
  });
  const review = useMutation({
    mutationFn: () =>
      api<Report>(`/api/v1/reports/${id}/review`, {
        method: "PATCH",
        body: JSON.stringify({
          revision: report.data?.revision,
          category: reviewCategory || report.data?.category,
          reason: reviewReason,
        }),
      }),
    onSuccess: async (value) => {
      client.setQueryData(["report", user?.id, id], value);
      setReviewReason("");
      await client.invalidateQueries();
    },
  });
  if (report.isPending) return <Loading />;
  if (report.isError)
    return <Failure error={report.error} retry={() => report.refetch()} />;
  const row = report.data;
  const eventValue = (value: string | boolean | null) =>
    value ? statusName[value as Status] || categoryName(String(value)) : "";
  return (
    <>
      <Link to="/reports" className="text-button back">
        <ArrowLeft size={17} />
        Kembali ke laporan
      </Link>
      <div className="page-heading">
        <div>
          <h1>{categoryName(row.category)}</h1>
          <p className="muted">
            Dilaporkan oleh {row.user_name} · {date(row.created_at)}
          </p>
        </div>
        <StatusBadge value={row.status} />
      </div>
      <div className="detail-grid">
        <section>
          <img
            className="detail-photo"
            src={row.image_url}
            alt={`Foto laporan ${categoryName(row.category)}`}
            onError={(e) => {
              e.currentTarget.alt =
                "Foto tidak tersedia. Muat ulang detail untuk memperbarui tautan.";
            }}
          />
          <NextAction category={row.category} />
        </section>
        <section className="panel padded">
          <h2>Catatan laporan</h2>
          <p className="report-description">{row.description}</p>
          <div className="detail-location">
            <MapPin size={19} />
            <div>
              <strong>
                {locationNames[row.location_source] || row.location_source}
              </strong>
              <p>
                {row.latitude.toFixed(6)}, {row.longitude.toFixed(6)}
              </p>
              <p className="caption">
                {row.location_accuracy_m !== null &&
                  `Akurasi ±${row.location_accuracy_m} m. `}
                {row.location_recorded_at
                  ? `Dicatat ${date(row.location_recorded_at)}`
                  : "Waktu lokasi tidak tersedia."}
              </p>
              {row.captured_at && (
                <p className="caption">Foto diambil {date(row.captured_at)}</p>
              )}
              <a
                href={`https://www.openstreetmap.org/?mlat=${row.latitude}&mlon=${row.longitude}#map=18/${row.latitude}/${row.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-button"
              >
                Lihat di OpenStreetMap
              </a>
            </div>
          </div>
          <dl>
            <dt>Prediksi AI saat disimpan</dt>
            <dd>
              {row.ai_predicted_category
                ? `${categoryName(row.ai_predicted_category)} · ${row.ai_confidence?.toFixed(1)}%`
                : "Tidak tersedia pada laporan lama"}
            </dd>
            <dt>Review klasifikasi</dt>
            <dd>
              {row.classification_state === "needs_review"
                ? "Perlu review admin"
                : row.classification_state === "reviewed"
                  ? "Ditinjau admin"
                  : row.classification_state === "legacy"
                    ? "Data lama"
                    : "Hasil otomatis"}
            </dd>
            <dt>Versi model</dt>
            <dd>{row.ai_model_version || "Tidak tersedia"}</dd>
            <dt>Terakhir diperbarui</dt>
            <dd>{date(row.updated_at)}</dd>
          </dl>
          {user?.role === "admin" && (
            <form
              className="workflow-form"
              onSubmit={(e) => {
                e.preventDefault();
                if (target) update.mutate(target);
              }}
            >
              <h3>Penanganan laporan</h3>
              <label>
                Status berikutnya
                <select
                  value={target}
                  onChange={(e) => setTarget(e.target.value as Status | "")}
                  required
                >
                  <option value="">Pilih status</option>
                  {transitions[row.status].map((value) => (
                    <option key={value} value={value}>
                      {statusName[value]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Alasan / catatan
                <textarea
                  value={reason}
                  maxLength={1000}
                  onChange={(e) => setReason(e.target.value)}
                  required={
                    target === "Rejected" ||
                    row.status === "Completed" ||
                    row.status === "Rejected"
                  }
                  minLength={5}
                  placeholder="Wajib untuk penolakan atau pembukaan ulang."
                />
              </label>
              <button
                className="button primary"
                disabled={!target || update.isPending}
              >
                Simpan status
              </button>
            </form>
          )}
          {update.isError && <Failure error={update.error} />}
          {user?.role === "admin" && (
            <form
              className="workflow-form"
              onSubmit={(e) => {
                e.preventDefault();
                review.mutate();
              }}
            >
              <h3>Review kategori</h3>
              <p className="caption">
                Koreksi tidak mengubah prediksi asli AI.
              </p>
              <label>
                Kategori setelah diperiksa
                <select
                  value={reviewCategory || row.category}
                  onChange={(e) => setReviewCategory(e.target.value)}
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Alasan pemeriksaan
                <textarea
                  value={reviewReason}
                  onChange={(e) => setReviewReason(e.target.value)}
                  minLength={5}
                  maxLength={1000}
                  required
                />
              </label>
              <button
                className="button secondary"
                disabled={review.isPending || reviewReason.trim().length < 5}
              >
                Simpan review
              </button>
              {review.isError && <Failure error={review.error} />}
            </form>
          )}
          {(user?.role === "admin" || row.status === "Pending") && (
            <Link
              className="button secondary"
              to={`/reports/new?edit=${row.id}`}
            >
              Edit deskripsi / ganti foto
            </Link>
          )}
          <button className="button danger" onClick={() => setConfirm(true)}>
            <Trash2 size={17} />
            Hapus laporan
          </button>
        </section>
      </div>
      <section className="panel history-panel">
        <h2>Riwayat laporan</h2>
        {history.isPending ? (
          <Loading />
        ) : history.isError ? (
          <Failure error={history.error} retry={() => history.refetch()} />
        ) : history.data.length ? (
          <ol className="event-list">
            {history.data.map((item) => (
              <li key={item.id}>
                <strong>
                  {{
                    created: "Laporan dibuat",
                    edited: "Laporan diedit",
                    status_changed: "Status berubah",
                    category_reviewed: "Kategori diperiksa",
                  }[item.kind] || item.kind}
                </strong>
                <p>
                  {item.details.from && `${eventValue(item.details.from)} → `}
                  {eventValue(item.details.to)}
                </p>
                {item.reason && <p>{item.reason}</p>}
                <small className="muted">
                  {item.actor_name || "Akun terhapus"} · {date(item.created_at)}
                </small>
              </li>
            ))}
          </ol>
        ) : (
          <p className="muted">
            Laporan lama belum memiliki riwayat terperinci.
          </p>
        )}
      </section>
      {confirm && (
        <Dialog title="Hapus laporan ini?" onClose={() => setConfirm(false)}>
          <p>
            Laporan akan dihapus. Foto dijadwalkan untuk dihapus dari
            penyimpanan. Tindakan ini tidak dapat dibatalkan.
          </p>
          {remove.isError && <Failure error={remove.error} />}
          <div className="dialog-actions">
            <button
              className="button secondary"
              onClick={() => setConfirm(false)}
            >
              Batal
            </button>
            <button
              className="button danger"
              disabled={remove.isPending}
              onClick={() => remove.mutate()}
            >
              {remove.isPending ? "Menghapus…" : "Hapus laporan"}
            </button>
          </div>
        </Dialog>
      )}
      {user?.id === report.data?.user_id && report.data && (
        <ShareReport report={report.data} />
      )}
    </>
  );
}
