import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";
import { api } from "../api";
import type { ReportsPage, Summary } from "../types";
import { categories, Failure, Loading, statusName } from "../ui";
import { ReportTable } from "../components/ReportTable";
import { ReportDistribution } from "../components/ReportDistribution";
import { useAuth } from "../Auth";
import "./workspace-pages.css";
export default function Reports() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get("page")) || 1);
  const search = params.get("search") || "";
  const [draft, setDraft] = useState(search);
  const status = params.get("status") || "";
  const category = params.get("category") || "";
  function change(key: string, value: string) {
    setParams((old) => {
      const next = new URLSearchParams(old);
      if (value) next.set(key, value);
      else next.delete(key);
      if (key !== "page") next.delete("page");
      return next;
    });
  }
  const setPage = (value: number) => change("page", String(value));
  const navigate = useNavigate();
  const query = new URLSearchParams(params);
  query.set("page", String(page));
  query.set("per_page", "10");
  const result = useQuery({
    queryKey: ["reports", user?.id, query.toString()],
    queryFn: ({ signal }) =>
      api<ReportsPage>(`/api/v1/reports?${query}`, { signal }),
    staleTime: 30000,
  });
  const summary = useQuery({
    queryKey: ["summary"],
    queryFn: () => api<Summary>("/api/v1/stats/summary"),
    staleTime: 30000,
  });
  return (
    <section className="ww-reports-page" aria-labelledby="reports-title">
      <header className="ww-page-intro">
        <div>
          <h1 id="reports-title">Laporan sampah</h1>
          <p>Foto, lokasi, dan perkembangan penanganan dalam satu tempat.</p>
        </div>
      </header>
      <section className="ww-filter-panel" aria-labelledby="report-filter-title">
        <div className="ww-filter-heading">
          <div>
            <h2 id="report-filter-title">Temukan laporan</h2>
            <p>Persempit daftar berdasarkan kata kunci atau detail laporan.</p>
          </div>
          {result.data && (
            <p className="ww-result-count" aria-live="polite">
              <strong>{result.data.pagination.total_items}</strong> laporan
            </p>
          )}
        </div>
        <div className="ww-primary-filters">
          <form
            className="ww-search-form"
            onSubmit={(e) => {
              e.preventDefault();
              change("search", draft);
            }}
          >
            <Search size={18} aria-hidden="true" />
            <input
              id="report-search"
              aria-label="Cari deskripsi laporan"
              placeholder="Cari deskripsi laporan…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={200}
            />
            <button type="submit" className="ww-text-link">
              Cari
            </button>
          </form>
          <label className="ww-filter-field" htmlFor="report-status">
            <span>Status</span>
            <select
              id="report-status"
              value={status}
              onChange={(e) => change("status", e.target.value)}
            >
              <option value="">Semua status</option>
              {Object.entries(statusName).map(([id, label]) => (
                <option value={id} key={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="ww-filter-field" htmlFor="report-category">
            <span>Material</span>
            <select
              id="report-category"
              value={category}
              onChange={(e) => change("category", e.target.value)}
            >
              <option value="">Semua material</option>
              {categories.map((c) => (
                <option value={c.id} key={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="ww-secondary-filters">
          <label className="ww-filter-field" htmlFor="report-date-from">
            <span>Dari tanggal</span>
            <input
              id="report-date-from"
              type="date"
              value={params.get("date_from")?.slice(0, 10) || ""}
              onChange={(e) =>
                change(
                  "date_from",
                  e.target.value ? `${e.target.value}T00:00:00+07:00` : "",
                )
              }
            />
          </label>
          <label className="ww-filter-field" htmlFor="report-date-to">
            <span>Sampai tanggal</span>
            <input
              id="report-date-to"
              type="date"
              value={
                params.get("date_to")
                  ? new Date(params.get("date_to")!).toLocaleDateString(
                      "en-CA",
                      { timeZone: "Asia/Jakarta" },
                    )
                  : ""
              }
              onChange={(e) =>
                change(
                  "date_to",
                  e.target.value ? `${e.target.value}T00:00:00+07:00` : "",
                )
              }
            />
          </label>
          <label className="ww-filter-field" htmlFor="report-sort">
            <span>Urutkan</span>
            <select
              id="report-sort"
              value={params.get("sort") || "newest"}
              onChange={(e) => change("sort", e.target.value)}
            >
              <option value="newest">Terbaru</option>
              <option value="oldest">Terlama</option>
            </select>
          </label>
          {user?.role === "admin" && (
            <label className="ww-review-filter">
              <input
                type="checkbox"
                checked={params.get("needs_review") === "true"}
                onChange={(e) =>
                  change("needs_review", e.target.checked ? "true" : "")
                }
              />
              Perlu review AI
            </label>
          )}
          <button
            className="ww-reset-filter"
            type="button"
            onClick={() => {
              setParams({});
              setDraft("");
            }}
          >
            Reset semua filter
          </button>
        </div>
        {params.get("user_id") && (
          <p className="ww-active-scope">Filter pelapor aktif</p>
        )}
      </section>
      <section className="ww-report-results" aria-label="Hasil laporan">
        {result.isPending ? (
          <Loading />
        ) : result.isError ? (
          <Failure error={result.error} retry={() => result.refetch()} />
        ) : (
          <>
            <ReportTable
              admin={user?.role === "admin"}
              reports={result.data.reports}
              open={(id) => navigate(`/reports/${id}`)}
            />
            {result.data.pagination.total_pages > 1 && (
              <footer className="pagination">
                <span>
                  {result.data.pagination.total_items} laporan · Halaman {page}
                </span>
                <div>
                  <button
                    className="button secondary"
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                  >
                    Sebelumnya
                  </button>
                  <button
                    className="button secondary"
                    disabled={page >= result.data.pagination.total_pages}
                    onClick={() => setPage(page + 1)}
                  >
                    Berikutnya
                  </button>
                </div>
              </footer>
            )}
          </>
        )}
      </section>
      {summary.isError && (
        <Failure error={summary.error} retry={() => summary.refetch()} />
      )}
      {summary.data && summary.data.total_reports > 0 && (
        <section
          className="ww-reports-summary"
          aria-label="Ringkasan komposisi dan progres laporan"
        >
          <ReportDistribution summary={summary.data} />
        </section>
      )}
    </section>
  );
}
