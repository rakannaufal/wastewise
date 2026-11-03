import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { api } from "../api";
import type { ReportsPage } from "../types";
import { categories, Failure, Loading, statusName } from "../ui";
import { ReportTable } from "../components/ReportTable";
import { useAuth } from "../Auth";
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
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Laporan sampah</h1>
          <p className="muted">
            Foto, lokasi, dan perkembangan penanganan dalam satu tempat.
          </p>
        </div>
        <Link className="button primary" to="/reports/new">
          <Plus size={18} />
          Buat laporan
        </Link>
      </div>
      <section className="panel">
        <div className="filters">
          <form
            className="search-field"
            onSubmit={(e) => {
              e.preventDefault();
              change("search", draft);
            }}
          >
            <Search size={18} />
            <input
              aria-label="Cari deskripsi laporan"
              placeholder="Cari deskripsi laporan…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={200}
            />
            <button type="submit" className="text-button">
              Cari
            </button>
          </form>
          <select
            aria-label="Filter status"
            value={status}
            onChange={(e) => {
              change("status", e.target.value);
            }}
          >
            <option value="">Semua status</option>
            {Object.entries(statusName).map(([id, label]) => (
              <option value={id} key={id}>
                {label}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter kategori"
            value={category}
            onChange={(e) => {
              change("category", e.target.value);
            }}
          >
            <option value="">Semua material</option>
            {categories.map((c) => (
              <option value={c.id} key={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="filters secondary-filters">
          <label>
            Dari tanggal
            <input
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
          <label>
            Sebelum tanggal
            <input
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
          <label>
            Urutan
            <select
              value={params.get("sort") || "newest"}
              onChange={(e) => change("sort", e.target.value)}
            >
              <option value="newest">Terbaru</option>
              <option value="oldest">Terlama</option>
            </select>
          </label>
          {user?.role === "admin" && (
            <label className="confirmation">
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
          {params.get("user_id") && (
            <p className="caption">Filter pelapor aktif</p>
          )}
          <button
            className="text-button"
            onClick={() => {
              setParams({});
              setDraft("");
            }}
          >
            Reset filter
          </button>
        </div>
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
    </>
  );
}
