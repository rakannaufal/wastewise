> Audit historis sebelum perubahan workflow otomatis. Status terkini: [WORKFLOW_IMPLEMENTATION.md](WORKFLOW_IMPLEMENTATION.md). Temuan kontrak manual/CRUD/dashboard pada baseline telah diperbaiki; gate perangkat/rilis tetap harus diverifikasi.

# Audit kesiapan WasteWise

Tanggal: 2 November 2026. Source aplikasi: `ec058f8287267e77401291a493235605d77a2bcc`. Lingkungan: macOS arm64, Node 24.22.1, Python 3.12, PostgreSQL lokal untuk tes, serta Supabase Auth/PostgreSQL/Storage nyata untuk smoke test. Audit tidak mengubah implementasi aplikasi atau melatih ulang model.

**Putusan: enam deliverable tersedia; alur inti dapat dipakai untuk demo lokal dengan akun Supabase terkonfirmasi. Belum selesai untuk rilis publik atau aplikasi native terpasang.** Tidak ditemukan kegagalan aplikasi pada alur yang dijalankan dalam audit ini. Ini bukan jaminan seluruh kondisi/perangkat bebas bug.

Audit tambahan terhadap checklist A/B/C pengguna tercatat di [REQUIREMENTS_AUDIT.md](REQUIREMENTS_AUDIT.md). Temuan kelengkapan: **CRUD laporan belum penuh**, karena hanya status yang dapat diubah setelah laporan dibuat; belum ada editor deskripsi, kategori, lokasi atau foto. Pernyataan enam deliverable tersedia tidak berarti seluruh persyaratan fitur sudah lengkap. Pengguna juga telah membuka aplikasi dalam Expo Go iOS; keberhasilan login ulang, kamera dan GPS di perangkat belum dikonfirmasi setelah perbaikan LAN.

## Temuan yang masih menghalangi penyerahan penuh

| Prioritas | Temuan dan dampak | Bukti | Kriteria penutupan |
| --- | --- | --- | --- |
| P1 untuk checklist CRUD | Isi laporan belum dapat diedit setelah disimpan. User belum dapat memperbaiki deskripsi, kategori atau koordinat. | API aktif hanya GET/DELETE pada detail dan PATCH status; `backend-ml/app/reports.py:181`, `web/src/pages/ReportDetail.tsx:36` | Tambahkan edit laporan berotorisasi dengan formulir web dan tes perubahan tersimpan/penolakan lintas pemilik. |
| P1 | Pengiriman email konfirmasi dan reset belum diuji ke kotak masuk nyata. Pendaftaran pengguna biasa belum terbukti sampai selesai. Akun QA dikonfirmasi melalui admin. | `evidence/supabase-smoke.json`: `email_delivery_tested=false`; `SETUP.md` bagian Supabase server | Uji daftar, email masuk, konfirmasi, login, lupa password, tautan PKCE dan password baru menggunakan alamat milik penguji; verifikasi konfigurasi SMTP/limit pengiriman. |
| P1 | Belum ada deployment web/API publik. Web/API/cleanup saat ini proses pengembangan; belum dikelola sebagai layanan yang otomatis pulih setelah restart. | `SETUP.md` bagian Gate deployment publik; layanan yang diaudit berada di loopback | Deploy staging HTTPS, jalankan API dan cleanup dengan pengelola proses, atur CORS/redirect Supabase, lalu ulang smoke test dari URL publik dan uji restart. |
| P1 untuk rilis mobile | Bundel iOS/Android tersedia, tetapi belum menjadi APK/IPA terpasang. Expo web tidak membuktikan kamera, izin OS, SecureStore atau perilaku perangkat nyata. | `TESTING.md` bagian Mobile; ekspor tiga platform lulus dalam audit | Pasang development build pada Android/iOS sasaran; uji kamera/galeri/lokasi, izin ditolak, sesi setelah restart, keyboard, safe area dan koneksi terputus. |
| P2 sebelum produksi | Backup/restore, monitoring dan pemulihan worker dari gangguan DB belum dibuktikan. Rate limiter masih per proses; deployment harus satu worker API sampai tersedia limiter bersama. | `DATABASE.md` bagian Migrasi dan backup; `ARCHITECTURE.md`; loop `backend-ml/app/cleanup.py` | Restore backup ke staging kosong, pasang pemeriksaan layanan/antrean dan restart otomatis, uji gangguan DB. Tetap satu worker API atau uji shared limiter sebelum scale. |
| P2 untuk penggunaan lapangan | Model lulus evaluasi dataset, tetapi belum diuji pada holdout kamera lapangan. Akurasi 95,86% tidak membuktikan hasil sama untuk sampah kotor, objek campuran atau material di luar 12 kelas. | `EVALUATION.md` bagian Interpretasi; `MODEL_CARD.md` | Buat holdout lapangan baru dengan hak data yang jelas, ukur hasil setiap kategori dan kegagalan di luar distribusi; jangan tuning terhadap test yang sudah dibuka. |

