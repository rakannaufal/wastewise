import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Map as MapLibre,
  Marker,
  NavigationControl,
  setWorkerUrl,
} from "maplibre-gl";
import mapWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import "maplibre-gl/dist/maplibre-gl.css";
import { api } from "../api";
import { Failure, Loading } from "../ui";
import { ChevronLeft } from "lucide-react";
import { parsePostId } from "../../../shared/community";
import RegionFilters, { communityParams } from "../components/RegionFilters";
import type { MapPoints } from "../../../shared/community";
// Vite relocates the main module; bundle its worker explicitly so relative URLs stay valid.
setWorkerUrl(mapWorkerUrl);
export default function WasteMap() {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibre | null>(null);
  const [view, setView] = useState({ bbox: "94,-12,142,7", zoom: 4 });
  const [mapError, setMapError] = useState("");
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const sourcePost = parsePostId(params.get("post"));
  const filter = communityParams(params).toString();
  const focusLat = params.get("lat"),
    focusLng = params.get("lng");
  const points = useQuery({
    queryKey: ["community", "map", view, filter],
    queryFn: ({ signal }) =>
      api<MapPoints>(
        `/api/v1/community/map?bbox=${view.bbox}&zoom=${view.zoom}&${filter}`,
        { signal },
      ),
    refetchInterval: 60000,
  });
  useEffect(() => {
    if (!container.current) return;
    let instance: MapLibre;
    try {
      instance = new MapLibre({
        container: container.current,
        center: [118, -2.5],
        zoom: 4,
        style: {
          version: 8,
          sources: {
            osm: {
              type: "raster",
              tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
              tileSize: 256,
              attribution:
                '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            },
          },
          layers: [{ id: "osm", type: "raster", source: "osm" }],
        },
      });
    } catch {
      setMapError(
        "Peta interaktif tidak didukung perangkat ini. Gunakan daftar lokasi di bawah.",
      );
      return;
    }
    map.current = instance;
    instance.addControl(new NavigationControl());
    const update = () => {
      const b = instance.getBounds();
      setView({
        bbox: [
          Math.max(-180, b.getWest()),
          Math.max(-90, b.getSouth()),
          Math.min(180, b.getEast()),
          Math.min(90, b.getNorth()),
        ].join(","),
        zoom: Math.max(2, Math.min(20, Math.floor(instance.getZoom()))),
      });
    };
    instance.on("moveend", update);
    instance.on("error", () =>
      setMapError(
        "Sebagian ubin peta gagal dimuat. Daftar lokasi tetap tersedia di bawah.",
      ),
    );
    return () => {
      instance.remove();
      map.current = null;
    };
  }, []);
  useEffect(() => {
    if (!focusLat || !focusLng) return;
    const lat = Number(focusLat),
      lng = Number(focusLng);
    if (
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      Math.abs(lat) <= 90 &&
      Math.abs(lng) <= 180
    )
      map.current?.jumpTo({ center: [lng, lat], zoom: 16 });
  }, [focusLat, focusLng]);
  useEffect(() => {
    if (!map.current) return;
    const markers = points.data?.features.map((p) => {
      const button = document.createElement("button");
      button.className = "map-marker";
      button.textContent = p.count > 1 ? String(p.count) : "•";
      button.setAttribute(
        "aria-label",
        p.count > 1
          ? `${p.count} laporan. Perbesar area`
          : "Buka laporan sampah",
      );
      button.onclick = () =>
        p.post_id
          ? navigate(`/community/${p.post_id}`)
          : map.current?.easeTo({
              center: [p.longitude, p.latitude],
              zoom: Math.min(20, view.zoom + 2),
            });
      return new Marker({ element: button })
        .setLngLat([p.longitude, p.latitude])
        .addTo(map.current!);
    });
    return () => markers?.forEach((m) => m.remove());
  }, [points.data, navigate, view.zoom]);
  return (
    <>
      {sourcePost && (
        <Link
          className="icon-button map-return"
          aria-label="Kembali ke posting"
          title="Kembali ke posting"
          to={`/community/${sourcePost}`}
        >
          <ChevronLeft size={24} />
        </Link>
      )}
      <div className="page-heading">
        <div>
          <h1>Peta lingkungan.</h1>
          <p>
            Hanya laporan yang dibagikan ke komunitas. Perbesar untuk melihat
            setiap titik.
          </p>
        </div>
      </div>
      <RegionFilters />
      {points.error && (
        <Failure error={points.error} retry={() => void points.refetch()} />
      )}
      <div className="waste-map-frame">
        <div
          ref={container}
          className="waste-map"
          role="region"
          aria-label="Peta lokasi laporan sampah"
        />
        {points.isPending && (
          <div className="map-skeleton-overlay">
            <Loading />
          </div>
        )}
      </div>
      {mapError && <p role="status">{mapError}</p>}
      <p role="status">
        {points.isFetching
          ? "Memuat titik…"
          : `${points.data?.features.length || 0} titik atau kelompok pada area ini.`}
        {points.data?.truncated
          ? " Perbesar peta untuk melihat titik lainnya."
          : ""}
      </p>
      <details>
        <summary>Daftar lokasi yang dapat diakses tanpa peta</summary>
        <ul>
          {points.data?.features.map((p, i) => (
            <li key={i}>
              {p.post_id ? (
                <a href={`/community/${p.post_id}`}>
                  Lihat laporan {p.latitude.toFixed(5)},{" "}
                  {p.longitude.toFixed(5)}
                </a>
              ) : (
                `${p.count} laporan di ${p.latitude.toFixed(3)}, ${p.longitude.toFixed(3)}; perbesar peta`
              )}
            </li>
          ))}
        </ul>
      </details>
      <small>
        Ubin OpenStreetMap memerlukan internet. Jangan mengunduh massal atau
        menyimpan peta offline. Penyedia ubin production perlu ditetapkan
        sebelum peluncuran.
      </small>
    </>
  );
}
