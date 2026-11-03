# Pengujian WasteWise

Baseline terbaru: [WORKFLOW_IMPLEMENTATION.md](WORKFLOW_IMPLEMENTATION.md). Bukti lokal/cloud dibedakan dari perangkat fisik dan deployment publik.

## Backend dan database

```bash
cd backend-ml
.venv/bin/python scripts/test_local.py -q
.venv/bin/ruff check app ml tests scripts migrations
.venv/bin/mypy app
```

Runner memakai PostgreSQL lokal port54339, database `wastewise_test` dan role tes terpisah; konfigurasi cloud tidak digunakan. Suite awal28tes mencakup Auth/RBAC, ownership, input/upload invalid, UUID/hash/idempotensi, concurrent finalization, larangan kategori/lokasi manual, GPS kamera/galeri, SQL CHECK termasuk NULL, expiry, model failure/retry, edit/revision409, review yang menjaga AI asli, transisi/riwayat, agregasi/timezone, thumbnail/cleanup, rekonsiliasi, batas admin terakhir dan split leakage. Fixture membersihkan hanya akun/path buatannya.

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

Suite awal tiga skenario, termasuk DELETE tertahan/gagal, pemulihan draft dan retry sukses pada kedua client:

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

## Community regression (3 November 2026)

`backend-ml/tests/test_community.py` covers private-by-default reports, consent, peer DTO allowlist, idempotent likes/comments, invalid cursors/bounds/regions, moderation, worker partial upload/retry, withdrawal during upload, cleanup rearming, CORS PUT and whitespace rejection. Run with the existing isolated `scripts/test_local.py` runner.

`web/e2e/community.spec.ts` exercises existing report→consent→published photo→second user like/comment→map→withdrawal; checks landing/onboarding/error pages at320/390/768/1440px and axe. The browser runner starts a local publisher alongside API/Vite/Expo static export. Auth fixtures explicitly use `/login`; local memory-only auth navigates to dashboard through SPA links, preserving its security contract. Real Supabase smoke evidence is `community-supabase.json`; two disposable QA identities were removed. No email delivery or device GPS claim.

Remaining physical-device checks: iOS/Android camera center action opens and cancels correctly; camera/gallery permission denial; EXIF/HEIC; current-GPS confirmation; native map pan/pins/filter; keyboard/large text/safe area; background, return, process restart, expired URL/offline and retry. Android standalone additionally needs Maps SDK/key and a signed build. These remain unrun without the devices/build credentials.

## User experience refinement (3 November 2026)

`node --experimental-strip-types --test shared/filters.test.ts` checks the unfiltered request, every explicit report status, immutable region selection and clearing descendants. The community backend suite additionally checks that all four published statuses appear in the default feed, each status filters the feed/map correctly, cursor pages contain no duplicates, and private reports stay isolated.

The browser suite now verifies user pages without a sidebar; role-specific admin navigation; filter Cancel, Apply, removal and Reset after choosing a parent region; photo placement and Manrope at320/390/768/1024/1440px; accessible community actions; and a live MapLibre worker. The picker Reset scenario uses a clearly named region fixture, not a claim about imported administrative boundaries. Expo web tests exercise the closed filter, reachable sheet controls, gallery/ML, failed draft deletion with recovery, confirmed mock GPS, editing, explicit publication, a photo card on Home, liking and deletion. Screenshot names start with `refinement-`; QA reports are temporary.

MapLibre6 resolves its default worker relative to the main module. Vite's dependency relocation broke that URL; `Map.tsx` now imports the worker through Vite `?worker&url`. A separate static-server Chrome check also bootstrapped the generated production worker. This verifies worker delivery, not worldwide tile availability; OpenStreetMap still needs network access.

Current measured results and logs: [PROGRESS](PROGRESS.md), `evidence/refinement-*.txt`. Auth tests use mocked provider responses, not email inbox delivery. Native export/typecheck do not prove physical-device camera, GPS, keyboard, screen-reader or Maps behavior. No database migration, publication of private legacy reports or ML retraining is part of this refinement.


## Verifikasi publikasi dan Jakob’s Law, 3 November 2026

Suite final backend: **47 tes lulus, 85,52 detik**. Mencakup deskripsi kosong/null/omitted, kontrak publikasi `public-gps-v2`, pembacaan anonim, penolakan token invalid, tiga status publik dan penyembunyian Rejected, metadata prediksi server, serta retry worker ketika koneksi database terputus. Ruff seluruh app/ml/tests/scripts/migrations dan mypy27 modul lulus.

Browser: **5 skenario** mencakup navigasi bersama, menu HP, kartu komunitas, preview landing berisi laporan, peta, FAQ accordion, footer persis sesuai permintaan, halaman informasi, keyboard/filter, axe dan viewport320/390/768/1440 sesuai skenario. Auth: **4 tes lulus**, provider tiruan. Shared filter: **2 tes lulus**. Runner mengekspor iOS/Android/web23route; GPS ditiru pada browser, bukan pengukuran hardware.

`npm run check`, `npm run build`, instalasi bersih terkunci web/mobile, build web bersih dan typecheck mobile bersih lulus. Audit npm kedua client:0kerentanan. Warning chunk MapLibre>500kB serta deprecation Starlette/httpx tetap ada.

Supabase nyata: migrasi `d53e20c61fb8` direhearsal pada restore backup lokal sebelum diterapkan. Backfill hanya dua laporan yang disetujui, idempoten. Feed anonim200, dua posting Pending/Completed dengan foto siap, dua marker, detail/foto200: `evidence/public-policy-supabase.json`. Tidak ada uji inbox email, instalasi perangkat fisik, atau deployment production pada tahap ini.


## Professional social UI (3 November 2026)

`tests/test_public_policy.py` + `tests/test_community.py`:18tes lulus, termasuk newest/oldest keyset dengan timestamp sama dan UUID tie-breaker. Shared filter3tes lulus. Browser menguji Manrope, composer flex, tombol ikon berlabel, urutan posting di URL, komentar mobile, serta logo pada loading yang sengaja ditahan melalui mock config. Teks komentar harus hilang dari composer setelah respons, lalu muncul pada daftar; screenshot loading/input bukan bukti posting tersimpan. Ekspor native tidak membuktikan splash standalone; verifikasi melalui development build/perangkat masih diperlukan.


## Card menus, likes and replies (3 November 2026)

`python scripts/test_local.py`:50tests pass in91.05s, including same-post/root validation, nested reply rejection, idempotency,32reply pagination without duplicates, ownership, root/child soft deletion, counts and withdrawal guard. Initial test expected404 for owner withdrawal; corrected to existing409 contract. `python scripts/test_browser.py`:5E2E pass in1.0m; exports iOS/Android/web first. Browser assertions cover owner/peer menus, Escape, red heart, rollback on503, zero post/feed GETs after successful like, web and Expo-web reply submission/expansion, axe and narrow viewport overflow.

`npm run check`, `npm run build`, Ruff and mypy27modules pass. Existing map chunk>500kB warning and Starlette/httpx deprecation remain. No new runtime dependency. Card screenshot evidence: `card-menu-web.png`, `card-menu-mobile.png`, `community-post-desktop.png`. Expo native bundling is verified; physical device animation smoothness, keyboard and assistive technologies remain untested.
