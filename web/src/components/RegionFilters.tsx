import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { SlidersHorizontal, X } from "lucide-react";
import { api } from "../api";
import { categories, Dialog, Failure, statusName } from "../ui";
import { regionLevels } from "../../../shared/community";
import type { Region } from "../../../shared/community";
import {
  chooseRegion,
  emptyFilters,
  filterCount,
  filterQuery,
} from "../../../shared/filters";
import type { CommunityFilters } from "../../../shared/filters";
function fromParams(params: URLSearchParams): CommunityFilters {
  return {
    codes: [0, 1, 2, 3].map((i) => params.get(`r${i}`) || ""),
    labels: [0, 1, 2, 3].map((i) => params.get(`rn${i}`) || ""),
    category: params.get("category") || "",
    status: params.get("status") || "",
    order: params.get("order") === "oldest" ? "oldest" : "newest",
  };
}
export function communityParams(params: URLSearchParams) {
  return new URLSearchParams(filterQuery(fromParams(params)));
}
function RegionField({
  value,
  onChange,
  level,
}: {
  value: CommunityFilters;
  onChange: (v: CommunityFilters) => void;
  level: number;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [highlight, setHighlight] = useState(0);
  const parent = level ? value.codes[level - 1] : "";
  const disabled = level > 0 && !parent;
  const label = regionLevels[level];
  const id = `region-${level}`;
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(search);
      setHighlight(0);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);
  const query = useQuery({
    queryKey: ["regions", level, parent, debounced],
    queryFn: ({ signal }) =>
      api<{ regions: Region[]; truncated: boolean }>(
        `/api/v1/regions?level=${level + 1}&search=${encodeURIComponent(debounced)}${parent ? "&parent=" + encodeURIComponent(parent) : ""}`,
        { signal },
      ),
    enabled: open && !disabled,
    staleTime: 3600000,
  });
  const rows = [
    { code: "", name: `Semua ${label.toLowerCase()}` },
    ...(query.data?.regions || []),
  ];
  useEffect(() => {
    if (open)
      document
        .getElementById(`${id}-option-${highlight}`)
        ?.scrollIntoView({ block: "nearest" });
  }, [id, highlight, open]);
  function choose(code: string, name: string) {
    onChange(chooseRegion(value, level, code, code ? name : ""));
    setOpen(false);
    setSearch("");
    setDebounced("");
  }
  return (
    <div className="region-field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id}-options`}
        aria-autocomplete="list"
        aria-activedescendant={
          open
            ? `${id}-option-${Math.min(highlight, rows.length - 1)}`
            : undefined
        }
        autoComplete="off"
        disabled={disabled}
        placeholder={`Semua ${label.toLowerCase()}`}
        value={
          open ? search : value.labels?.[level] || value.codes[level] || ""
        }
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setSearch(e.target.value);
          setOpen(true);
        }}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false);
            e.stopPropagation();
          }
          if (["ArrowDown", "ArrowUp"].includes(e.key)) {
            e.preventDefault();
            setOpen(true);
            setHighlight((v) =>
              Math.max(
                0,
                Math.min(rows.length - 1, v + (e.key === "ArrowDown" ? 1 : -1)),
              ),
            );
          }
          if (e.key === "Enter" && open) {
            e.preventDefault();
            const row = rows[Math.min(highlight, rows.length - 1)];
            choose(row.code, row.name);
          }
        }}
      />
      {open && (
        <div className="region-dropdown">
          {query.isFetching && <p role="status">Memuat wilayah…</p>}
          {query.error && (
            <Failure error={query.error} retry={() => void query.refetch()} />
          )}
          <div
            role="listbox"
            id={`${id}-options`}
            aria-label={`Pilihan ${label}`}
          >
            {rows.map((row, i) => (
              <div
                role="option"
                aria-selected={
                  value.codes[level] === row.code ||
                  (!value.codes[level] && !row.code)
                }
                id={`${id}-option-${i}`}
                key={row.code}
                className={highlight === i ? "highlighted" : ""}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(row.code, row.name)}
              >
                {row.name}
              </div>
            ))}
          </div>
          {!query.isPending && !query.data?.regions.length && (
            <p>Tidak ada wilayah yang cocok.</p>
          )}
          {query.data?.truncated && <p>Persempit dengan pencarian.</p>}
        </div>
      )}
    </div>
  );
}
function RegionPicker({
  value,
  onChange,
}: {
  value: CommunityFilters;
  onChange: (v: CommunityFilters) => void;
}) {
  return (
    <fieldset className="region-picker">
      <legend>Lokasi</legend>
      <div className="region-fields">
        {regionLevels.map((label, level) => (
          <RegionField
            key={`${label}-${value.codes[level - 1] || "root"}`}
            value={value}
            onChange={onChange}
            level={level}
          />
        ))}
      </div>
    </fieldset>
  );
}
export default function RegionFilters() {
  const [params, setParams] = useSearchParams();
  const applied = fromParams(params);
  const [draft, setDraft] = useState<CommunityFilters>(emptyFilters);
  const [open, setOpen] = useState(false);
  const [resetVersion, setResetVersion] = useState(0);
  const count = filterCount(applied);
  function apply(value: CommunityFilters) {
    const next = new URLSearchParams(params);
    for (let i = 0; i < 4; i++) {
      next.delete(`r${i}`);
      next.delete(`rn${i}`);
      if (value.codes[i]) {
        next.set(`r${i}`, value.codes[i]);
        if (value.labels?.[i]) next.set(`rn${i}`, value.labels[i]);
      }
    }
    for (const key of ["category", "status", "order"] as const) {
      next.delete(key);
      if (value[key]) next.set(key, value[key]);
    }
    setParams(next);
    setOpen(false);
  }
  const region = applied.codes.filter(Boolean).at(-1);
  return (
    <div className="filter-toolbar">
      <div className="filter-context">
        <strong>
          {applied.labels?.filter(Boolean).at(-1) ||
            (region ? `Wilayah ${region}` : "Seluruh Indonesia")}
        </strong>
        <small>
          {applied.status
            ? statusName[applied.status as keyof typeof statusName]
            : "Semua status"}
        </small>
      </div>
      <button
        className="filter-trigger"
        aria-label="Buka filter"
        aria-haspopup="dialog"
        onClick={() => {
          setDraft(applied);
          setResetVersion((version) => version + 1);
          setOpen(true);
        }}
      >
        <SlidersHorizontal size={19} />
        <span>Filter</span>
        {count > 0 && <b>{count}</b>}
      </button>
      {count > 0 && (
        <div className="active-filters" aria-label="Filter aktif">
          {region && (
            <button
              onClick={() => apply({ ...applied, codes: [], labels: [] })}
            >
              Lokasi: {applied.labels?.filter(Boolean).at(-1) || region}
              <X size={14} aria-label="Hapus filter lokasi" />
            </button>
          )}
          {applied.category && (
            <button onClick={() => apply({ ...applied, category: "" })}>
              {categories.find((c) => c.id === applied.category)?.name ||
                applied.category}
              <X size={14} aria-label="Hapus filter kategori" />
            </button>
          )}
          {applied.status && (
            <button onClick={() => apply({ ...applied, status: "" })}>
              {statusName[applied.status as keyof typeof statusName]}
              <X size={14} aria-label="Hapus filter status" />
            </button>
          )}
          <button onClick={() => apply({ ...emptyFilters, order: "newest" })}>
            Hapus semua
          </button>
        </div>
      )}
      {open && (
        <Dialog title="Filter" onClose={() => setOpen(false)}>
          <form
            className="filter-panel"
            onSubmit={(e) => {
              e.preventDefault();
              apply(draft);
            }}
          >
            <div className="filter-panel-scroll">
              <RegionPicker
                key={resetVersion}
                value={draft}
                onChange={setDraft}
              />
              <div className="filter-selects">
                <label>
                  Kategori sampah
                  <select
                    aria-label="Kategori sampah"
                    value={draft.category}
                    onChange={(e) =>
                      setDraft({ ...draft, category: e.target.value })
                    }
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
                  Status laporan
                  <select
                    aria-label="Status laporan"
                    value={draft.status}
                    onChange={(e) =>
                      setDraft({ ...draft, status: e.target.value })
                    }
                  >
                    <option value="">Semua status</option>
                    {Object.entries(statusName)
                      .filter(([id]) => id !== "Rejected")
                      .map(([id, name]) => (
                        <option key={id} value={id}>
                          {name}
                        </option>
                      ))}
                  </select>
                </label>
              </div>
            </div>
            <div className="filter-panel-actions">
              <button
                type="button"
                className="button secondary"
                onClick={() => {
                  setDraft(emptyFilters);
                  setResetVersion((version) => version + 1);
                }}
              >
                Reset
              </button>
              <button className="button primary" type="submit">
                Terapkan
              </button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}