P1 menunjukkan penghalang pada lingkup rilis terkait, bukan kegagalan alur demo lokal yang sudah diuji. Belum ada klaim kesiapan produksi, sertifikasi aksesibilitas, atau pemasangan perangkat.

## Pemeriksaan enam deliverable

| Deliverable | Hasil audit |
| --- | --- |
| Dokumentasi API | `docs/API.md`, Swagger/ReDoc dan `docs/openapi.json` tersedia. OpenAPI tersimpan identik dengan schema API aktif, mencakup 14 path. |
| Database schema/ERD | `docs/DATABASE.md`, `docs/schema.sql` dan migrasi Alembic tersedia. Supabase berada pada revisi `41ba8d170ab2`; empat tabel `app_private`. Runtime role bukan superuser, tidak memiliki hak create DB/role. |
| Source dan model ML | Source web/mobile/backend/training tersedia. Checkpoint MobileNetV2 nyata masuk Git; checksum sesuai metadata; inferensi checkpoint diuji melalui API dan kedua UI web. |
| Dataset dan sumber | Folder lokal `garbage_classification` berisi 15.515 JPG, 12 nama kategori sesuai model. Atribusi Kaggle Mostafa Abla tersedia di `docs/DATASET.md`. Dataset tersedia dalam ZIP lokal, tidak termasuk clone GitHub. Hak isi gambar tetap pada pemilik asli. |
| Evaluasi model | 2.318 prediksi test tersimpan; perhitungan ulang accuracy 95,8585%, macro F1 94,0986%, minimum class F1 85,1406% cocok dengan `metrics.json`. Checksum checkpoint cocok. Ini verifikasi ulang artefak/prediksi tersimpan, bukan training atau inferensi ulang seluruh test. |
| README instalasi/penggunaan | README mencakup bootstrap lokal, konfigurasi Supabase, admin, penggunaan, mobile dan batas verifikasi. Lockfiles tersedia. CI checkout terbaru lulus instalasi/check/build/export/backend tests. Bukti instalasi bersih lokal sebelumnya tetap tersimpan; instalasi bersih lokal tidak diulang dalam audit ini. |

Kedua ZIP release lulus pemeriksaan CRC, ukuran dan SHA256 terhadap `release/manifest.json`. ZIP tersebut adalah snapshot penyerahan sebelumnya; laporan dan bukti audit baru ini tersedia terpisah di `docs/`.

## Pengujian yang benar-benar diulang

