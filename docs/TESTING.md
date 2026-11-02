# Pengujian WasteWise

Baseline terbaru: [WORKFLOW_IMPLEMENTATION.md](WORKFLOW_IMPLEMENTATION.md). Bukti lokal/cloud dibedakan dari perangkat fisik dan deployment publik.

## Backend dan database

```bash
cd backend-ml
.venv/bin/python scripts/test_local.py -q
.venv/bin/ruff check app ml tests scripts migrations
.venv/bin/mypy app
```

Runner memakai PostgreSQL lokal port54339, database `wastewise_test` dan role tes terpisah; konfigurasi cloud tidak digunakan. Sebanyak28tes mencakup Auth/RBAC, ownership, input/upload invalid, UUID/hash/idempotensi, concurrent finalization, larangan kategori/lokasi manual, GPS kamera/galeri, SQL CHECK termasuk NULL, expiry, model failure/retry, edit/revision409, review yang menjaga AI asli, transisi/riwayat, agregasi/timezone, thumbnail/cleanup, rekonsiliasi, batas admin terakhir dan split leakage. Fixture membersihkan hanya akun/path buatannya.

Sebagian prediksi dimock untuk menguji kontrak/failure path. Akurasi berasal dari evaluasi checkpoint, bukan mock. Browser memakai checkpoint nyata. Ada satu peringatan deprecation Starlette/httpx; tes tetap lulus. Migrasi8a4d7c209e51 diterapkan ke Supabase setelah rehearsal pada restore app_private; satu laporan legacy dipertahankan. Ini bukan restore seluruh Auth/Storage atau downgrade produksi.

## Web dan Expo web terisolasi

Dari root, dengan Node24/npm dan Google Chrome:

```bash
npm run check
npm run build
node --experimental-strip-types --test shared/photo-location.test.ts
node --test mobile/scripts/photo-upload.test.mjs
(cd backend-ml && .venv/bin/python scripts/test_browser.py)
npm --prefix web run e2e:auth
```

Runner mengelola database `wastewise_browser`, API8001, Vite5180 dan Expo web8083; ekspor di `.local/mobile-browser`. Layanan sementara dihentikan setelah tes; API/Metro pengguna dipertahankan. Setup/teardown membersihkan identitas QA lokal saja. Jangan arahkan ke produksi. GPS browser ditiru secara eksplisit.

Tiga skenario, termasuk DELETE tertahan/gagal, pemulihan draft dan retry sukses pada kedua client:

1. Pengguna web: register, galeri, ML nyata tanpa input kategori/koordinat, konfirmasi GPS, reload/login dan resume draft/deskripsi, finalisasi, edit, axe/responsif, hapus.
2. Admin: agregasi dashboard, filter tanggal/URL/pencarian, review, revision, status In Progress/Completed/reopen beralasan, riwayat, axe/enam viewport.
3. Expo web: register/login, galeri, ML, konfirmasi GPS, kirim/detail/edit/hapus, filter/profil/navigasi dan lebar390px.

Web diperiksa pada320/360/390/768/1024/1440px; tabel admin menggunakan scroll wilayah sendiri tanpa menyembunyikan status. Axe menguji WCAG2A/AA/2.1AA yang tersedia; nol pelanggaran bukan sertifikasi penuh. Empat tes Auth memakai provider tiruan: konfirmasi/resend/reset, PKCE, sesi reload/logout saat provider gagal. Dua tes EXIF mencakup TIFF kedua byte order, koordinat selatan, metadata rusak/truncated dan denominator0.

Regresi upload native menjalankan serializer multipart Expo yang benar-benar terpasang. Tes pertama mereproduksi penolakan objek URI lama sebelum request dikirim; tes kedua memeriksa jalur appendPhoto memakai File, isi byte JPEG, filename, MIME dan parsing multipart. File I/O perangkat diganti secara eksplisit karena Node tidak menyediakan modul filesystem native. Ini melengkapi Expo web, belum menggantikan pemotretan/upload pada iPhone atau Android fisik.

## Mobile native

```bash
npm --prefix mobile run typecheck
npm --prefix mobile run export
```

Ekspor memeriksa bundel iOS/Android/web; bukan bukti pemasangan IPA/APK. Checklist perangkat sebelum rilis:

- Kamera: izin pertama/ditolak/revoked, batal, shutter20siklus, preview/orientasi.
- GPS: precise/approximate/ditolak, layanan mati, fix lambat, batas50m/30detik, foreground/background, tak ada tracking setelah kamera ditutup.
- Galeri: JPEG/PNG/HEIC, EXIF ada/tidak, konfirmasi lokasi unggah, resolusi tinggi, metadata rusak.
- Draft: jaringan terputus saat upload/inference/finalisasi, retry tanpa duplikat, restart/reboot, pergantian akun, logout/discard/expiry24jam, foto pengganti.
- Layar kecil/tablet, keyboard/safe area, font besar, target sentuh44px, pembaca layar.
- Ukur foto→hasil, frame/memori/jaringan pada HP; periksa URL API LAN/HTTPS dapat dijangkau.

## Model dan performa

```bash
cd backend-ml
.venv/bin/python -m ml.evaluate
.venv/bin/python -m ml.calibrate_review
.venv/bin/python -m ml.check_compression
```

Evaluasi memeriksa checksum checkpoint/test manifest dan menghasilkan accuracy, confusion matrix, classification report. Accuracy95,86%/macroF194,10% tetap berasal dari2318test. Review policy dipilih dari2320validation; jangan memilih threshold melalui test. Compression memakai120validation sebagai smoke, bukan holdout lapangan atau bukti kesetaraan encoder native.

`python scripts/benchmark_dashboard.py` hanya menerima mode test/storage/database lokal. Fixture10.000laporan dihapus setelah30request warm/concurrency1; hasil tidak membuktikan latency Supabase atau Core Web Vitals produksi.

## Supabase nyata

```bash
cd backend-ml
.venv/bin/python -m scripts.supabase_smoke --run --browser
```

Development/staging yang diizinkan saja. Memerlukan API8000, web5173, Expo web8081, server key privat, DB dan Chrome. Smoke membuat identitas admin-confirmed sementara; menguji Auth, draft ML/GPS, finalisasi, foto/thumbnail privat, ownership, dashboard/review/status/history, sinkronisasi Expo web, sesi dan cleanup.22pemeriksaan terakhir lulus; UUID QA dibersihkan. Inbox email/GPS hardware/deployment publik belum diuji. Cache signed URL tidak dijamin langsung tercabut.

Rekonsiliasi default read-only, grace24jam. Tes lokal mencakup inventory parsial, key asing/baru/aktif, enqueue idempoten dan perlindungan referensi. Audit cloud kosong bukan bukti penghapusan orphan tua.

## Audit dependensi dan bukti

```bash
npm audit --prefix web --json
npm audit --prefix mobile --json
backend-ml/.venv/bin/python -m pip_audit --format json
```

Bukti tersanitasi di `docs/evidence/`. Audit berlaku pada lock/tanggal pemeriksaan. Jangan menyimpan token, password, `.env`, atau trace browser berisi sesi ke Git/arsip distribusi.

Pengukuran kategori/penghapusan Supabase dan cara mengulangnya: [DRAFT_PERFORMANCE.md](DRAFT_PERFORMANCE.md).
