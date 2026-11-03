import Illustration from "../components/Illustration";
import { Link, useParams } from "react-router-dom";
import {
  Camera,
  MapPin,
  ScanLine,
  ArrowUpRight,
  Leaf,
  MoveRight,
} from "lucide-react";
import { Brand } from "../ui";
export function Landing() {
  return (
    <div className="landing">
      <header className="landing-nav">
        <Link to="/" aria-label="WasteWise beranda">
          <Brand />
        </Link>
        <nav aria-label="Navigasi publik">
          <a href="#cara-kerja">Cara kerja</a>
          <a href="#komunitas">Komunitas</a>
          <Link to="/login" className="button primary">
            Masuk <ArrowUpRight size={16} />
          </Link>
        </nav>
      </header>
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
              <Link to="/login" className="button primary">
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
                copy: "Kirim laporan, lihat statusnya. Pilih sendiri apakah foto dan GPS ikut dibagikan ke komunitas.",
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
        <section id="komunitas" className="landing-community">
          <Leaf size={42} />
          <div>
            <h2>
              Kabar baik perlu
              <br />
              <em>tempat bertumbuh.</em>
            </h2>
            <p>
              Lihat foto laporan di sekitarmu, beri dukungan, tinggalkan
              komentar. Jelajahi peta dari kota hingga kelurahan. Komunitas
              tersedia setelah masuk.
            </p>
            <Link className="button primary" to="/login">
              Buka komunitas <ArrowUpRight size={18} />
            </Link>
          </div>
        </section>
      </main>
      <footer>
        <Brand />
        <p>Kenali material. Pedulikan sekitar.</p>
        <Link to="/onboarding">Panduan penggunaan</Link>
      </footer>
    </div>
  );
}
export function Onboarding() {
  return (
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
            copy: "Kategori muncul otomatis. Tambahkan deskripsi yang jelas, tanpa nomor telepon atau informasi pribadi.",
          },
          {
            title: "Tentukan siapa yang melihat",
            copy: "Laporan tetap privat secara bawaan. Bagikan ke komunitas hanya jika kamu bersedia foto dan koordinat presisi terlihat oleh seluruh pengguna yang masuk.",
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
  );
}
