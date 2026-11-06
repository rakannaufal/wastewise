import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import {
  Map as MapLibre,
  Marker,
  NavigationControl,
  setWorkerUrl,
} from "maplibre-gl";
import mapWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import "maplibre-gl/dist/maplibre-gl.css";
import { api } from "../api";
import { categoryName, date, Failure, Loading } from "../ui";
import { ChevronLeft, ImageOff, MapPin, X } from "lucide-react";
import { parsePostId } from "../../../shared/community";
import RegionFilters, { communityParams } from "../components/RegionFilters";
import type { MapPoints, Post } from "../../../shared/community";
// Vite relocates the main module; bundle its worker explicitly so relative URLs stay valid.
setWorkerUrl(mapWorkerUrl);
export default function WasteMap() {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibre | null>(null);
  const [view, setView] = useState({ bbox: "94,-12,142,7", zoom: 4 });
  const [mapError, setMapError] = useState("");
  const [params] = useSearchParams();
  const sourcePost = parsePostId(params.get("post"));
  const [selectedPostId, setSelectedPostId] = useState<string | null>(sourcePost);
  const [failedPhotoUrl, setFailedPhotoUrl] = useState<string | null>(null);
  const detailHeading = useRef<HTMLHeadingElement>(null);
  const activeMarker = useRef<HTMLButtonElement>(null);
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
    placeholderData: (previousData, previousQuery) =>
      previousQuery?.queryKey[3] === filter ? previousData : undefined,
    refetchInterval: 60000,
  });
  const selectedPost = useQuery({
    queryKey: ["community", "map-post", selectedPostId],
    queryFn: ({ signal }) =>
      api<Post>(`/api/v1/community/posts/${selectedPostId!}`, { signal }),
    enabled: selectedPostId !== null,
  });
  useEffect(() => {
    if (sourcePost) setSelectedPostId(sourcePost);
  }, [sourcePost]);
  useEffect(() => {
    if (selectedPost.data?.id === selectedPostId)
      detailHeading.current?.focus();
  }, [selectedPost.data?.id, selectedPostId]);
  function closeDetails() {
    const marker = activeMarker.current;
    setSelectedPostId(null);
    if (marker?.isConnected) marker.focus();
  }
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
        "Peta interaktif tidak tersedia di browser ini. Gunakan daftar lokasi di bawah.",
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
        "Peta latar tidak dapat dimuat. Daftar laporan tetap bisa dibuka di bawah.",
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
      const postId = parsePostId(p.post_id);
      button.type = "button";
      button.className = "map-marker";
      button.textContent = p.count > 1 ? String(p.count) : "•";
      button.setAttribute("aria-label", postId
        ? "Tampilkan detail laporan"
        : `Perbesar ${p.count} laporan di area ini`);
      button.onclick = () => {
        if (postId) {
          activeMarker.current = button;
          setSelectedPostId(postId);
        } else {
          activeMarker.current = null;
          setSelectedPostId(null);
          map.current?.easeTo({
              center: [p.longitude, p.latitude],
              zoom: Math.min(20, view.zoom + 2),
            });
        }
      };
      return new Marker({ element: button })
        .setLngLat([p.longitude, p.latitude])
        .addTo(map.current!);
    });
    return () => markers?.forEach((m) => m.remove());
  }, [points.data, view.zoom]);
  const locationFeatures = points.data?.features ?? [];
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
          <h1>Peta laporan warga</h1>
          <p>
            Peta hanya menampilkan laporan yang pemiliknya setujui untuk
            dibagikan. Perbesar untuk melihat lokasi yang berdekatan.
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
        {selectedPostId && (
          <aside className="map-post-detail" aria-labelledby="map-post-title">
            <header className="map-post-detail-header">
              <h2 id="map-post-title" ref={detailHeading} tabIndex={-1}>
                Detail laporan
              </h2>
              <button
                className="icon-button map-post-close"
                type="button"
                aria-label="Tutup detail laporan"
                onClick={closeDetails}
              >
                <X size={20} />
              </button>
            </header>
            {selectedPost.isPending ? (
              <div className="map-post-state">
                <Loading />
              </div>
            ) : selectedPost.error ? (
              <div className="map-post-state">
                <Failure
                  error={selectedPost.error}
                  retry={() => void selectedPost.refetch()}
                />
              </div>
            ) : selectedPost.data ? (
              <>
                {selectedPost.data.image_url &&
                failedPhotoUrl !== selectedPost.data.image_url ? (
                  <img
                    className="map-post-photo"
                    src={selectedPost.data.image_url}
                    alt={`Foto laporan: ${categoryName(selectedPost.data.category)}`}
                    loading="eager"
                    decoding="async"
                    width="720"
                    height="450"
                    onError={() =>
                      setFailedPhotoUrl(selectedPost.data!.image_url)
                    }
                  />
                ) : (
                  <div
                    className="map-post-image-fallback"
                    role="img"
                    aria-label="Foto laporan tidak tersedia"
                  >
                    <ImageOff size={20} aria-hidden="true" />
                    <span>Foto tidak tersedia</span>
                  </div>
                )}
                <div className="map-post-content">
                  <p className="map-post-category">
                    {categoryName(selectedPost.data.category)}
                  </p>
                  <p className="map-post-caption">
                    {selectedPost.data.caption || "Tidak ada deskripsi."}
                  </p>
                  <div className="map-post-meta">
                    <span>{selectedPost.data.author_name}</span>
                    <time dateTime={selectedPost.data.created_at}>
                      {date(selectedPost.data.created_at)}
                    </time>
                  </div>
                  {selectedPost.data.location_label && (
                    <p className="map-post-location">
                      <MapPin size={16} aria-hidden="true" />
                      <span>{selectedPost.data.location_label}</span>
                    </p>
                  )}
                  <Link
                    className="map-post-link"
                    to={`/community/${selectedPost.data.id}`}
                  >
                    Lihat laporan lengkap
                  </Link>
                </div>
              </>
            ) : null}
          </aside>
        )}
      </div>
      {mapError && (
        <p className="map-notice" role="status">
          {mapError}
        </p>
      )}
      <p className="map-count-status" role="status" aria-live="polite">
        {points.isPending && !points.data
          ? "Memuat lokasi laporan…"
          : !points.data
            ? "Jumlah lokasi belum tersedia."
            : locationFeatures.length === 0
              ? "Belum ada laporan publik pada area dan filter ini."
              : `${locationFeatures.length} titik atau kelompok laporan pada tampilan peta.`}
        {points.data?.truncated
          ? " Perbesar peta untuk melihat lokasi dengan lebih terperinci."
          : ""}
      </p>
      <details className="map-location-list">
        <summary>Daftar lokasi laporan</summary>
        {points.isPending && !points.data ? (
          <p role="status">Memuat daftar lokasi…</p>
        ) : !points.data ? (
          <p>Daftar lokasi belum tersedia. Coba lagi setelah koneksi pulih.</p>
        ) : locationFeatures.length === 0 ? (
          <p>Belum ada laporan publik pada area dan filter ini.</p>
        ) : (
          <ul>
            {locationFeatures.map((p) => (
              <li key={p.post_id ?? `${p.latitude}-${p.longitude}`}>
                {p.post_id ? (
                  <Link to={`/community/${p.post_id}`}>Buka laporan</Link>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      map.current?.easeTo({
                        center: [p.longitude, p.latitude],
                        zoom: Math.min(20, view.zoom + 2),
                      })
                    }
                  >
                    Perbesar area dengan {p.count} laporan
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </details>
      <p className="map-note">
        Peta latar memerlukan koneksi internet. Jika peta tidak muncul, buka
        laporan melalui daftar lokasi.
      </p>
    </>
  );
}
