# Prompt lanjutan WasteWise

Gunakan prompt berikut setelah meninjau hasil implementasi lokal.

> Lanjutkan WasteWise dari source yang ada, jangan membuat ulang. Baca README.md, AGENTS.md, PRODUCT.md, DESIGN.md, docs/DECISIONS.md dan docs/PROGRESS.md. Pertahankan 12 ID kategori folder garbage_classification dan SPEC.md asli. Verifikasi checksum checkpoint dan hasil evaluasi sebelum mengganti model. Jangan gunakan test yang sudah dibuka untuk tuning.
>
> Baca juga docs/WORKFLOW_IMPLEMENTATION.md. Supabase Auth/PostgreSQL/Storage privat sudah terhubung; revisi8a4d7c209e51 telah diterapkan, smoke cloud22pemeriksaan lulus. Pertahankan draft UUID/hash/idempotensi, review yang menjaga prediksi AI asli dan revision409. Prioritas berikutnya: deployment staging HTTPS, pengukuran latency jaringan Supabase, email delivery nyata, rekonsiliasi orphan berumur24jam, shared rate limiter bila multi-worker, backup/restore seluruh layanan, retensi dan monitoring tanpa token/foto. Perbaiki gap yang terbukti oleh pengujian.
>
> Pasang Expo development build pada Android dan iOS. Uji kamera, galeri/HEIC, GPS akurasi50m/selisih30detik dari shutter, EXIF dan konfirmasi GPS saat unggah untuk galeri tanpa metadata. Tidak ada fallback input manual kategori atau koordinat. Uji draft privat setelah restart/reboot, pergantian akun, izin ditolak/revoked, keyboard/safe area, offline/retry dan double submit. Ikuti docs/TESTING.md; catat bukti perangkat. Jangan menyebut bundle export sebagai APK/IPA atau aplikasi terpasang.
>
> Persiapkan deployment web/API/worker dan konfigurasi HTTPS/CORS/secret secara konkret. Sebelum publikasi dataset atau foto contoh, verifikasi hak distribusi berdasarkan metadata Kaggle Database: Open Database, Contents: Copyright Original Authors. Jangan memasukkan credential ke Git, VITE_* atau EXPO_PUBLIC_*. Laporan akhir: Done, Verified, Open, Next secara ringkas dengan file/bukti dan URL yang benar-benar aktif.
