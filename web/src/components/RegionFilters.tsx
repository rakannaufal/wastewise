import { useState, useDeferredValue } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { api } from "../api";
import { categories, statusName } from "../ui";
import { regionLevels } from "../../../shared/community";
import type { Region } from "../../../shared/community";
export function communityParams(params: URLSearchParams) {
  const result = new URLSearchParams();
  const code = [3, 2, 1, 0].map((i) => params.get(`r${i}`)).find(Boolean);
  if (code) result.set("region_code", code);
  for (const key of ["category", "status"])
    if (params.get(key)) result.set(key, params.get(key)!);
  return result;
}
function RegionSelect({ level }: { level: number }) {
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const deferred = useDeferredValue(search);
  const parent = level ? params.get(`r${level - 1}`) : null;
  const query = useQuery({
    queryKey: ["regions", parent, level, deferred],
    queryFn: ({ signal }) =>
      api<{ regions: Region[]; truncated: boolean }>(
        `/api/v1/regions?level=${level + 1}&search=${encodeURIComponent(deferred)}${parent ? "&parent=" + encodeURIComponent(parent) : ""}`,
        { signal },
      ),
    enabled: level === 0 || !!parent,
    staleTime: 3600000,
  });
  return (
    <label>
      {regionLevels[level]}
      <input
        aria-label={`Cari ${regionLevels[level]}`}
        placeholder="Cari nama wilayah"
        disabled={level > 0 && !parent}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <select
        value={params.get(`r${level}`) || ""}
        disabled={level > 0 && !parent}
        onChange={(e) => {
          const next = new URLSearchParams(params);
          for (let i = level; i < 4; i++) next.delete(`r${i}`);
          if (e.target.value) next.set(`r${level}`, e.target.value);
          setParams(next);
        }}
      >
        <option value="">{query.isFetching ? "Memuat…" : "Semua"}</option>
        {query.data?.regions.map((r) => (
          <option key={r.code} value={r.code}>
            {r.name}
          </option>
        ))}
      </select>
      {query.isError && (
        <button onClick={() => void query.refetch()} type="button">
          Muat ulang wilayah
        </button>
      )}
      {query.data?.truncated && (
        <small>Daftar dibatasi. Gunakan pencarian wilayah.</small>
      )}
    </label>
  );
}
export default function RegionFilters() {
  const [params, setParams] = useSearchParams();
  const change = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next);
  };
  return (
    <details className="community-filters" open>
      <summary>Filter lokasi dan laporan</summary>
      <div className="filter-fields">
        {[0, 1, 2, 3].map((i) => (
          <RegionSelect
            key={`${i}-${params.get(`r${i - 1}`) || ""}`}
            level={i}
          />
        ))}
        <label>
          Material
          <select
            value={params.get("category") || ""}
            onChange={(e) => change("category", e.target.value)}
          >
            <option value="">Semua material</option>
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
            value={params.get("status") || ""}
            onChange={(e) => change("status", e.target.value)}
          >
            <option value="">Semua status</option>
            {Object.entries(statusName).map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <button className="text-button" onClick={() => setParams({})}>
        Hapus filter
      </button>
    </details>
  );
}
