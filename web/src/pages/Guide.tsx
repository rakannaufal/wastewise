import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { categories } from "../ui";
export default function Guide() {
  const [search, setSearch] = useState("");
  useEffect(() => {
    const target = document.getElementById(window.location.hash.slice(1));
    target?.scrollIntoView({ block: "start" });
  }, []);
  const query = search.trim().toLocaleLowerCase("id-ID");
  const visible = categories.filter((c) =>
    `${c.name} ${c.family} ${c.description} ${c.action}`
      .toLocaleLowerCase("id-ID")
      .includes(query),
  );
  return (
    <div className="guide-page">
      <div className="page-heading">
        <div>
          <h1>Panduan memilah sampah</h1>
          <p className="muted">
            Cari bahan atau cara penanganannya. Aturan penerimaan dapat berbeda
            di setiap daerah.
          </p>
        </div>
      </div>
      <div className="search-field guide-search">
        <Search size={18} aria-hidden="true" />
        <label className="sr-only" htmlFor="guide-search">
          Cari kategori material
        </label>
        <input
          id="guide-search"
          type="search"
          autoComplete="off"
          aria-controls="guide-results"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Contoh: baterai, plastik, kompos"
        />
        {search && (
          <button
            type="button"
            className="icon-button guide-search-clear"
            aria-label="Hapus pencarian"
            onClick={() => setSearch("")}
          >
            <X size={18} aria-hidden="true" />
          </button>
        )}
      </div>
      <p className="guide-result-count" role="status">
        {query
          ? `${visible.length} kategori ditemukan untuk “${search.trim()}”`
          : `${visible.length} kategori`}
      </p>
      <div id="guide-results" className="guide-grid">
        {visible.map((category) => (
          <article className="guide-item" id={category.id} key={category.id}>
            <img
              src={`/illustrations/materials/${category.id}.svg`}
              alt=""
              aria-hidden="true"
              width="240"
              height="240"
              loading="lazy"
            />
            <div>
              <div className="guide-title-row">
                <h2>{category.name}</h2>
                <span className="guide-family">{category.family}</span>
              </div>
              <p>{category.description}</p>
              <div className="guide-action">
                <span className="guide-action-label">Langkah penanganan</span>
                <p>{category.action}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
      {visible.length === 0 && (
        <div className="guide-empty">
          <h2>Material tidak ditemukan.</h2>
          <p>Coba kata lain atau tampilkan semua kategori kembali.</p>
          <button
            type="button"
            className="text-button"
            onClick={() => setSearch("")}
          >
            Hapus pencarian
          </button>
        </div>
      )}
      <p className="caption guide-source">
        Ilustrasi material WasteWise. Panduan umum; aturan fasilitas setempat
        dapat berbeda.
      </p>
    </div>
  );
}
