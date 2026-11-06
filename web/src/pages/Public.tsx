import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowRight,
  Camera,
  Check,
} from "lucide-react";
import categories from "../../../shared/categories.json";
import { Brand, Failure } from "../ui";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api";
import { useAuth } from "../Auth";
import type { Feed } from "../../../shared/community";
import SiteHeader from "../components/SiteHeader";
import PostCard from "../components/PostCard";
import SiteFooter from "../components/SiteFooter";
import { FAQList } from "../components/PublicContent";

const COMMUNITY_PREVIEW_REFRESH_MS = 60_000;

export function Landing() {
  const { user } = useAuth();
  const [selectedQuiz, setSelectedQuiz] = useState<number | null>(null);
  const createReportPath = user
    ? "/reports/new"
    : "/login?returnTo=%2Freports%2Fnew";

  const preview = useQuery({
    queryKey: ["community", "preview", user?.id],
    queryFn: ({ signal }) =>
      api<Feed>("/api/v1/community/feed?per_page=2", { signal }),
    staleTime: COMMUNITY_PREVIEW_REFRESH_MS,
    refetchInterval: COMMUNITY_PREVIEW_REFRESH_MS,
  });

  return (
    <div className="landing-editorial">
      <SiteHeader />
      <main className="home-main">
        <section className="home-hero" aria-labelledby="home-title">
          <div className="home-hero-copy">
            <h1 id="home-title">
              Kenali sampah.
              <span>Pilih langkah berikutnya.</span>
            </h1>
            <p>
              Ambil foto, kenali materialnya dalam 12 kategori, lalu catat lokasi
              dan pantau penanganannya lewat WasteWise.
            </p>
            <div className="home-hero-actions">
              <Link className="home-button home-button-primary" to={createReportPath}>
                <Camera size={18} aria-hidden="true" />
                Buat laporan
              </Link>
              <Link className="home-button home-button-secondary" to="/guide">
                Panduan 12 kategori
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
            </div>
            <ul className="home-hero-facts" aria-label="Fitur WasteWise">
              <li>12 kategori material</li>
              <li>Lokasi dengan izin perangkat</li>
              <li>Privat sebagai pengaturan awal</li>
            </ul>
          </div>

          <figure className="home-example">
            <div className="home-example-photo">
              <img
                src="/materials/landing-plastic.webp"
                alt="Contoh foto botol plastik dari dataset klasifikasi"
                width="640"
                height="480"
                fetchPriority="high"
              />
              <span>Foto contoh dataset</span>
            </div>
            <figcaption>
              <div>
                <span className="home-example-label">Contoh kategori</span>
                <strong>Plastik</strong>
              </div>
              <Link to="/guide" aria-label="Baca panduan memilah plastik">
                Cara memilah
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </figcaption>
          </figure>
        </section>

        <section className="home-process home-section" id="cara-kerja">
          <div className="home-section-heading">
            <h2>Dari foto ke tindak lanjut.</h2>
            <p>
              Tinjau detail sebelum mengirim, lalu cek status laporan di riwayat.
            </p>
          </div>
          <ol className="home-process-list">
            <li>
              <span className="home-process-marker" aria-hidden="true">01</span>
              <div className="home-process-copy">
                <h3>Pilih foto</h3>
                <p>
                  Ambil foto atau pilih dari galeri. Pastikan objek terlihat jelas.
                </p>
              </div>
            </li>
            <li>
              <span className="home-process-marker" aria-hidden="true">02</span>
              <div className="home-process-copy">
                <h3>Tinjau hasil</h3>
                <p>
                  Periksa kategori prediksi karena hasil AI bisa keliru. Jika foto
                  tidak memiliki GPS, konfirmasikan lokasi perangkat.
                </p>
              </div>
            </li>
            <li>
              <span className="home-process-marker" aria-hidden="true">03</span>
              <div className="home-process-copy">
                <h3>Pantau laporan</h3>
                <p>
                  Buka riwayat untuk melihat pembaruan status dari pengelola.
                </p>
              </div>
            </li>
          </ol>
        </section>

        <section className="home-privacy" aria-labelledby="home-privacy-title">
          <div>
            <h2 id="home-privacy-title">Laporanmu tidak langsung menjadi publik.</h2>
            <p>
              Sebelum berbagi ke komunitas atau peta, kamu dapat meninjau foto,
              deskripsi, kategori, status, dan GPS presisi yang akan terlihat.
              Lokasi berasal dari pelapor, bukan verifikasi lapangan. Nama akun
              hanya tampil jika pemilik mengaktifkannya di Profil.
            </p>
          </div>
          <Link className="home-button home-button-light" to="/privacy">
            Pelajari privasi
            <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </section>

        <section className="home-categories home-section" id="kategori">
          <div className="home-section-heading home-heading-split">
            <div>
              <h2>Kenali 12 kategori material.</h2>
              <p>Mulai dari bahan, lalu ikuti panduan penanganannya.</p>
            </div>
            <Link className="home-text-link" to="/guide">
              Buka panduan lengkap
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
          <ul className="home-category-list">
            {categories.map((category) => (
              <li key={category.id}>
                <Link to={`/guide#${category.id}`}>
                  <img
                    src={`/illustrations/materials/${category.id}.svg`}
                    alt=""
                    width="42"
                    height="42"
                    loading="lazy"
                  />
                  <span>{category.name}</span>
                  <ArrowRight size={15} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="home-quiz home-section" aria-labelledby="home-quiz-title">
          <div className="home-quiz-intro">
            <h2 id="home-quiz-title">Coba satu contoh pemilahan.</h2>
            <p>
              Botol kaca bening bekas minuman masuk kategori apa?
            </p>
            <Link className="home-text-link" to="/guide">
              Lihat semua cara penanganan
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
          <div className="home-quiz-panel">
            <fieldset>
              <legend>Pilih langkah yang tepat</legend>
              <button
                type="button"
                className={selectedQuiz === 0 ? "home-quiz-choice is-selected" : "home-quiz-choice"}
                aria-pressed={selectedQuiz === 0}
                onClick={() => setSelectedQuiz(0)}
              >
                <span aria-hidden="true">A</span>
                Kosongkan, bilas, lalu pisahkan sebagai kaca bening.
              </button>
              <button
                type="button"
                className={selectedQuiz === 1 ? "home-quiz-choice is-selected" : "home-quiz-choice"}
                aria-pressed={selectedQuiz === 1}
                onClick={() => setSelectedQuiz(1)}
              >
                <span aria-hidden="true">B</span>
                Campurkan dengan keramik atau kaca lampu.
              </button>
            </fieldset>
            {selectedQuiz === null ? (
              <p className="home-quiz-feedback" role="status">
                Pilih jawaban untuk melihat penjelasan.
              </p>
            ) : selectedQuiz === 0 ? (
              <p className="home-quiz-feedback is-correct" role="status">
                <Check size={17} aria-hidden="true" />
                Tepat. Pisahkan kaca kemasan dari keramik dan kaca lampu.
              </p>
            ) : (
              <p className="home-quiz-feedback is-incorrect" role="status">
                Belum tepat. Kosongkan dan bilas kaca kemasan; jangan campur
                dengan keramik atau kaca lampu.
              </p>
            )}
          </div>
        </section>

        <section className="home-community home-section" id="komunitas">
          <div className="home-section-heading home-heading-split">
            <div>
              <h2>Laporan yang dibagikan warga.</h2>
              <p>
                Feed ini hanya menampilkan laporan yang pemiliknya setujui untuk
                dibagikan.
              </p>
            </div>
            <Link className="home-text-link" to="/app">
              Lihat lainnya
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
          {preview.isPending ? (
            <p className="home-feed-state" role="status">
              Memuat laporan komunitas…
            </p>
          ) : preview.error ? (
            <div className="home-feed-error">
              <Failure
                error={preview.error}
                retry={() => void preview.refetch()}
              />
            </div>
          ) : preview.data.posts.length ? (
            <div className="preview-grid home-post-grid">
              {preview.data.posts.slice(0, 2).map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <div className="home-feed-empty">
              <h3>Belum ada laporan publik.</h3>
              <p>
                Laporan baru tetap privat kecuali kamu menyetujui untuk
                membagikannya.
              </p>
              <Link className="home-text-link" to={createReportPath}>
                Buat laporan
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
            </div>
          )}
        </section>

        <section className="home-faq home-section" id="faq">
          <div className="home-faq-intro">
            <h2>Yang perlu kamu ketahui.</h2>
            <p>Informasi privasi, lokasi, dan penggunaan WasteWise.</p>
            <Link className="home-text-link" to="/faq">
              Semua pertanyaan
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
          <FAQList compact />
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
export function Onboarding() {
  return (
    <>
      <SiteHeader compact />
      <main className="onboarding">
        <Link to="/">
          <Brand />
        </Link>
        <h1>
          Halo, tetangga.
          <br />
          <em>Mulai dari yang dekat.</em>
        </h1>
        <ol>
          {[
            {
              title: "Izinkan saat dibutuhkan",
              copy: "Kamera dan lokasi diminta saat membuat laporan. Galeri tanpa GPS memerlukan konfirmasi bahwa foto berasal dari lokasi saat ini.",
            },
            {
              title: "Periksa hasil AI",
              copy: "Kategori muncul otomatis. Deskripsi opsional; hindari nomor telepon atau informasi pribadi.",
            },
            {
              title: "Pahami publikasi laporan",
              copy: "Laporan baru bersifat privat. Foto dan GPS presisi hanya terlihat publik jika pelapor memilih untuk membagikannya. Laporan Ditolak tidak ditampilkan.",
            },
            {
              title: "Pantau, dukung, tindak lanjuti",
              copy: "Lihat riwayat status, jelajahi peta, beri suka dan komentar yang membantu. Pengelola mereview laporan dan konten bermasalah.",
            },
          ].map((s) => (
            <li key={s.title}>
              <h2>{s.title}</h2>
              <p>{s.copy}</p>
            </li>
          ))}
        </ol>
        <Link className="button primary" to="/app">
          Mulai menggunakan WasteWise
        </Link>
        <Link to="/">Kembali</Link>
      </main>
    </>
  );
}

export function ErrorPage({ code }: { code?: string }) {
  const { code: paramCode } = useParams<{ code?: string }>();
  const activeCode = code || paramCode || "404";
  const [title, message] = errors[activeCode] || [
    "Halaman ini belum siap.",
    "Periksa alamat halaman atau kembali ke beranda.",
  ];

  return (
    <div className="error-screen">
      <SiteHeader compact />
      <main>
        <p className="code-pill">Status {activeCode}</p>
        <h1>{title}</h1>
        <p>{message}</p>
        <Link to="/" className="button primary">
          Kembali ke beranda
        </Link>
      </main>
    </div>
  );
}

const errors: Record<string, [string, string]> = {
  "400": [
    "Permintaan belum tepat.",
    "Periksa data yang dikirim, lalu coba kembali.",
  ],
  "401": ["Masuk dulu, yuk.", "Sesi berakhir atau kamu belum masuk."],
  "403": ["Ruang ini terbatas.", "Akunmu belum memiliki akses ke halaman ini."],
  "404": [
    "Halaman ini belum ditemukan.",
    "Tautannya mungkin berubah. Beranda masih bisa kamu kunjungi.",
  ],
  "408": ["Waktu tunggu habis.", "Periksa koneksi, lalu coba kembali."],
  "413": [
    "Fotonya terlalu besar.",
    "Gunakan foto JPEG, PNG, atau WebP maksimal 5 MiB.",
  ],
  "422": [
    "Ada data yang perlu diperiksa.",
    "Periksa isian dan lokasi sebelum mengirim ulang.",
  ],
  "429": [
    "Pelan sebentar, ya.",
    "Terlalu banyak permintaan. Tunggu sejenak sebelum mencoba lagi.",
  ],
  "500": [
    "Sedang ada kendala di peladen.",
    "Coba beberapa saat lagi atau laporkan jika berlanjut.",
  ],
  "503": [
    "Layanan sedang disiapkan.",
    "Koneksi ke sistem AI atau basis data sedang pulih.",
  ],
};
