import { ChevronLeft } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "../api";
import { useAuth } from "../Auth";
import type { LocationEvidence, PhotoDraft, Report } from "../types";
import { locationNames } from "../types";
import { categoryName, Failure, Loading, NextAction } from "../ui";
import { currentLocation, preparePhoto } from "../photo";
import { PhotoInput } from "./PhotoInput";

export function ReportComposer({ title = "Buat laporan" }: { title?: string }) {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const editId = params.get("edit");
  const key = `wastewise.draft.${user?.id}.${editId || "new"}`;
  const [file, setFile] = useState<File | null>(null);
  const [draft, setDraft] = useState<PhotoDraft | null>(null);
  const [original, setOriginal] = useState<Report | null>(null);
  const [description, setDescription] = useState("");
  const [publishToCommunity, setPublishToCommunity] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState<Error | null>(null);
  const [locationError, setLocationError] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [loadedKey, setLoadedKey] = useState("");
  const generation = useRef(0);
  const abort = useRef<AbortController | null>(null);
  const attempt = useRef<{ request: string; final: string }>({
    request: crypto.randomUUID(),
    final: crypto.randomUUID(),
  });
  const navigate = useNavigate();
  const client = useQueryClient();
  useEffect(() => {
    let active = true;
    const pending: Promise<unknown>[] = [];
    const saved = sessionStorage.getItem(key);
    setFile(null);
    setDraft(null);
    setOriginal(null);
    setDescription("");
    setError(null);
    if (editId)
      pending.push(
        api<Report>(`/api/v1/reports/${editId}`)
          .then((row) => {
            if (active) {
              setOriginal(row);
              if (!saved) setDescription(row.description);
            }
          })
          .catch((e) => {
            if (active) setError(e);
          }),
      );
    if (saved) {
      try {
        const stored = JSON.parse(saved) as {
          id: string;
          final: string;
          description: string;
        };
        pending.push(
          api<PhotoDraft>(`/api/v1/report-drafts/${stored.id}`)
            .then((row) => {
              if (active) {
                setDraft(row);
                setDescription(stored.description);
                attempt.current.final = stored.final;
              }
            })
            .catch((e: Error) => {
              if (!active) return;
              if (e instanceof ApiError && [404, 409].includes(e.status))
                sessionStorage.removeItem(key);
              setError(e);
            }),
        );
      } catch {
        sessionStorage.removeItem(key);
      }
    }
    void Promise.allSettled(pending).then(() => {
      if (active) setLoadedKey(key);
    });
    return () => {
      active = false;
      abort.current?.abort();
    };
  }, [key, editId]);
  useEffect(() => {
    if (loadedKey === key && draft)
      sessionStorage.setItem(
        key,
        JSON.stringify({
          id: draft.id,
          final: attempt.current.final,
          description,
        }),
      );
  }, [draft, description, key, loadedKey]);
  async function choose(value: File | null, retry = false) {
    if (!value) return;
    if (!retry) sessionStorage.removeItem(key);
    const version = ++generation.current;
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    if (!retry)
      attempt.current = {
        request: crypto.randomUUID(),
        final: crypto.randomUUID(),
      };
    setFile(value);
    setDraft(null);
    if (!retry) setPublishToCommunity(false);
    setConfirmed(false);
    setError(null);
    setLocationError("");
    setBusy("Mengompresi dan mengenali foto…");
    try {
      const prepared = await preparePhoto(value);
      if (controller.signal.aborted || version !== generation.current) return;
      const form = new FormData();
      form.append("image", prepared.file);
      form.append("request_id", attempt.current.request);
      form.append("photo_source", "gallery");
      let row = await api<PhotoDraft>("/api/v1/report-drafts", {
        method: "POST",
        body: form,
        signal: controller.signal,
      });
      if (version !== generation.current) return;
      setDraft(row);
      if (prepared.location) {
        setBusy("Menyimpan lokasi foto…");
        row = await api<PhotoDraft>(`/api/v1/report-drafts/${row.id}`, {
          method: "PATCH",
          body: JSON.stringify(prepared.location),
          signal: controller.signal,
        });
      }
      if (version === generation.current) setDraft(row);
    } catch (e) {
      if (!controller.signal.aborted && version === generation.current)
        setError(e as Error);
    } finally {
      if (version === generation.current) setBusy("");
    }
  }
  async function locate() {
    if (!draft || !confirmed) return;
    const version = generation.current;
    setBusy("Mencari GPS…");
    setLocationError("");
    try {
      const evidence: LocationEvidence = await currentLocation();
      const row = await api<PhotoDraft>(`/api/v1/report-drafts/${draft.id}`, {
        method: "PATCH",
        body: JSON.stringify(evidence),
      });
      if (version === generation.current) setDraft(row);
    } catch (e) {
      if (version === generation.current)
        setLocationError((e as Error).message);
    } finally {
      if (version === generation.current) setBusy("");
    }
  }
  async function save() {
    setBusy("Menyimpan laporan…");
    setError(null);
    try {
      const row = await api<Report>(
        editId ? `/api/v1/reports/${editId}` : "/api/v1/reports",
        {
          method: editId ? "PATCH" : "POST",
          headers: { "Idempotency-Key": attempt.current.final },
          body: JSON.stringify({
            description,
            ...(!editId && publishToCommunity
              ? { publication_policy: "public-gps-v2" }
              : {}),
            ...(draft ? { draft_id: draft.id } : {}),
            ...(editId ? { revision: original?.revision } : {}),
          }),
        },
      );
      sessionStorage.removeItem(key);
      client.setQueryData(["report", user?.id, row.id], row);
      await client.invalidateQueries();
      navigate(`/reports/${row.id}`);
    } catch (e) {
      setError(e as Error);
    } finally {
      setBusy("");
    }
  }
  const deleting = busy === "Menghapus draft…";
  const result = draft?.prediction;
  async function discard() {
    if (busy) return;
    setBusy("Menghapus draft…");
    setError(null);
    try {
      if (draft)
        await api(`/api/v1/report-drafts/${draft.id}`, { method: "DELETE" });
      sessionStorage.removeItem(key);
      setDraft(null);
      setFile(null);
      setConfirmed(false);
      setPublishToCommunity(false);
      setDescription(original?.description || "");
      setLocationError("");
    } catch (e) {
      setError(e as Error);
    } finally {
      setBusy("");
    }
  }
  const canSave =
    (!editId || original) &&
    (draft
      ? result &&
        draft.latitude !== null &&
        draft.location_source !== "legacy_unknown"
      : editId && !file);
  if (loadedKey !== key) return <Loading />;
  return (
    <>
      <Link
        to="/reports"
        className="icon-button back"
        aria-label="Kembali ke laporan"
        title="Kembali ke laporan"
      >
        <ChevronLeft size={24} />
      </Link>
      <div className="page-heading">
        <div>
          <h1>{editId ? "Edit laporan" : title}</h1>
          <p className="muted">
            Foto dianalisis otomatis. Kategori dan koordinat tidak perlu diisi.
          </p>
        </div>
      </div>
      <div className="new-report-grid">
        <section className="panel padded">
          <h2>Foto sampah</h2>
          {!deleting && (file || draft) && (
            <button
              className="button secondary"
              disabled={!!busy}
              onClick={() => {
                void discard();
              }}
            >
              Hapus draft foto
            </button>
          )}
          <PhotoInput
            file={deleting ? null : file}
            preview={deleting ? "" : draft?.image_url}
            disabled={!!busy}
            onChange={(value) => {
              void choose(value);
            }}
          />
          {file && !draft && !busy && (
            <button
              className="button secondary"
              onClick={() => {
                void choose(file, true);
              }}
            >
              Coba upload foto yang sama
            </button>
          )}
          <p className="caption">
            Satu objek dominan, cahaya cukup. Hindari wajah dan data pribadi.
            Pengambilan foto langsung tersedia di aplikasi HP.
          </p>
        </section>
        <section className="panel padded" aria-live="polite">
          <h2>Hasil otomatis</h2>
          {busy && <p role="status">{busy}</p>}
          {!deleting && result ? (
            <>
              <h3>{categoryName(result.category)}</h3>
              <p>{result.confidence.toFixed(1)}% confidence model</p>
              <NextAction category={result.category} />
              <p className="caption">
                {draft.classification_state === "needs_review"
                  ? "Hasil perlu review admin. Ambil foto ulang bila objek kurang jelas."
                  : "Kategori dihasilkan model. Hasil tetap dapat keliru."}
              </p>
            </>
          ) : (
            <p className="muted">
              {deleting
                ? "Foto disembunyikan selama penghapusan. Jika gagal, draft ditampilkan kembali."
                : "Pilih foto untuk memulai analisis."}
            </p>
          )}
          {!deleting && draft && !result && (
            <button
              className="button secondary"
              disabled={!!busy}
              onClick={async () => {
                setBusy("Mencoba model kembali…");
                try {
                  setDraft(
                    await api<PhotoDraft>(
                      `/api/v1/report-drafts/${draft.id}/retry`,
                      { method: "POST" },
                    ),
                  );
                } catch (e) {
                  setError(e as Error);
                } finally {
                  setBusy("");
                }
              }}
            >
              Coba analisis tanpa upload ulang
            </button>
          )}
          {!deleting && draft && (
            <>
              <h3>Lokasi laporan</h3>
              {draft.latitude !== null ? (
                <p>
                  {locationNames[draft.location_source]}
                  <br />
                  {draft.latitude.toFixed(6)}, {draft.longitude?.toFixed(6)}
                  {draft.location_accuracy_m !== null &&
                    ` · ±${draft.location_accuracy_m} m`}
                </p>
              ) : (
                <>
                  <label className="confirmation">
                    <input
                      type="checkbox"
                      checked={confirmed}
                      onChange={(e) => setConfirmed(e.target.checked)}
                    />
                    Foto ini diambil di lokasi saya saat ini.
                  </label>
                  <button
                    className="button secondary"
                    disabled={!confirmed || !!busy}
                    onClick={() => {
                      void locate();
                    }}
                  >
                    Konfirmasi dan ambil GPS otomatis
                  </button>
                  <p className="caption">
                    GPS foto tidak tersedia. Jika tempat berbeda, ambil foto
                    ulang di lokasi sampah.
                  </p>
                </>
              )}
              {locationError && (
                <p role="alert" className="field-error">
                  {locationError}
                </p>
              )}
            </>
          )}
          {!editId && (
            <p className="publication-notice">
              Laporan baru hanya terlihat olehmu dan pengelola. Jika dibagikan,
              foto, deskripsi, dan lokasi yang kamu kirim dapat dilihat siapa
              pun, termasuk tanpa akun. Lokasi tidak diverifikasi oleh WasteWise.
              Hindari wajah, data pribadi, dan lokasi sensitif.
            </p>
          )}
          {!editId && (
            <label className="confirmation">
              <input
                type="checkbox"
                checked={publishToCommunity}
                onChange={(event) => setPublishToCommunity(event.target.checked)}
              />
              Bagikan foto turunan, deskripsi, kategori/status, dan GPS presisi ke feed serta peta publik. Siapa pun, termasuk tanpa akun, dapat melihatnya.
            </label>
          )}
          {!editId && (
            <p className="caption">
              <Link to="/privacy">Baca kebijakan privasi</Link>
            </p>
          )}
          <label htmlFor="report-description">Deskripsi (opsional)</label>
          <textarea
            id="report-description"
            disabled={deleting || (!!editId && !original)}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={5000}
            rows={4}
            placeholder="Jelaskan kondisi dan tempat sampah ditemukan."
          />
          {editId && !draft && (
            <p className="caption">
              Tanpa foto pengganti, kategori dan lokasi laporan tetap
              menggunakan data tersimpan.
            </p>
          )}
          {error && <Failure error={error} />}
          <button
            className="button primary full"
            disabled={!!busy || !canSave}
            onClick={() => {
              void save();
            }}
          >
            {busy
              ? "Memproses…"
              : editId
                ? "Simpan perubahan"
                : "Kirim laporan"}
          </button>
        </section>
      </div>
    </>
  );
}
