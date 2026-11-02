import { useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { LocateFixed, ArrowLeft } from "lucide-react";
import { api } from "../api";
import { categories, Failure } from "../ui";
import { PhotoInput } from "../components/PhotoInput";
import type { Report } from "../types";
export default function NewReport() {
  const state = useLocation().state as {
    file?: File;
    category?: string;
  } | null;
  const [file, setFile] = useState<File | null>(state?.file || null);
  const [category, setCategory] = useState(state?.category || "");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [locationError, setLocationError] = useState("");
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [busy, setBusy] = useState(false);
  const client = useQueryClient();
  const navigate = useNavigate();
  function locate() {
    setLocationError("");
    if (!navigator.geolocation) {
      setLocationError("Lokasi tidak didukung. Isi koordinat manual.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(7));
        setLongitude(position.coords.longitude.toFixed(7));
        setLocating(false);
      },
      () => {
        setLocationError(
          "Lokasi tidak tersedia atau izin ditolak. Isi koordinat manual.",
        );
        setLocating(false);
      },
      { timeout: 10000, maximumAge: 60000 },
    );
  }
  return (
    <>
      <Link to="/reports" className="text-button back">
        <ArrowLeft size={17} />
        Kembali ke laporan
      </Link>
      <div className="page-heading">
        <div>
          <span className="eyebrow">Satu laporan, satu langkah</span>
          <h1>Buat laporan</h1>
          <p className="muted">
            Pastikan foto jelas dan lokasi sesuai tempat sampah ditemukan.
          </p>
        </div>
      </div>
      <form
        className="new-report-grid"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!file) {
            setError(new Error("Pilih foto terlebih dahulu."));
            return;
          }
          setBusy(true);
          setError(null);
          const form = new FormData(e.currentTarget);
          form.set("image", file);
          try {
            const report = await api<Report>("/api/v1/reports", {
              method: "POST",
              body: form,
            });
            await client.invalidateQueries();
            navigate(`/reports/${report.id}`);
          } catch (error) {
            setError(error as Error);
          } finally {
            setBusy(false);
          }
        }}
      >
        <section className="panel padded">
          <h2>
            01 <span>Foto material</span>
          </h2>
          <PhotoInput file={file} onChange={setFile} />
          <p className="caption">
            Foto disimpan privat. Hindari wajah, plat kendaraan, dan informasi
            pribadi.
          </p>
        </section>
        <section className="panel padded">
          <h2>
            02 <span>Detail laporan</span>
          </h2>
          <label>
            Material
            <select
              name="category"
              required
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="" disabled>
                Pilih kategori material
              </option>
              {categories.map((c) => (
                <option value={c.id} key={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Deskripsi
            <textarea
              name="description"
              minLength={10}
              maxLength={5000}
              rows={4}
              required
              placeholder="Contoh: Botol plastik terkumpul di dekat pintu taman, perlu diangkut."
            />
          </label>
          <div className="location-heading">
            <strong>Lokasi sampah</strong>
            <button
              type="button"
              className="text-button"
              disabled={locating}
              onClick={locate}
            >
              <LocateFixed size={17} />
              {locating ? "Mencari…" : "Gunakan lokasi saat ini"}
            </button>
          </div>
          <div className="coordinate-fields">
            <label>
              Latitude
              <input
                name="latitude"
                type="number"
                step="any"
                min={-90}
                max={90}
                required
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder="-6.200000"
              />
            </label>
            <label>
              Longitude
              <input
                name="longitude"
                type="number"
                step="any"
                min={-180}
                max={180}
                required
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                placeholder="106.816666"
              />
            </label>
          </div>
          {locationError && (
            <p role="status" className="field-error">
              {locationError}
            </p>
          )}
          <p className="caption">
            Koordinat dapat diisi manual. Lokasi akan terlihat oleh pengelola.
          </p>
          {error && <Failure error={error} />}
          <button className="button primary full" disabled={busy}>
            {busy ? "Menyimpan laporan…" : "Simpan laporan"}
          </button>
        </section>
      </form>
    </>
  );
}
