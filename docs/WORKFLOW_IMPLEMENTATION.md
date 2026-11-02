# Implementasi sistem WasteWise — 2 November 2026

Dokumen ini menggantikan baseline sebelum perbaikan. Rancangan dan target awal tetap di SYSTEM_IMPROVEMENT_PLAN.md. Implementasi sistem tersedia; pengujian perangkat fisik, deployment publik dan target performa lapangan belum selesai.

## Perilaku yang tersedia

| Area | Implementasi | Batas verifikasi |
| --- | --- | --- |
| Foto HP | Kamera belakang, izin kamera, preview, shutter, pilihan galeri; foreground GPS aktif hanya saat kamera digunakan | Bundel iOS/Android berhasil; shutter, HEIC, izin dan lifecycle fisik belum diuji |
| ML otomatis | Pemilihan foto memulai normalisasi/upload/inferensi; kategori pengguna dan fallback manual dihapus di kedua client/API | Checkpoint tetap versi v1, bukan object detector/multi-objek |
| GPS kamera | Fix akurasi ≤50m, selisih ≤30detik terhadap shutter; tanpa lokasi cukup, klasifikasi boleh dilihat tetapi laporan belum dikirim | GPS browser pada tes ditiru; bukan bukti lokasi fisik |
| GPS galeri | EXIF GPS dibaca sebelum metadata dihapus. Tanpa metadata, pengguna mengonfirmasi foto berasal dari lokasi saat ini sebelum GPS unggah diambil | Sumber ditampilkan jelas; EXIF/lokasi perangkat bisa dipalsukan |
| Draft dan retry | Private image+thumbnail, UUID/hash scoped akun, TTL24jam, retry analisis tanpa upload ulang, finalisasi idempoten dan lock transaksi | Pengiriman membutuhkan jaringan; ML tidak berjalan offline |
| Penyimpanan lokal | Foto native dalam direktori privat akun; JSON draft tanpa token, resume, hapus draft, cleanup penggantian/logout/expiry; web memakai sessionStorage | Reboot dan isolasi file native masih memerlukan HP |
| Laporan | Create/detail/list/edit/delete; user edit saat Pending, admin lintas status; foto pengganti dianalisis ulang | Data lama tetap legacy, tidak dimigrasikan seolah GPS/AI baru |
| Status | Transisi tervalidasi, alasan reject/reopen, revision409, event transaksi | Completed berarti keputusan admin, bukan bukti otomatis sampah diangkut |
| Review | Kategori admin beralasan, prediksi AI asli dipertahankan; classification state terpisah dari status penanganan | Review tidak melatih ulang model secara otomatis |
| Dashboard | Cohort30hari, filter URL, perbandingan periode, distribusi12kelas, tren harian0-filled, antrean tertua dan review seluruh periode, median dari event | Statistik memakai row aktif; penghapusan mengurangi hitungan |
| Ringan/responsif | Normalisasi1600px/JPEG.82, thumbnail320px, batch signed URLs, route lazy loading, pagination/FlatList, cancellation, request timeout60detik, SVG/CSS chart | Core Web Vitals/INP lapangan dan frame/memori native belum diukur |

File utama: shared/contracts.ts, shared/photo-location.ts; mobile/src/ReportComposer.tsx, photo.ts, draft.ts, location.ts, app/camera.tsx; web/src/components/ReportComposer.tsx, pages/AdminDashboard.tsx, Reports.tsx, ReportDetail.tsx; backend-ml/app/drafts.py, reports.py, workflow.py, dashboard.py, cleanup.py.

## Data dan migrasi

Revisi Supabase saat cutover: `41ba8d170ab2` → `620f42d91e30` → `7f36d20c41ab` → `8a4d7c209e51`. Migrasi menambahkan report_drafts, report_events, metadata lokasi/foto, revision, classification_state dan thumbnail. CHECK menjaga state prediksi/metadata, termasuk menolak koordinat parsial/photo_source NULL. Runtime role tetap DML; tabel baru tidak diberi akses publik.

Sebelum migrasi, app_private dicadangkan ke `.local/workflow-before.dump` berizin0600. Dump dipulihkan pada PostgreSQL lokal `wastewise_restore_check`, lalu migrasi diuji pada salinan tersebut; satu laporan lama tetap legacy. Migrasi cloud diterapkan melalui SQL hasil Alembic dengan guard revisi dan grant DML tabel baru. Ini membuktikan restore data aplikasi ke lokal, belum membuktikan disaster recovery seluruh Supabase/Auth/Storage.

Cleanup melindungi foto/thumbnail dengan referensi laporan aktif atau draft belum dikonsumsi. Draft kedaluwarsa tanpa referensi laporan dibersihkan, termasuk metadata consumed setelah laporan dihapus/diganti. Draft yang masih menjadi provenance laporan aktif dipertahankan. Foto yang sudah diunduh atau dicache tidak dapat ditarik kembali seketika.

## Bukti verifikasi

