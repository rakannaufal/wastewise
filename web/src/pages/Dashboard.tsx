import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  Camera,
  ClipboardList,
  Clock3,
  CheckCheck,
} from "lucide-react";
import { api } from "../api";
import { useAuth } from "../Auth";
import type { ReportsPage, Summary } from "../types";
import { categories, Failure, Loading } from "../ui";
import { ReportTable } from "../components/ReportTable";
import { ReportDistribution } from "../components/ReportDistribution";
export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const summary = useQuery({
    queryKey: ["summary"],
    queryFn: () => api<Summary>("/api/v1/stats/summary"),
  });
  const reports = useQuery({
    queryKey: ["reports", "recent"],
    queryFn: () => api<ReportsPage>("/api/v1/reports?per_page=5"),
  });
  const stats = [
    {
      label: "Total laporan",
      value: summary.data?.total_reports,
      icon: ClipboardList,
    },
    {
      label: "Perlu ditangani",
      value: summary.data
        ? summary.data.by_status.Pending + summary.data.by_status["In Progress"]
        : undefined,
      icon: Clock3,
    },
    {
      label: "Selesai ditangani",
      value: summary.data?.by_status.Completed,
      icon: CheckCheck,
    },
  ];
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            {new Intl.DateTimeFormat("id-ID", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            }).format(new Date())}
          </p>
          <h1>Langkah baik, {user?.full_name.split(" ")[0]}.</h1>
          <p className="muted">
            {user?.role === "admin"
              ? "Pantau laporan dan bantu penanganannya berjalan."
              : "Sampah terpilah dimulai dari keputusan kecil hari ini."}
          </p>
        </div>
        <Link to="/reports/new" className="button primary">
          Buat laporan
          <ArrowUpRight size={18} />
        </Link>
      </div>
      {summary.isError && (
        <Failure error={summary.error} retry={() => summary.refetch()} />
      )}
      <div className="metrics">
        {stats.map(({ label, value, icon: Icon }, i) => (
          <div className={`metric ${i === 0 ? "metric-main" : ""}`} key={label}>
            <div>
              <span>{label}</span>
              <Icon size={20} />
            </div>
            <strong>{value ?? "…"}</strong>
            <small>
              {i === 0
                ? user?.role === "admin"
                  ? "Seluruh laporan masuk"
                  : "Laporan milikmu"
                : i === 1
                  ? "Menunggu dan sedang diproses"
                  : "Status dikonfirmasi pengelola"}
            </small>
          </div>
        ))}
      </div>
      <div className="dashboard-columns">
        <section className="panel report-panel">
          <div className="section-heading">
            <div>
              <h2>Laporan terbaru</h2>
              <p className="muted">Setiap laporan punya langkah berikutnya.</p>
            </div>
            <Link to="/reports" className="text-button">
              Lihat semua
              <ArrowRight size={17} />
            </Link>
          </div>
          {reports.isPending ? (
            <Loading />
          ) : reports.isError ? (
            <Failure error={reports.error} retry={() => reports.refetch()} />
          ) : (
            <ReportTable
              reports={reports.data.reports}
              open={(id) => navigate(`/reports/${id}`)}
            />
          )}
        </section>
        <aside className="classify-callout">
          <span className="eyebrow">Kenali sebelum memilah</span>
          <div className="sample-material">
            <img src="/materials/plastic.jpg" alt="Contoh material plastik" />
            <span>Contoh material · Plastik</span>
          </div>
          <h2>Foto. Kenali. Pilah.</h2>
          <p>
            Dapatkan perkiraan kategori dari foto, lalu periksa panduan
            penanganannya.
          </p>
          <Link to="/classify" className="button primary full">
            <Camera size={18} />
            Klasifikasi foto
            <ArrowUpRight size={18} />
          </Link>
          <small>12 kategori. Hasil AI perlu diperiksa kembali.</small>
        </aside>
      </div>
      {summary.data && summary.data.total_reports > 0 && (
        <ReportDistribution summary={summary.data} />
      )}
      <section className="category-overview">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Kenali materialnya</span>
            <h2>Beda bahan, beda penanganan.</h2>
          </div>
          <Link to="/guide" className="text-button">
            Buka panduan
            <ArrowRight size={17} />
          </Link>
        </div>
        <div className="material-strip">
          {categories.slice(0, 6).map((category, index) => (
            <Link to={`/guide#${category.id}`} key={category.id}>
              <span className="material-index">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span>{category.name}</span>
              <ArrowUpRight size={16} />
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
