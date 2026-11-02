# Prompt lanjutan WasteWise

Gunakan prompt berikut setelah meninjau hasil implementasi lokal.

> Lanjutkan WasteWise dari source yang ada, jangan membuat ulang. Baca README.md, AGENTS.md, PRODUCT.md, DESIGN.md, docs/DECISIONS.md dan docs/PROGRESS.md. Pertahankan 12 ID kategori folder garbage_classification dan SPEC.md asli. Verifikasi checksum checkpoint dan hasil evaluasi sebelum mengganti model. Jangan gunakan test yang sudah dibuka untuk tuning.
>
> Prioritas berikutnya adalah staging nyata: hubungkan PostgreSQL dan bucket Supabase privat melalui environment rahasia; jalankan migrasi dengan role owner, grant runtime minimum, uji seluruh alur upload/signed URL/expiry/delete/cleanup serta kepemilikan lintas akun. Verifikasi rekonsiliasi orphan yang sudah tersedia pada staging berumur24jam; tambahkan shared rate limiter bila multi-worker, uji backup/restore, retensi/penghapusan data, dan monitoring tanpa token/foto. Perbaiki hanya gap yang terbukti oleh pengujian.
>
> Kemudian pasang Expo development build pada Android dan iOS. Uji kamera, galeri, lokasi/manual fallback, SecureStore setelah restart, izin ditolak/revoked, keyboard dan safe area, offline/retry dan double submit. Catat bukti perangkat dan batas yang belum diuji. Jangan menyebut bundle export sebagai APK/IPA atau aplikasi terpasang.
>
> Persiapkan deployment web/API/worker dan konfigurasi HTTPS/CORS/secret secara konkret. Sebelum publikasi dataset atau foto contoh, verifikasi hak distribusi berdasarkan metadata Kaggle Database: Open Database, Contents: Copyright Original Authors. Jangan memasukkan credential ke Git, VITE_* atau EXPO_PUBLIC_*. Laporan akhir: Done, Verified, Open, Next secara ringkas dengan file/bukti dan URL yang benar-benar aktif.
