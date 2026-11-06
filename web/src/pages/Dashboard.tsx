import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  ClipboardList,
  Clock3,
  CheckCheck,
} from "lucide-react";
import { api } from "../api";
import { useAuth } from "../Auth";
import type { ReportsPage, Summary } from "../types";
import { categories, Failure, Loading } from "../ui";
import { ReportTable } from "../components/ReportTable";
import AdminDashboard from "./AdminDashboard";
import "./workspace-pages.css";
export default function Dashboard() {
  const { user } = useAuth();
  return user?.role === "admin" ? <AdminDashboard /> : <UserDashboard />;
}
function UserDashboard() {
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
  const date = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
  const pending = summary.data
    ? summary.data.by_status.Pending + summary.data.by_status["In Progress"]
    : null;
  const completed = summary.data?.by_status.Completed ?? null;
  const firstName = user?.full_name.trim().split(/\s+/)[0] || "warga";
  return (
    <section className="ww-dashboard" aria-labelledby="dashboard-title">
      <header className="ww-dashboard-hero">
        <div className="ww-dashboard-welcome">
          <time className="ww-dashboard-date">{date}</time>
          <h1 id="dashboard-title">
            Langkah baik,
            <br />
            <span>{firstName}.</span>
          </h1>
          <p>Sampah terpilah dimulai dari keputusan kecil hari ini.</p>
          <Link to="/reports/new" className="ww-button ww-button-primary">
            <ClipboardList size={18} />
            Buat laporan
            <ArrowUpRight size={17} />
          </Link>
        </div>
        <Link to="/classify" className="ww-classify-feature">
          <div className="ww-classify-copy">
            <h2>Kenali material dari foto.</h2>
            <p>
              Dapatkan perkiraan kategori, lalu periksa panduan penanganannya.
            </p>
            <span className="ww-feature-link">
              Mulai klasifikasi <ArrowUpRight size={17} />
            </span>
          </div>
          <figure>
            <img
              src="/materials/plastic.jpg"
              alt="Contoh material plastik dari dataset"
            />
            <figcaption>Contoh plastik</figcaption>
          </figure>
        </Link>
      </header>
      {summary.isError && (
        <Failure error={summary.error} retry={() => summary.refetch()} />
      )}
      <section
        className="ww-dashboard-summary"
        aria-label="Ringkasan laporan"
        aria-busy={summary.isPending}
      >
        <article className="ww-summary-total">
          <span>Total laporan</span>
          <strong>{summary.data?.total_reports ?? "—"}</strong>
          <small>Laporan yang kamu buat</small>
        </article>
        <article className="ww-summary-stat">
          <div>
            <Clock3 size={18} aria-hidden="true" />
            <span>Perlu ditangani</span>
          </div>
          <strong>{pending ?? "—"}</strong>
          <small>Menunggu atau sedang diproses</small>
        </article>
        <article className="ww-summary-stat">
          <div>
            <CheckCheck size={18} aria-hidden="true" />
            <span>Selesai ditangani</span>
          </div>
          <strong>{completed ?? "—"}</strong>
          <small>Status dikonfirmasi pengelola</small>
        </article>
      </section>
      <div className="ww-dashboard-content">
        <section className="ww-report-panel" aria-labelledby="recent-reports-title">
          <div className="ww-section-heading">
            <div>
              <h2 id="recent-reports-title">Laporan terbaru</h2>
              <p>Periksa perkembangan laporan yang kamu kirim.</p>
            </div>
            <Link to="/reports" className="ww-text-link">
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
        <aside className="ww-guide-preview">
          <div>
            <h2>Panduan memilah</h2>
            <p>Kenali bahan dan cara penanganan yang sesuai.</p>
            <Link to="/guide" className="ww-text-link">
              Buka panduan <ArrowRight size={17} />
            </Link>
          </div>
          <ul>
            {categories.slice(0, 4).map((category) => (
              <li key={category.id}>
                <Link to={`/guide#${category.id}`}>
                  <span>{category.name}</span>
                  <ArrowUpRight size={15} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      </div>
      <section className="ww-material-overview">
        <div className="ww-section-heading">
          <div>
            <h2>Setiap bahan punya cara penanganan.</h2>
            <p>Telusuri kategori material yang tersedia.</p>
          </div>
          <Link to="/guide" className="ww-text-link">
            Buka panduan
            <ArrowRight size={17} />
          </Link>
        </div>
        <ul className="ww-material-list">
          {categories.slice(0, 6).map((category) => (
            <li key={category.id}>
              <Link to={`/guide#${category.id}`}>
                <span>{category.name}</span>
                <ArrowUpRight size={16} aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </section>
  );
}
