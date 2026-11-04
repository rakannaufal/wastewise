import Illustration from "../components/Illustration";
import { Link, useParams } from "react-router-dom";
import {
  Camera,
  MapPin,
  ScanLine,
  ArrowUpRight,
  MoveRight,
} from "lucide-react";
import { Brand, Failure } from "../ui";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api";
import { useAuth } from "../Auth";
import type { Feed } from "../../../shared/community";
import SiteHeader from "../components/SiteHeader";
import PostCard from "../components/PostCard";
import SiteFooter from "../components/SiteFooter";
import { AboutSection, FAQList } from "../components/PublicContent";
export function Landing() {
  const { user } = useAuth();
  const preview = useQuery({
    queryKey: ["community", "preview", user?.id],
    queryFn: ({ signal }) =>
      api<Feed>("/api/v1/community/feed?per_page=3", { signal }),
    staleTime: 30000,
    refetchInterval: 60000,
  });
  return (
    <div className="landing">
      <SiteHeader />
      <main>
        <Illustration
          slot="landing-hero"
          alt="Warga merawat lingkungan sekitar"
        />
        <section className="landing-hero">
          <div>
            <h1>
              Lingkungan baik,
              <br />
              dimulai dari
              <br />
              <em>sekitarmu.</em>
            </h1>
            <p>
              Kenali sampah lewat foto. Laporkan lokasinya. Ajak lingkunganmu
              mengambil langkah berikutnya bersama WasteWise.
            </p>
            <div className="landing-actions">
              <Link
                to={user ? "/reports/new" : "/login?returnTo=%2Freports%2Fnew"}
                className="button primary"
              >
                Mulai dari satu foto <Camera size={19} />
              </Link>
              <a href="#cara-kerja">
                Lihat cara kerjanya <MoveRight size={18} />
              </a>
            </div>
            <small>Kamera, galeri, dan klasifikasi AI dalam satu alur.</small>
          </div>
          <figure className="material-story">
            <img
              src="/materials/landing-plastic.webp"
              alt="Contoh material plastik dari dataset klasifikasi"
              width="512"
              height="384"
              fetchPriority="high"
            />
            <figcaption>
              <ScanLine size={22} />
              <div>
                <strong>Kenali sebelum memilah.</strong>
                <span>Contoh dataset · Plastik</span>
              </div>
            </figcaption>
          </figure>
        </section>
        <section id="komunitas" className="landing-preview">
          <div className="section-heading">
            <div>
              <h2>Laporan di sekitar.</h2>
              <p>Foto, lokasi, dan perkembangan terbaru dari komunitas.</p>
            </div>
            <Link className="button secondary" to="/app">
              Lihat semua laporan <ArrowUpRight size={18} />
            </Link>
          </div>
          {preview.isPending ? (
            <p role="status">Memuat laporan…</p>
          ) : preview.error ? (
            <Failure
              error={preview.error}
              retry={() => void preview.refetch()}
            />
          ) : preview.data.posts.length ? (
            <div className="preview-grid">
              {preview.data.posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <div className="community-empty">
              <h3>Belum ada laporan publik.</h3>
              <p>Mulai dengan memfoto sampah di sekitarmu.</p>
              <Link
                className="button primary"
                to={user ? "/reports/new" : "/login?returnTo=%2Freports%2Fnew"}
              >
                Buat laporan pertama
              </Link>
            </div>
          )}
        </section>
        <section id="cara-kerja" className="landing-process">
          <h2>
            Satu foto.
            <br />
            <em>Langkah yang lebih jelas.</em>
          </h2>
          <div>
            {[
              {
                Icon: Camera,
                title: "Foto di tempatnya",
                copy: "Ambil foto langsung atau pilih dari galeri. Lokasi diperoleh otomatis dengan izinmu.",
              },
              {
                Icon: ScanLine,
                title: "Kenali materialnya",
                copy: "AI mengklasifikasikan 12 kategori material. Hasil yang meragukan masuk review pengelola.",
              },
              {
                Icon: MapPin,
                title: "Ikuti perkembangannya",
                copy: "Kirim laporan privat, lalu pilih jika ingin membagikan foto dan GPS presisi.",
              },
            ].map(({ Icon, title, copy }) => (
              <article key={title}>
                <Icon size={28} />
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>
        </section>
        <AboutSection />
        <section className="landing-faq" id="faq">
          <div>
            <h2>
              Ada yang ingin
              <br />
              kamu ketahui?
            </h2>
            <p>Mulai dengan informasi yang jelas.</p>
            <img
              src="/illustrations/report-notes.svg"
              width="480"
              height="400"
              loading="lazy"
              alt="Ilustrasi catatan dan pensil"
            />
          </div>
          <div>
            <FAQList compact />
            <Link className="text-button" to="/faq">
              Lihat semua pertanyaan
            </Link>
          </div>
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
        <Illustration
          slot="onboarding-community"
          alt="Komunitas merawat lingkungan"
        />
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
    "Ada gangguan di sini.",
    "Permintaan belum berhasil. Coba kembali beberapa saat lagi.",
  ],
  "502": [
    "Layanan belum tersambung.",
    "Server pendukung belum menjawab dengan benar.",
  ],
  "503": [
    "Sedang belum tersedia.",
    "Layanan membutuhkan waktu untuk kembali siap.",
  ],
  "504": ["Server membutuhkan waktu.", "Coba kembali setelah koneksi stabil."],
};
export function ErrorPage({ code: provided }: { code?: string }) {
  const { code } = useParams();
  const requested = provided || code || "404";
  const value = /^[45]\d{2}$/.test(requested) ? requested : "404";
  const [title, copy] =
    errors[value] || errors[value.startsWith("5") ? "500" : "400"];
  return (
    <>
      <SiteHeader compact />
      <main className="error-page">
        <Link to="/">
          <Brand />
        </Link>
        <Illustration
          slot={value.startsWith("5") ? "error-5xx" : "error-4xx"}
          alt=""
        />
        <p className="error-code">{value}</p>
        <h1>{title}</h1>
        <p>{copy}</p>
        <div>
          <Link
            className="button primary"
            to={value === "401" ? "/login" : "/app"}
          >
            {value === "401" ? "Masuk kembali" : "Kembali ke beranda"}
          </Link>
          <button
            className="button secondary"
            onClick={() => window.location.reload()}
          >
            Coba lagi
          </button>
        </div>
      </main>
    </>
  );
}
