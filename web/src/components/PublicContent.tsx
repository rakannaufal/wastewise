import { Link } from "react-router-dom";
export const faqs = [
  [
    "Apa itu WasteWise?",
    "WasteWise membantu mengenali material sampah dari foto, mencatat lokasinya, dan memantau penanganan melalui laporan komunitas. Web dan aplikasi HP menggunakan API serta data yang sama.",
  ],
  [
    "Bagaimana kategori sampah ditentukan?",
    "Ambil foto atau pilih dari galeri. Model AI mengenali 12 kategori secara otomatis. Hasilnya bisa keliru; prediksi yang meragukan ditandai untuk review admin. Tidak perlu memilih kategori manual.",
  ],
  [
    "Apakah deskripsi wajib diisi?",
    "Tidak. Foto, hasil klasifikasi, dan lokasi yang valid cukup untuk mengirim laporan. Deskripsi boleh dikosongkan atau diisi maksimal 5.000 karakter.",
  ],
  [
    "Siapa yang bisa melihat foto dan lokasi saya?",
    "Laporan baru bersifat privat. Jika memilih publikasi, foto, deskripsi, dan GPS presisi dapat dilihat publik, termasuk pengunjung tanpa akun. Lokasi berasal dari pelapor dan tidak diverifikasi. Hindari wajah, alamat rumah sensitif, dan informasi pribadi. Laporan Ditolak tidak tampil di komunitas atau peta.",
  ],
  [
    "Bagaimana jika foto galeri tidak memiliki GPS?",
    "Konfirmasikan bahwa foto diambil di tempatmu berada sekarang, lalu izinkan GPS perangkat. Jika lokasinya berbeda, ambil foto ulang di tempat sampah ditemukan. Lokasi tidak diisi manual.",
  ],
  [
    "Apa arti status laporan?",
    "Menunggu berarti laporan diterima; Diproses berarti penanganan sedang berjalan; Selesai berarti ditandai selesai oleh pengelola. Ditolak tetap dapat dilihat pemilik pada riwayat beserta catatannya, tetapi tidak ditampilkan di feed atau peta publik.",
  ],
  [
    "Apakah WasteWise menyediakan layanan jemput sampah?",
    "Belum. WasteWise menyediakan pengenalan material dan pencatatan laporan. Aplikasi tidak menjanjikan waktu penjemputan atau penanganan. Ikuti layanan serta aturan pengelolaan sampah setempat.",
  ],
  [
    "Apakah saya harus masuk untuk membuka peta?",
    "Tidak. Komunitas dan peta dapat dibaca tanpa akun. Masuk diperlukan untuk membuat laporan, memberi suka, menulis komentar, dan mengelola laporan sendiri.",
  ],
  [
    "Bisakah publikasi dihapus?",
    "Pemilik dapat menarik publikasi dari detail posting atau menghapus laporan melalui riwayat. Tautan foto yang sudah diterbitkan dapat tetap berlaku hingga 15 menit; salinan yang telah diunduh orang lain tidak dapat ditarik kembali.",
  ],
];
export function FAQList({ compact = false }: { compact?: boolean }) {
  return (
    <div className="faq-list">
      {(compact ? faqs.slice(1, 6) : faqs).map(([question, answer]) => (
        <details key={question} name="wastewise-faq">
          <summary>{question}</summary>
          <p>{answer}</p>
        </details>
      ))}
    </div>
  );
}
export function AboutSection() {
  return (
    <section className="about-section" id="tentang">
      <div className="about-art">
        <img
          src="/illustrations/sort-materials.svg"
          width="520"
          height="400"
          loading="lazy"
          alt="Ilustrasi pemilahan sampah organik, kertas, dan plastik"
        />
      </div>
      <div>
        <h2>
          Kenali sampahnya.
          <br />
          Pedulikan sekitarnya.
        </h2>
        <p>
          Botol di pinggir jalan, kertas yang menumpuk, sisa makanan yang belum
          dipilah. Langkah pertama adalah mengenali apa yang ada di depan kita.
        </p>
        <p>
          WasteWise mempertemukan foto, klasifikasi AI, dan lokasi dalam satu
          laporan. Warga berbagi kondisi di sekitar; pengelola memeriksa laporan
          dan memperbarui penanganannya.
        </p>
        <Link className="text-button" to="/about">
          Tentang WasteWise
        </Link>
      </div>
    </section>
  );
}
