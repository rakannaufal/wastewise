import { useState } from "react";
import { ArrowUpRight, Search } from "lucide-react";
import { categories } from "../ui";
export default function Guide() {
  const [search, setSearch] = useState("");
  const visible = categories.filter((c) =>
    `${c.name} ${c.family} ${c.description}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">12 material, banyak kesempatan</span>
          <h1>Panduan memilah</h1>
          <p className="muted">
            Kenali bahannya. Sesuaikan dengan fasilitas pengumpulan setempat.
          </p>
        </div>
      </div>
      <label className="search-field guide-search">
        <Search size={18} />
        <span className="sr-only">Cari material</span>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari material atau jenis penanganan…"
        />
      </label>
      <div className="guide-grid">
        {visible.map((category) => (
          <article className="guide-item" id={category.id} key={category.id}>
            <img
              src={`/illustrations/materials/${category.id}.svg`}
              alt={`Ilustrasi ${category.name.toLowerCase()}`}
              width="240"
              height="240"
              loading="lazy"
            />
            <div>
              <span className="eyebrow">{category.family}</span>
              <h2>{category.name}</h2>
              <p>{category.description}</p>
              <div className="guide-action">
                <ArrowUpRight size={18} />
                <p>{category.action}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
      {visible.length === 0 && (
        <p className="empty">Material tidak ditemukan. Coba kata lain.</p>
      )}
      <p className="caption guide-source">
        Ilustrasi material WasteWise. Panduan umum; aturan fasilitas setempat
        dapat berbeda.
      </p>
    </>
  );
}