- Backend: **24 tes lulus**, PostgreSQL lokal terisolasi. Ruff dan mypy lulus. Cakupan: ownership/RBAC, UUID retry, concurrent finalization, spoof kategori, GPS, camera timestamp, expiry, model failure/retry, edit/revision, review, transisi/event, timezone boundary, replacement thumbnail/cleanup, dan regresi lama.
- Auth browser: **4 tes lulus** dengan provider tiruan; tidak menguji inbox email.
- EXIF parser: **2 tes lulus**, byte order TIFF, southern latitude, metadata rusak/truncated, denominator0, pointer di luar segmen. Metadata rusak menjadi absent, bukan koordinat palsu.
- Smoke Supabase nyata: **22 pemeriksaan lulus**, termasuk Expo web memilih galeri, ML otomatis, konfirmasi GPS, submit, dashboard web admin, filter URL, review, perubahan status dan sinkronisasi kembali ke Expo web. Foto privat, batch signing, thumbnail, role dan cleanup diuji. Semua UUID QA yang dibuat dibersihkan. Bukti: evidence/supabase-smoke.json.
- Admin diperiksa pada lebar320/360/390/768/1024/1440 tanpa overflow halaman. Tabel admin menggunakan scroll wilayahnya sendiri pada layar kecil. Pemeriksaan axe pada dashboard:0pelanggaran aturan yang diperiksa; bukan sertifikasi aksesibilitas penuh.
- Typecheck/lint dan build web berhasil; ekspor iOS/Android/web berhasil. Ekspor bukan pemasangan IPA/APK.
- Suite lokal tiga alur tersedia melalui `scripts/test_browser.py`; hasil akhir dicatat di PROGRESS dan evidence/workflow-local-browser.txt.

Perintah dari root:

```bash
npm run check
npm run build
npm --prefix mobile run export
node --experimental-strip-types --test shared/photo-location.test.ts
(cd backend-ml && .venv/bin/python scripts/test_local.py -q)
(cd backend-ml && .venv/bin/python scripts/test_browser.py)
(cd backend-ml && .venv/bin/ruff check app ml tests scripts migrations && .venv/bin/mypy app)
```

## Pengukuran dan batasnya

1. Dashboard sintetis lokal:10.000 laporan,30request warm, concurrency1; median23,0ms, p95 **27,8ms**. ASGI TestClient/PostgreSQL lokal, local JWT/media. Tidak mencakup jaringan/verifikasi Supabase, Storage atau rendering browser. EXPLAIN tersimpan di evidence/workflow-dashboard-benchmark.json; fixture dihapus setelah pengukuran. Tidak ada indeks tambahan yang dibenarkan oleh fixture sekecil ini.
2. Supabase dari komputer lokal masih menunjukkan request beberapa detik; contoh dashboard sekitar4,9–5,8detik pada log sesi. Ini observasi, bukan p95. Target API1detik belum terbukti. Lokasi backend dekat database, pooling koneksi HTTP dan pengurangan round-trip harus diprofil pada deployment nyata tanpa mengurangi pemeriksaan otorisasi.
3. Compression smoke memakai120gambar validation,10perkelas. Agreement kategori sebelum/sesudah97,5%; accuracy subset91,67% pada kedua jalur. Median upload9.629byte; thumbnail terbesar22.205byte. Warm prediction p95sekitar351ms saat pekerjaan verifikasi lain berjalan. Ini aproksimasi Pillow untuk JPEG82, bukan kesetaraan encoder browser/native atau foto resolusi tinggi lapangan. Bukti: backend-ml/outputs/validation_compression.json.
4. Model/checkpoint/test95,86% tidak berubah. Review policy validation2320gambar memilih confidence≥50%, margin dua kelas≥30poin. Accepted precision98,02%, coverage93,79% pada validation yang digunakan memilih aturan; bukan estimasi independen untuk kamera atau OOD. Checksum/version yang tidak cocok membuat hasil masuk needs_review.

## Gate yang masih terbuka

- iPhone dan Android fisik: izin ditolak/dibatalkan, GPS approximate/mati/lambat, HEIC/orientasi, background/resume, reboot draft, akun berbeda,20siklus kamera dan profil frame/memori.
- Holdout lapangan baru dengan hak data jelas: latar ramai, objek kecil/campuran, blur, pencahayaan buruk dan bukan sampah. Model12kelas selalu mencoba memberi label; confidence tinggi tidak menjamin objek adalah sampah.
- API/ML HTTPS yang dapat dijangkau di luar Wi-Fi pengembangan, deployment/monitoring/rate limiter multi-worker, uji signup-email/SMTP dan reset nyata.
- Lighthouse produksi, zoom200%/font sistem besar, koneksi lambat dan pengukuran end-to-end foto→hasil pada perangkat. Pemeriksaan screenshot/axe/overflow tidak menggantikannya.

Tidak ada perubahan identitas visual besar atau model retraining pada pekerjaan ini. Tahap berikut yang paling berguna: uji alur kamera/GPS pada iPhone dan Android dengan checklist di atas sebelum rilis publik.

## Koreksi upload native Expo SDK58

Screenshot iPhone menunjukkan foto tersedia tetapi kategori tidak muncul dan pesan koneksi gagal. Log API pada waktu tersebut mencatat request Auth/statistik berhasil, tanpa request draft. Penyebab direproduksi pada serializer Expo58 terpasang: objek multipart lama `{uri, name, type}` ditolak dengan `Unsupported FormDataPart implementation` sebelum jaringan digunakan. Ini bukan bukti checkpoint gagal atau password salah.

`mobile/src/photo.ts` kini mengirim `File` expo-file-system yang menyediakan bytes(), sesuai serializer fetch default SDK58. Analisis tetap dipicu otomatis setelah shutter/galeri; hasil kategori ditempatkan langsung setelah foto, indikator menjelaskan proses yang sedang berjalan. Tidak ada penetapan kategori dari nama file, input pengguna atau dugaan visual. Backend/model tidak diubah. Dua regresi native serializer disertakan dalam CI; File I/O pada tes memakai pengganti eksplisit. Konfirmasi upload kamera di HP fisik tetap diperlukan setelah reload Expo.