| Pemeriksaan | Hasil |
| --- | --- |
| `npm run check` | PASS: TypeScript/ESLint web dan TypeScript mobile |
| `npm run build` | PASS: build Vite selesai; main chunk 411,24 kB dan SDK Supabase terpisah 214,40 kB |
| `npm --prefix mobile run export` | PASS: Android, iOS, web; bukan build instalasi |
| `python scripts/test_local.py -q` | PASS: 19 tes PostgreSQL lokal terisolasi, 64,91 detik |
| `ruff check app ml tests scripts migrations` | PASS |
| `mypy app` | PASS: 16 source files |
| `npm --prefix web run e2e:auth` | PASS: 4 tes kontrak provider tiruan, 35,5 detik; mencakup pending confirmation, resend, invalid credentials, persistence/logout dan PKCE recovery |
| `python -m scripts.supabase_smoke --run --browser` | PASS: 14 pemeriksaan nyata; login, provisioning, anti role injection, model, laporan remote, signed image, isolasi pemilik, admin/status, delete/cleanup dan readiness |
| Browser tambahan terhadap Supabase nyata | PASS: web dan Expo web login, prediksi, laporan, foto privat benar-benar termuat, penghapusan dan logout; Expo web mempertahankan sesi setelah reload |
| Readiness aktif | HTTP 200; database, storage, model semuanya `ready`; web 5173 dan Expo web 8081 HTTP 200 |
| Worker cleanup | Proses kontinu tetap hidup selama audit; antrean QA diproses; foto terhapus tidak lagi tercantum di inventory pada smoke test |
| Audit dependensi | npm web/mobile: 0 kerentanan dikenal; pip-audit: 101 paket, 0 kerentanan dikenal |
| Kredensial | 209 file tracked diperiksa terhadap service key, JWT secret dan password DB aktif: 0 kecocokan. `.env` berizin 0600. Pemeriksaan ini bukan audit seluruh riwayat Git atau detektor semua kemungkinan rahasia. |
| GitHub CI | PASS pada commit aplikasi yang diaudit: [run 41396207638](https://github.com/rakannaufal/wastewise/actions/runs/41396207638) |

Satu peringatan deprecation pada Starlette TestClient/httpx tetap muncul; 19 tes selesai lulus. Tidak ada perubahan dependensi untuk menyembunyikan peringatan tersebut.

Smoke dan browser tambahan hanya membuat identitas QA sementara beralamat contoh yang dikonfirmasi admin. Akun/foto/laporan penguji dibersihkan berdasarkan UUID tepat; tidak mengubah akun manusia. Tes tidak membuktikan email sampai ke kotak masuk. URL foto yang sudah dicache dapat tetap berlaku hingga expiry; cleanup dibuktikan lewat inventory object.

## Catatan pemeriksaan UI

- **Diperiksa:** alur tugas web dan Expo web dengan Supabase, foto signed URL, dashboard/grafik, panduan, navigasi web 390/1440 px, overflow horizontal dan error JavaScript. Skill ui-craft dan antislop mengikuti pilihan sesi `during`; arah `DESIGN.md` dipertahankan.
- **Lulus:** axe WCAG 2 A/AA dan 2.1 AA menemukan 0 pelanggaran pada empat layar web yang diperiksa: klasifikasi, detail laporan, dashboard, panduan pada viewport mobile. Kedua alur tidak mencatat uncaught JavaScript errors. Foto benar-benar termuat sebelum bukti akhir diambil.
- **Tidak diubah:** desain, tokens dan source UI. Audit ini tidak mengulang seluruh gate desain, seluruh kontrol admin via browser, semua ukuran/font, pembaca layar manual atau perangkat native. Bukti desain sebelumnya berada di `DESIGN_QA.md`; cakupan terbaru terbatas pada pemeriksaan di atas.
- **Putusan:** alur inti dapat didemokan lokal; prioritas berikutnya membuktikan daftar/konfirmasi/reset email nyata.

Bukti terbaru: `evidence/audit-cloud-browser.json`, `evidence/audit-accessibility-*.json`, `evidence/audit-web-cloud.png`, `evidence/audit-expo-cloud.png`, `evidence/supabase-smoke.json`, `evidence/audit-summary.json`. Script audit tambahan dan output dependensi rinci disimpan di `.local/`, diabaikan Git. Perintah smoke yang dipublikasikan di TESTING tetap dapat dijalankan ulang.

## Menjalankan kondisi workspace sekarang

Web: `http://127.0.0.1:5173/`. API: `http://127.0.0.1:8000/docs`. Expo web: `http://127.0.0.1:8081/`. Gunakan akun Supabase dengan email yang sudah terkonfirmasi; tidak ada akun/password demo bawaan. Layanan saat ini sudah berjalan. Setelah proses berhenti, jalankan kembali web, API dan cleanup sesuai README. Komputer harus tetap hidup dan memiliki koneksi Supabase.

**Langkah berikutnya:** uji signup, konfirmasi dan pemulihan password memakai kotak masuk yang dikuasai pengguna sebelum deploy staging.
