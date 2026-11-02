import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { api } from "../api";
import type { AdminDashboard as DashboardData, Status } from "../types";
import { categories, Failure, Loading, statusName } from "../ui";
import { ReportTable } from "../components/ReportTable";
import { ReportDistribution } from "../components/ReportDistribution";

const jakartaDate = (value: Date) =>
  value.toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
export default function AdminDashboard() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const from =
    params.get("from") || jakartaDate(new Date(Date.now() - 29 * 86400000));
  const to = params.get("to") || jakartaDate(new Date());
  const category = params.get("category") || "";
  const status = params.get("status") || "";
  const end = new Date(`${to}T00:00:00+07:00`);
  end.setUTCDate(end.getUTCDate() + 1);
  const query = new URLSearchParams({
    date_from: `${from}T00:00:00+07:00`,
    date_to: Number.isNaN(end.getTime()) ? "invalid" : end.toISOString(),
    timezone: "Asia/Jakarta",
    ...(category && { category }),
    ...(status && { status }),
  });
  const result = useQuery({
    queryKey: ["admin-dashboard", query.toString()],
    queryFn: ({ signal }) =>
      api<DashboardData>(`/api/v1/admin/dashboard?${query}`, { signal }),
    staleTime: 30000,
    refetchOnWindowFocus: true,
  });
  function change(key: string, value: string) {
    setParams((old) => {
      const next = new URLSearchParams(old);
      if (value) next.set(key, value);
      else next.delete(key);
      return next;
    });
  }
  const data = result.data;
  const listLink = (extra: Record<string, string>, cohort = true) => {
    const q = new URLSearchParams(
      cohort ? query : category ? { category } : {},
    );
    q.delete("timezone");
    for (const [key, value] of Object.entries(extra)) {
      if (value) q.set(key, value);
      else q.delete(key);
    }
    return `/reports?${q}`;
  };
  const points = data?.trend || [];
  const max = Math.max(1, ...points.map((point) => point.count));
  return (
    <div className="admin-dashboard">
      <div className="page-heading">
        <div>
          <h1>Penanganan laporan</h1>
          <p className="muted">
            Antrean sampah, hasil klasifikasi, dan perkembangan penanganan.
          </p>
        </div>
        <button
          className="button secondary"
          disabled={result.isFetching}
          onClick={() => {
            void result.refetch();
          }}
        >
          <RefreshCw size={17} />
          Perbarui data
        </button>
      </div>
      <section className="panel dashboard-filter" aria-label="Filter statistik">
        <label>
          Dari tanggal
          <input
            type="date"
            value={from}
            onChange={(e) => change("from", e.target.value)}
          />
        </label>
        <label>
          Sampai tanggal
          <input
            type="date"
            value={to}
            min={from}
            onChange={(e) => change("to", e.target.value)}
          />
        </label>
        <label>
          Kategori
          <select
            value={category}
            onChange={(e) => change("category", e.target.value)}
          >
            <option value="">Semua kategori</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Status
          <select
            value={status}
            onChange={(e) => change("status", e.target.value)}
          >
            <option value="">Semua status</option>
            {Object.entries(statusName).map(([key, name]) => (
              <option key={key} value={key}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <button className="text-button" onClick={() => setParams({})}>
          Reset filter
        </button>
      </section>
      {result.isError && (
        <Failure error={result.error} retry={() => result.refetch()} />
      )}
      {!data ? (
        !result.isError && <Loading />
      ) : (
        <>
          <div className="section-heading">
            <div>
              <h2>Ringkasan periode</h2>
              <p className="muted">
                {from} sampai {to} · Asia/Jakarta. Status terkini dari laporan
                yang dibuat dalam periode ini.
              </p>
            </div>
          </div>
          <div className="admin-metrics">
            <Link className="admin-metric" to={listLink({})}>
              <span>Total laporan</span>
              <strong>{data.cohort.total}</strong>
              <small>
                {data.change_percent === null
                  ? "Belum ada pembanding periode sebelumnya"
                  : `${data.change_percent > 0 ? "+" : ""}${data.change_percent}% dari ${data.previous_total} pada periode sebelumnya`}
              </small>
            </Link>
            {(Object.entries(data.cohort.by_status) as [Status, number][]).map(
              ([value, count]) => (
                <Link
                  className="admin-metric"
                  key={value}
                  to={listLink({ status: value })}
                >
                  <span>{statusName[value]}</span>
                  <strong>{count}</strong>
                  <small>Lihat laporan {statusName[value].toLowerCase()}</small>
                </Link>
              ),
            )}
            <Link
              className="admin-metric"
              to={listLink({ needs_review: "true" })}
            >
              <span>Perlu review AI</span>
              <strong>{data.cohort.needs_review}</strong>
              <small>Dapat bertumpang tindih dengan status laporan</small>
            </Link>
          </div>
          <section className="panel report-panel">
            <div className="section-heading">
              <div>
                <h2>Antrean aktif · seluruh periode</h2>
                <p className="muted">
                  {data.backlog.active} laporan menunggu/diproses. Urutan
                  berdasarkan umur sejak dibuat.
                </p>
              </div>
              <Link
                className="text-button"
                to={listLink({ status: "Pending", sort: "oldest" }, false)}
              >
                Buka antrean menunggu
              </Link>
            </div>
            <ReportTable
              admin
              reports={data.queue}
              open={(id) => navigate(`/reports/${id}`)}
            />
          </section>
          <section className="panel report-panel">
            <div className="section-heading">
              <div>
                <h2>Review klasifikasi · seluruh periode</h2>
                <p className="muted">
                  {data.backlog.needs_review} prediksi membutuhkan pemeriksaan.
                  Confidence bukan jaminan ketepatan.
                </p>
              </div>
              <Link
                className="text-button"
                to={listLink({ needs_review: "true", sort: "oldest" }, false)}
              >
                Buka semua review
              </Link>
            </div>
            <ReportTable
              admin
              reports={data.review_queue}
              open={(id) => navigate(`/reports/${id}`)}
            />
          </section>
          <section className="panel">
            <h2>Laporan masuk per hari</h2>
            <p className="muted">
              Berdasarkan waktu laporan dibuat pada periode yang dipilih.
            </p>
            {data.cohort.total ? (
              <>
                <svg
                  className="trend-chart"
                  viewBox="0 0 600 140"
                  role="img"
                  aria-label={`Tren ${data.cohort.total} laporan dalam ${points.length} hari. Data harian tersedia di bawah.`}
                >
                  <polyline
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    vectorEffect="non-scaling-stroke"
                    points={points
                      .map(
                        (point, i) =>
                          `${10 + (i / Math.max(1, points.length - 1)) * 580},${130 - (point.count / max) * 110}`,
                      )
                      .join(" ")}
                  />
                </svg>
                <div className="trend-axis">
                  <span>{from}</span>
                  <span>Puncak {max} laporan/hari</span>
                  <span>{to}</span>
                </div>
              </>
            ) : (
              <p className="empty-inline">
                Belum ada laporan pada periode ini.
              </p>
            )}
            <details>
              <summary>Lihat angka harian</summary>
              <div className="trend-data">
                {points.map((point) => (
                  <p key={point.date}>
                    <time>{point.date}</time>
                    <strong>{point.count}</strong>
                  </p>
                ))}
              </div>
            </details>
          </section>
          {data.cohort.total > 0 && (
            <ReportDistribution
              summary={{
                total_reports: data.cohort.total,
                by_category: data.cohort.by_category,
                by_status: data.cohort.by_status,
              }}
            />
          )}
          <section className="panel">
            <h2>Waktu penanganan</h2>
            <dl className="timing-metrics">
              <div>
                <dt>Median respons pertama</dt>
                <dd>
                  {data.median_response_hours === null
                    ? "Belum tersedia"
                    : `${data.median_response_hours} jam`}
                </dd>
              </div>
              <div>
                <dt>Median selesai pertama</dt>
                <dd>
                  {data.median_completion_hours === null
                    ? "Belum tersedia"
                    : `${data.median_completion_hours} jam`}
                </dd>
              </div>
            </dl>
            <p className="caption">
              Hanya laporan dengan riwayat sejak dibuat. Data lama tanpa riwayat
              tidak diestimasi dari waktu edit. Pembaruan{" "}
              {new Date(data.generated_at).toLocaleString("id-ID", {
                timeZone: "Asia/Jakarta",
              })}{" "}
              WIB.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
