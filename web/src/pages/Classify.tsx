import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, ScanLine } from "lucide-react";
import { api } from "../api";
import type { Prediction } from "../types";
import { categoryName, Failure, NextAction } from "../ui";
import { PhotoInput } from "../components/PhotoInput";
export default function Classify() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<Prediction | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  async function classify() {
    if (!file) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const form = new FormData();
      form.append("image", file);
      setResult(
        await api<Prediction>("/api/v1/predict", {
          method: "POST",
          body: form,
        }),
      );
    } catch (error) {
      setError(error as Error);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">Kenali sebelum memilah</span>
          <h1>Klasifikasi foto</h1>
          <p className="muted">
            Perkiraan material, disertai langkah penanganannya.
          </p>
        </div>
      </div>
      <div className="classification-grid">
        <section className="panel padded">
          <PhotoInput
            file={file}
            onChange={(value) => {
              setFile(value);
              setResult(null);
              setError(null);
            }}
          />
          <button
            className="button primary full"
            onClick={classify}
            disabled={!file || busy}
          >
            <ScanLine size={18} />
            {busy ? "Mengenali material…" : "Kenali material"}
          </button>
        </section>
        <section className="classification-result" aria-live="polite">
          {error && (
            <>
              <Failure error={error} />
              <Link to="/reports/new" className="text-button">
                Buat laporan dengan kategori manual
                <ArrowRight size={16} />
              </Link>
            </>
          )}
          {result ? (
            <>
              <span className="eyebrow">Perkiraan kategori</span>
              <h2 className="result-title">{categoryName(result.category)}</h2>
              <p className="confidence">
                {result.confidence.toFixed(1)}% <span>confidence model</span>
              </p>
              <NextAction category={result.category} />
              <h3>Kemungkinan lain</h3>
              <div className="probabilities">
                {Object.entries(result.probabilities)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 3)
                  .map(([category, probability]) => (
                    <div key={category}>
                      <span>{categoryName(category)}</span>
                      <meter
                        value={probability}
                        min={0}
                        max={100}
                        aria-label={categoryName(category)}
                      />
                      <strong>{probability.toFixed(1)}%</strong>
                    </div>
                  ))}
              </div>
              <p className="caption">
                Model {result.model_version}. Hasil dapat keliru, terutama untuk
                objek campuran atau foto di luar contoh dataset. Periksa
                kategori sebelum menyimpan.
              </p>
              <button
                className="button primary"
                onClick={() =>
                  navigate("/reports/new", {
                    state: { file, category: result.category },
                  })
                }
              >
                Lanjutkan menjadi laporan
                <ArrowRight size={18} />
              </button>
            </>
          ) : (
            !error && (
              <div className="result-empty">
                <span className="eyebrow">Dari foto ke tindakan</span>
                <h2>Hasilnya akan muncul di sini.</h2>
                <p>
                  Pilih foto satu objek. WasteWise membandingkannya dengan 12
                  kategori material.
                </p>
                <ol>
                  <li>Foto objek dengan jelas.</li>
                  <li>Periksa hasil dan panduannya.</li>
                  <li>Simpan laporan bila perlu penanganan.</li>
                </ol>
              </div>
            )
          )}
        </section>
      </div>
    </>
  );
}
