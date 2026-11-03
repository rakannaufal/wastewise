import { Link } from "react-router-dom";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";

import { AboutSection, FAQList } from "../components/PublicContent";

export default function Information({
  page,
}: {
  page: "about" | "faq" | "privacy";
}) {
  return (
    <>
      <SiteHeader />
      <main className="information-page">
        {page === "about" ? (
          <>
            <div className="information-heading">
              <h1>
                Lebih kenal.
                <br />
                Lebih peduli.
              </h1>
              <p>
                WasteWise adalah aplikasi pengenalan dan pelaporan sampah untuk
                warga serta pengelola lingkungan.
              </p>
            </div>
            <AboutSection />
            <section className="information-copy">
              <h2>Warga, pengelola, dan AI.</h2>
              <p>
                Warga memfoto objek, memperoleh kategori otomatis, lalu mengirim
                laporan dengan GPS. Pengelola meninjau kategori dan penanganan.
                Model AI membantu mengenali material; keputusan penanganan tetap
                pada manusia.
              </p>
              <h2>Dari HP, terhubung ke web.</h2>
              <p>
                Aplikasi HP mengutamakan kamera, galeri, dan lokasi. Website
                menyediakan komunitas, peta, panduan, serta panel pengelolaan
                untuk admin. Keduanya memakai backend FastAPI dan database
                Supabase yang sama.
              </p>
              <Link className="button primary" to="/app">
                Jelajahi laporan
              </Link>
            </section>
          </>
        ) : page === "faq" ? (
          <>
            <div className="information-heading">
              <h1>
                Sebelum mulai,
                <br />
                mungkin kamu bertanya.
              </h1>
              <p>
                Jawaban tentang foto, kategori AI, lokasi, dan publikasi
                laporan.
              </p>
            </div>
            <div className="faq-layout">
              <img
                src="/illustrations/report-notes.svg"
                width="480"
                height="400"
                alt="Ilustrasi catatan dan pensil"
              />
              <FAQList />
            </div>
          </>
        ) : (
          <section className="information-copy">
            <h1>Privasi laporan.</h1>
            <p>
              Laporan baru otomatis dibagikan kepada publik, termasuk pengunjung
              tanpa akun. Kebijakan ini ditampilkan sebelum tombol Kirim dan
              publikasikan.
            </p>
            <h2>Data yang tampil</h2>
            <p>
              Foto turunan tanpa metadata EXIF, nama depan, deskripsi opsional,
              kategori, status, wilayah, GPS presisi, serta jumlah suka dan
              komentar. Email, identitas akun internal, foto asli, dan path
              penyimpanan tidak diberikan melalui API publik.
            </p>
            <h2>Data yang tetap dibatasi</h2>
            <p>
              Draft foto hanya untuk pemilik dan pengelola. Arsip privat lama
              tidak dipublikasikan massal. Foto asli tersimpan di bucket privat;
              akses foto publik memakai tautan turunan sementara.
            </p>
            <h2>Kontrol pemilik</h2>
            <p>
              Tarik publikasi dari detail posting atau hapus laporan melalui
              riwayat. Laporan Ditolak tidak ditampilkan pada feed, detail
              publik, dan peta. Tautan foto yang sudah diterbitkan dapat tetap
              berlaku hingga 15 menit; salinan yang telah diunduh tidak dapat
              dicabut.
            </p>
            <h2>Sebelum memfoto</h2>
            <p>
              Hindari wajah, dokumen pribadi, nomor telepon, serta tempat
              sensitif. GPS presisi memperlihatkan lokasi nyata objek; kirim
              hanya informasi yang bersedia kamu bagikan secara publik.
            </p>
            <Link className="button secondary" to="/faq">
              Baca pertanyaan lainnya
            </Link>
          </section>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
