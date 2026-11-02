import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { api } from "../api";
import type { ReportsPage } from "../types";
import { categories, Failure, Loading, statusName } from "../ui";
import { ReportTable } from "../components/ReportTable";
export default function Reports() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const navigate = useNavigate();
  const query = new URLSearchParams({
    page: String(page),
    per_page: "10",
    search,
    ...(status && { status }),
    ...(category && { category }),
  });
  const result = useQuery({
    queryKey: ["reports", page, search, status, category],
    queryFn: () => api<ReportsPage>(`/api/v1/reports?${query}`),
  });
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">Catat dan pantau</span>
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
              setSearch(draft);
              setPage(1);
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
              setStatus(e.target.value);
              setPage(1);
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
              setCategory(e.target.value);
              setPage(1);
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
        {result.isPending ? (
          <Loading />
        ) : result.isError ? (
          <Failure error={result.error} retry={() => result.refetch()} />
        ) : (
          <>
            <ReportTable
              reports={result.data.reports}
              open={(id) => navigate(`/reports/${id}`)}
            />
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
          </>
        )}
      </section>
    </>
  );
}
