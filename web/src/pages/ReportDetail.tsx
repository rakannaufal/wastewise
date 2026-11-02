import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, MapPin, Trash2 } from "lucide-react";
import { api } from "../api";
import { useAuth } from "../Auth";
import type { Report, Status } from "../types";
import {
  categoryName,
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
  const report = useQuery({
    queryKey: ["report", id],
    queryFn: () => api<Report>(`/api/v1/reports/${id}`),
    refetchInterval: 12 * 60 * 1000,
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
      api(`/api/v1/reports/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => client.invalidateQueries(),
  });
  if (report.isPending) return <Loading />;
  if (report.isError)
    return <Failure error={report.error} retry={() => report.refetch()} />;
  const row = report.data;
  return (
    <>
      <Link to="/reports" className="text-button back">
        <ArrowLeft size={17} />
        Kembali ke laporan
      </Link>
      <div className="page-heading">
        <div>
          <span className="eyebrow">Laporan · {date(row.created_at)}</span>
          <h1>{categoryName(row.category)}</h1>
          <p className="muted">Dilaporkan oleh {row.user_name}</p>
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
              <strong>Lokasi dilaporkan</strong>
              <p>
                {row.latitude.toFixed(6)}, {row.longitude.toFixed(6)}
              </p>
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
                : "Tidak tersedia; kategori dipilih manual"}
            </dd>
            <dt>Terakhir diperbarui</dt>
            <dd>{date(row.updated_at)}</dd>
          </dl>
          {user?.role === "admin" && (
            <label>
              Ubah status
              <select
                value={row.status}
                disabled={update.isPending}
                onChange={(e) => update.mutate(e.target.value as Status)}
              >
                {Object.entries(statusName).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          )}
          {update.isError && <Failure error={update.error} />}
          <button className="button danger" onClick={() => setConfirm(true)}>
            <Trash2 size={17} />
            Hapus laporan
          </button>
        </section>
      </div>
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
    </>
  );
}
