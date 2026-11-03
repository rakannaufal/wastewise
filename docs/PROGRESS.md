# Status implementasi WasteWise

Status terbaru: sistem mobile-first telah diimplementasikan; lihat [WORKFLOW_IMPLEMENTATION.md](WORKFLOW_IMPLEMENTATION.md). Catatan fase sebelumnya di bawah dipertahankan sebagai riwayat, bukan batas fitur terkini. Draft otomatis, edit laporan, review/status/history dan dashboard admin sudah tersedia.

Tanggal verifikasi: 2 November 2026. Lingkungan: macOS arm64, RAM 8 GB, Node 24.22.1, Python 3.12.8, PostgreSQL 17.11. Source yang diuji: working tree branch lokal `codex/wastewise`. Tujuan repository: https://github.com/rakannaufal/wastewise. Publikasi awal branch main terverifikasi pada commit5220f96705cf59c839dfcbb77bbbca5b68a1c515; perubahan berikutnya mengikuti commit terbaru. Catatan perencanaan awal dipertahankan di [history](history/planning-2026-11-02.md); status awal tersebut sudah digantikan dokumen ini.

| Bagian | Hasil aktual | Bukti |
| --- | --- | --- |
| Blueprint | SPEC asli dipertahankan; branding WasteWise dan 12 kelas mengikuti instruksi pengguna | SHA256 `fa9d55d57d3d79359cdb6f4304b09c5e4f0f107a34854974ac4468eae89506d6`, DECISIONS.md |
| API | FastAPI, autentikasi, RBAC, laporan privat, statistik, manajemen akun, inferensi, media bertanda tangan | API.md, openapi.json, evidence/api-smoke.json |
| Database | PostgreSQL berjalan; migrasi Alembic diterapkan ke DB aplikasi dan test; runtime role dibatasi DML | DATABASE.md, schema.sql, backend tests |
| Web | React/Vite, dashboard/grafik, klasifikasi, laporan, panduan, pengelola, responsif | Build/check dan skenario browser pengguna/pengelola |
| Mobile | Expo, lima tab, kamera/galeri/lokasi, laporan, filter, profil, SecureStore native | Typecheck dan ekspor iOS/Android/web; alur Expo web diuji |
| Dataset | 15.515 JPG lokal, 12 kategori; sumber Kaggle dikonfirmasi pengguna | DATASET.md, audit.json, source-metadata.json |
| Split | 68 konflik-label dan 16 exact duplicate dikeluarkan; grup pHash transitif sebelum split | Train 10.793, validation 2.320, test 2.318; manifests dan integrity test |
| Model | MobileNetV2 backbone beku + classifier 12 kelas; checkpoint nyata | ml/models/wastewise-v1.pth, metadata.json, training_history.json |
| Evaluasi | Accuracy 95,86%; macro F1 94,10%; F1 terendah 85,14%; kedua gate PASS | EVALUATION.md, metrics.json, predictions.jsonl, confusion matrix |
| Pengujian backend | 24 tes PostgreSQL lulus termasuk workflow otomatis dan SQL CHECK; Ruff dan mypy lulus | evidence/workflow-backend-tests.txt, evidence/workflow-backend-static.txt |
| Instalasi bersih | Lock Python dipasang ke venv baru; 13 tes lulus lagi. npm ci web/mobile ke direktori baru; pemeriksaan lulus | evidence/clean-install.txt |
| Audit dependensi | Tidak ada kerentanan yang dikenal pada audit akhir web, mobile, Python | evidence/*-audit.json |
| Desain | Arah daylight forest/sage; foto nyata beratribusi; pemeriksaan aksesibilitas dan responsif | DESIGN.md, DESIGN_QA.md, evidence/*.png |
| Penyerahan | Source/model/docs dan dataset dalam arsip lokal terpisah dengan checksum | release/manifest.json; DELIVERABLES.md |

## Perintah yang dijalankan

```bash
npm run check
npm run build
npm --prefix mobile run export
npm --prefix web run e2e
cd backend-ml
.venv/bin/python scripts/test_local.py -q
.venv/bin/ruff check app ml tests scripts migrations
.venv/bin/mypy app
.venv/bin/alembic upgrade head
.venv/bin/alembic check
.venv/bin/python -m ml.prepare
.venv/bin/python -m ml.train --epochs 30 --finetune 0 --batch-size 16
.venv/bin/python -m ml.evaluate
```

Training akhir memakai backbone beku; konfigurasi lengkap ada pada metadata dan ML.md. Durasi head loop tidak termasuk ekstraksi fitur. Test tidak digunakan memilih checkpoint. Pemeriksaan instalasi bersih memakai salinan terisolasi di `.local/clean`; secrets, cluster dan akun uji tidak dimasukkan arsip.

## Batas verifikasi dan pekerjaan produksi

- API lokal terhubung ke Supabase Auth, PostgreSQL remote dan bucket privat. TLS verify-full memakai CA resmi ditambah CA publik. Role runtime hanya CONNECT, USAGE dan DML app_private; tidak memiliki hak CREATE pada schema.
- Ekspor native bukan APK/IPA. Tidak tersedia simulator terpasang; kamera, izin, SecureStore reboot, safe area, keyboard dan perangkat nyata belum diuji.
- Belum ada deployment publik, penandatanganan aplikasi atau publikasi toko. Status GitHub/CI dicatat di bagian publikasi.
- Belum dilakukan uji lapangan untuk domain shift, kalibrasi confidence atau objek di luar 12 kelas.
- Backup/restore production, downgrade migrasi, shared rate limiter, monitoring masih bagian gate rilis; rekonsiliasi orphan tersedia. Jalankan satu worker API sampai limiter bersama tersedia.
- Outbox menangani penghapusan tercatat. Rekonsiliasi app.reconcile menangani kandidat orphan berusia minimal24jam; audit remote menemukan0objek/0orphan. Worker mempertahankan object yang masih direferensikan. Enqueue/delete orphan remote belum diuji dengan objek berumur24jam; alur ini diuji di database lokal.
- Metadata Kaggle menyatakan Database Open Database, Contents Copyright Original Authors. Handoff lokal tidak menjadi izin publikasi ulang seluruh foto.

Langkah berikutnya: verifikasi pengiriman email dengan alamat yang dikuasai pengguna dan deployment staging; uji perangkat native sesuai SETUP.md.

## Integrasi Supabase aktual

Proyek pengguna terverifikasi melalui dashboard dan CLI resmi. Tabel awal kosong sebelum migrasi. Revisi Alembic akhir41ba8d170ab2 diterapkan ke remote; empat tabel app_private. Tidak memindahkan atau menghapus data lokal yang sudah ada. Bucket waste-images private, JPEG-only, batas5MiB. Rahasia hanya .env0600; konfigurasi lokal sebelumnya disimpan privat dalam .local untuk pemulihan development.

- 19 tes backend PostgreSQL lokal lulus. Runner menggunakan kredensial role test tersendiri; konfigurasi cloud tidak dapat mengarahkannya ke remote.
- Tiga E2E lokal web/admin/Expo web lulus sebelum pengalihan cloud. Empat E2E kontrak SDK Auth lulus: login/persistensi/logout saat provider503, signup pending/resend/reset, invalid credentials, PKCE password recovery. Axe pada layar konfirmasi mobile tidak menemukan pelanggaran tag yang diperiksa.
- Smoke cloud nyata lulus: login provider, provisioning profil, metadata role diabaikan, inference checkpoint, persistensi report, signed URL, pemilik lain404, akses public ditolak, perubahan role/status, delete dan outbox cleanup. Browser Chrome tanpa mock login/reload/logout juga lulus. Bukti: evidence/supabase-smoke.json dan supabase-web-session.png. Identitas QA dibuat admin-confirmed lalu dihapus; ini tidak menguji email delivery.
- Site URL dan empat redirect root/reset localhost/127.0.0.1 port5173 disimpan di dashboard. Konfirmasi email tetap diwajibkan. Domain deployment harus ditambahkan setelah URL aktual tersedia.
- Signed URL adalah capability900detik; CDN/browser yang sudah menyimpan respons dapat tetap menyajikannya sampai kedaluwarsa. Upload baru meminta cache-control0. Cleanup dibuktikan lewat inventory Storage, bukan klaim pencabutan semua URL secara instan.
- Audit npm web/mobile setelah SDK: nol kerentanan diketahui. Ekspor Expo iOS/Android/web lulus.

CLI terhubung melalui akun dashboard pengguna, bukan plugin Supabase. Key server disimpan setelah izin eksplisit pengguna; nilainya tidak dicetak dan tidak masuk repository.

## Publikasi dan tindak lanjut

Repository https://github.com/rakannaufal/wastewise branch main sudah dipush; SHA remote dicocokkan dengan commit lokal. Checkpoint9MB disertakan, dataset/ZIP/secrets/cache tidak. Pemeriksaan byte terhadap key server/JWT secret/password DB aktif tidak menemukan kecocokan pada file yang dipublikasikan.

Setelah publikasi awal, ditambahkan rekonsiliasi orphan dan pemilahan worker berdasarkan bucket. Default audit read-only, minimum grace24jam, hanya key UUID/UUID.jpg, seluruh inventory harus selesai sebelum enqueue, konflik job tidak digandakan. Worker tidak menghapus object dengan referensi laporan aktif. Bukti audit cloud: evidence/supabase-orphan-audit.json. Pengujian lokal mencakup objek baru/aktif/asing, orphan tua, enqueue ganda, inventory terputus dan perlindungan referensi.

SDK Supabase web dimuat dinamis; bundle utama411kB, SDK214kB, build tanpa peringatan chunk500kB. Tidak ada perubahan checkpoint atau tuning terhadap test. CI GitHub publikasi awal5220f96 lulus pada kedua job clients/backend: https://github.com/rakannaufal/wastewise/actions/runs/41395632665. Revisi selanjutnya memicu pemeriksaan baru.

## Audit ulang kesiapan (2 November 2026)

Lihat [AUDIT.md](AUDIT.md) untuk temuan berprioritas dan cakupan terperinci. Source aplikasi ec058f8: check/build web, typecheck mobile, ekspor tiga platform, Ruff/mypy dan19tes backend lulus lagi. Empat tes kontrak Auth lulus; smoke Supabase nyata14pemeriksaan lulus. Browser tambahan web/Expo web menguji klasifikasi, create/detail/delete laporan, foto privat yang benar-benar termuat, sesi dan logout terhadap cloud. Empat layar web diperiksa axe dengan0pelanggaran pada aturan yang diuji; tidak ada uncaught JavaScript error pada kedua alur. Seluruh identitas QA audit dibersihkan.

OpenAPI tersimpan identik dengan API aktif. Readiness database/storage/model ready; worker kontinu yang telah diizinkan pengguna tetap aktif selama sesi pengembangan. Audit npm web/mobile dan101paket Python menemukan0kerentanan dikenal. Checksum ZIP/checkpoint valid, dataset15.515JPG/12kategori cocok. Metrik dihitung ulang dari2.318prediksi tersimpan dan sesuai laporan; model tidak dilatih ulang. CI terbaru ec058f8 juga success: https://github.com/rakannaufal/wastewise/actions/runs/41396207638.

Putusan: enam artefak tersedia dan alur inti siap demo lokal dengan akun Supabase terkonfirmasi. Email delivery nyata, deployment publik, build/perangkat native, backup/restore/monitoring produksi dan evaluasi lapangan masih terbuka. Bukti audit baru berada di docs/evidence; ZIP release adalah snapshot sebelumnya dan belum memuat laporan audit baru.

## Perbaikan koneksi iPhone melalui LAN (2 November 2026)

Screenshot pengguna memperlihatkan kegagalan jaringan pada layar login native. Diagnosis aktual: `mobile/.env` belum ada sehingga API memakai fallback `http://localhost:8000`; Uvicorn hanya bind `127.0.0.1:8000`. Request auth/config melalui loopback berhasil, tetapi melalui IP LAN gagal. Ini berbeda dari kesalahan kredensial Supabase.

Dibuat konfigurasi lokal `mobile/.env` yang diabaikan Git, berisi EXPO_PUBLIC_API_URL ke IP LAN komputer192.168.100.168 port8000. API yang sama direstart terarah pada `0.0.0.0:8000`, mempertahankan Supabase/model dan origin browser sebelumnya. Server Expo pengguna port8082 tetap dipertahankan; watcher environment memuat perubahan. README menambahkan langkah jaringan lokal, pemeriksaan Safari dan reload.

Verifikasi: health/ready dan api/v1/auth/config melalui loopback maupun LAN sama-sama HTTP200; database/storage/model ready, provider supabase. Manifest Expo iOS menunjuk server LAN port8082; bundle iOS aktual berukuran6.969.269byte memuat URL API LAN yang baru. Pengujian dilakukan dari komputer; login ulang dan izin Local Network pada iPhone tetap memerlukan pengguna memuat ulang aplikasi. Tidak mengubah password/akun pengguna, konfigurasi Supabase remote, atau perubahan tsconfig yang sudah ada. Saat IP LAN berubah, konfigurasi lokal perlu diperbarui.

## Audit checklist A/B/C pengguna (2 November 2026)

Matriks lengkap dan penjelasan arsitektur ada di [REQUIREMENTS_AUDIT.md](REQUIREMENTS_AUDIT.md). Ditemukan kekurangan implementasi: CRUD laporan belum lengkap karena update saat ini hanya status admin; belum tersedia edit isi laporan. Audit ini melaporkan temuan, tidak menambahkan fitur editor. Register/login, dashboard, foto/GPS/deskripsi, riwayat dan AI mobile ada dalam source; Expo web telah diuji, sedangkan konfirmasi login/kamera/GPS iPhone tetap terbuka.

Seluruh checklist ML terpenuhi:12kategori mencakup biological/Organik,plastic,paper;15.515gambar;PyTorch;checkpoint dan training/testing nyata;accuracy95,86% di2.318gambar test;confusion matrix dan classification report tersedia;FastAPI predict. Audit menghitung ulang metrik dari prediksi tersimpan, mencocokkan matrix/report, memeriksa checksum serta jumlah file. `npm run check` lulus lagi. API aktif loopback/LAN menjawab ready dan kontrak OpenAPI membuktikan tidak adanya endpoint edit isi. Tidak melakukan training ulang atau mengulang seluruh suite yang telah lulus sebelumnya.

## Rencana sistem mobile-first (2 November 2026)

Ditulis [SYSTEM_IMPROVEMENT_PLAN.md](SYSTEM_IMPROVEMENT_PLAN.md) untuk tiga prioritas pengguna: kamera/galeri memicu ML otomatis dengan GPS bersumber jelas, dashboard admin operasional, serta responsivitas/performa terukur. Pengguna mengonfirmasi GPS saat unggah boleh dipakai untuk foto galeri tanpa metadata setelah pernyataan foto berasal dari lokasi tersebut. Rencana meliputi draft server agar upload/inferensi tidak berulang, idempotensi, lokasi dan klasifikasi yang tidak dapat diisi manual oleh pengguna, edit laporan, review/riwayat status, migrasi kompatibel dan uji perangkat nyata.

Dasar perencanaan: source mobile/backend/dashboard, kontrak API/DB, konfigurasi Expo dan tipe ImagePicker terpasang, serta bukti audit yang sudah ada. Skill Impeccable dan UI/UX Pro Max dipakai untuk struktur tugas/dashboard, izin, gambar dan responsivitas. Tidak mengubah source aplikasi, menerapkan migrasi remote, menjalankan training, atau mengklaim target performa sebagai hasil baru. Pemeriksaan tahap ini terbatas pada konsistensi dokumen dan diff; suite aplikasi tidak diulang untuk perubahan dokumentasi.

## Implementasi sistem mobile-first (2 November 2026)

Kamera/galeri memicu normalisasi foto dan inferensi otomatis. Pengguna tidak memilih kategori atau mengetik koordinat; backend menolak bypass manual. Kamera memasangkan GPS dengan shutter; galeri memakai EXIF atau GPS unggah setelah konfirmasi lokasi yang disepakati pengguna. Draft privat24jam, foto lokal native privat, UUID/hash, retry analisis tanpa upload ulang dan finalisasi idempoten menjaga pengiriman tidak ganda. ML gagal tetap berupa draft. Hasil kurang meyakinkan masuk needs_review, tanpa mengklaim deteksi objek asing.

CRUD kini mencakup edit deskripsi/foto; pengguna saat Pending, admin lintas status. Review beralasan menjaga prediksi AI asli. Transisi status, alasan reject/reopen, revision409 dan event transaksi tersedia di web/mobile. Dashboard admin memiliki periode/timezone, pembanding, tren harian, distribusi12kelas, antrean tertua/review seluruh periode, serta median waktu dari event nyata. Foto1600px/JPEG82, thumbnail320px, batch signing, pagination, cancellation dan timeout mengurangi beban. Bug pemuatan editor yang dapat menimpa ketikan telah diperbaiki; tiga E2E mencakup regresinya.

Supabase8a4d7c209e51 diverifikasi setelah migrasi diuji pada restore backup app_private; satu laporan legacy dipertahankan. Schema SQL/OpenAPI diperbarui. Runtime tetap bukan schema owner; API dan worker cleanup dimuat ulang pada konfigurasi yang sama, Metro pengguna dipertahankan. Readiness loopback/LAN200, database/storage/model ready dan OpenAPI tersimpan sama dengan API aktif.

Verifikasi akhir:

- **24 tes backend lulus**,71,40detik; Ruff/mypy19file lulus. Satu peringatan Starlette/httpx deprecation.
- **3 E2E lokal lulus**,26,4detik: pengguna web, admin dan Expo web. **4 tes Auth lulus**,16,7detik dengan provider tiruan. **2 tes EXIF lulus**.
- Smoke Supabase nyata **22 pemeriksaan lulus**, QA dibersihkan; termasuk Expo web→admin→review/status→Expo web, foto privat/thumbnail dan cleanup. Bukan email inbox atau GPS hardware.
- Typecheck/lint, build web, ekspor iOS/Android/web lulus. Main web430,03kB/gzip135,31kB; composer10,72kB terpisah, SDK214,40kB terpisah. Audit dependensi web/mobile/Python0kerentanan dikenal saat pemeriksaan.
- Axe admin/detail0pelanggaran aturan yang diuji; viewport320/360/390/768/1024/1440 tanpa overflow halaman. Status tabel admin tetap tersedia lewat scroll wilayah pada layar kecil. Screenshot lokal desktop/mobile tersimpan.
- Dashboard10.000laporan sintetis lokal: median23,0ms/p9527,8ms,30request warm/concurrency1. Tidak mencakup jaringan Supabase. Compression smoke120validation: agreement97,5%, subsetaccuracy91,67% sebelum/sesudah. Review policy2320validation: confidence50/margin30, acceptedprecision98,02%/coverage93,79%. Model/test95,86% tidak berubah, tanpa retraining.

Bukti terbaru: evidence/workflow-{backend-tests,backend-static,check,build,local-browser,auth-browser,exif}.txt, workflow-runtime.json, workflow-dashboard-benchmark.json, workflow-*-audit.json, workflow-admin-local-*.png, supabase-smoke.json. Detail konfigurasi dan batas pengukuran: WORKFLOW_IMPLEMENTATION.md dan TESTING.md.

Masih terbuka: perangkat iOS/Android fisik (kamera/GPS/HEIC/izin/lifecycle/reboot/performa), deployment HTTPS, SMTP/email delivery, pemulihan penuh Auth/Storage, shared rate limiter multi-worker, monitoring dan holdout lapangan. Implementasi terverifikasi untuk demo lokal/Supabase; belum dinyatakan siap rilis publik. Langkah berikut: uji kamera/GPS pada dua perangkat fisik menggunakan checklist TESTING.md.

## Perbaikan kategori setelah foto iPhone (2 November 2026)

Screenshot pengguna18.01menunjukkan foto lokal, tanpa kategori, dengan kegagalan koneksi. Request Auth/statistik pada log API berhasil tetapi upload draft tidak mencapai server. Serializer fetch default Expo SDK58 menolak multipart objek URI lama (`Unsupported FormDataPart implementation`). Upload native kini memakai File expo-file-system yang menyediakan bytes(); backend dan checkpoint tidak diubah. Kategori/indikator analisis ditempatkan langsung setelah foto. Retry membersihkan pesan kegagalan sebelumnya.

Dua tes regresi menjalankan serializer Expo terpasang: reproduksi penolakan objek lama, lalu verifikasi byte JPEG/MIME/filename dan parsing multipart jalur appendPhoto yang baru. File I/O perangkat diganti secara eksplisit; tes ini tidak mengklaim pemotretan fisik. Root check/typecheck lulus; ekspor iOS/Android/web lulus. Tiga E2E lokal lulus lagi (1,5menit), termasuk kategori otomatis sebelum konfirmasi GPS dan submit. Bukti: evidence/native-upload-*.txt. CI menyertakan regresi serializer.

Metro/API pengguna tetap aktif. Reload Expo Go lalu ambil foto baru untuk verifikasi iPhone. Draft lama yang gagal dapat dicoba ulang dengan tombol foto yang sama; tidak perlu memilih kategori atau menekan Kirim laporan untuk memulai analisis.


## Respons kategori dan penghapusan draft (2 November 2026)

Unggah asli/thumbnail dan inferensi diparalelkan. Thumbnail disiapkan sebelum upload untuk mencegah objek tertinggal bila pemrosesan lokal gagal. Pool HTTPS Supabase mengurangi handshake; profil lama memakai query dengan pengecualian identitas terblokir; provisioning tetap terkunci. Auth tetap diverifikasi per request, role tidak dicache. Antrean cleanup batch/upsert menjaga idempotensi. DELETE draft menerima expiry dan pengulangan, mengisolasi pemilik, menolak draft consumed.

Web/mobile menyembunyikan foto/kategori/lokasi selama DELETE, menampilkan proses, memulihkan draft jika gagal; file lokal baru dibuang setelah konfirmasi server. Hasil ML tampil sebelum penyimpanan GPS selesai. Pemilihan foto/submit diblokir selama proses agar request tidak saling menimpa.

28tes backend lulus59,18detik;3E2E web/Expo lulus31,4detik, termasuk respons DELETE tertahan/gagal/retry nyata.22pemeriksaan Supabase nyata lulus dengan cleanup QA selesai. Check/typecheck/build/Ruff/mypy, ekspor iOS/Android/web,2regresi serializer dan2tes EXIF lulus; audit npm kedua client0kerentanan. Peringatan Starlette/httpx lama tetap ada.

Median3sampel Supabase: kategori5429,6→3332,1ms (38,6%); hapus4266,4→2382,8ms (44,2%). Sampel memakai komputer lokal/gambar8042byte, bukan latency HP atau p95. Detail: [DRAFT_PERFORMANCE.md](DRAFT_PERFORMANCE.md). Kamera/GPS fisik dan produksi tetap gate terbuka. Tidak ada migrasi atau retraining.

## Komunitas, peta, landing dan identitas bersama (3 November 2026)

Diimplementasikan feed login-only, publikasi eksplisit foto/deskripsi/GPS presisi, suka idempoten, komentar UUID-retry, edit caption/pencabutan, flag konten dan moderasi ber-audit. DTO komunitas terpisah dari laporan privat; sumber foto diganti tidak mempublikasikan pengganti otomatis. Worker derivatif1080/320px terpisah dari ML; cleanup dicatat sebelum upload, lease/attempt fence mencegah worker lama menerbitkan kembali posting yang dicabut. Job cleanup yang pernah melindungi referensi dapat diaktifkan kembali ketika publikasi dihapus. Tes menemukan dan memperbaiki lock FOR UPDATE pada eager outer join serta CORS PUT untuk suka browser.

Filter server provinsi/kota/kecamatan/kelurahan, kategori/status; map bbox/zoom dengan grid cluster maksimum500; pagination feed/comment cursor. Data MIT dipatok commit/checksum:38 provinsi,514 kabupaten/kota,7.285 kecamatan,83.762 desa/kelurahan.83.604 poligon cocok,0 kode asing,158 batas belum tersedia; tidak menebak wilayah dengan centroid. Import Supabase lengkap91.599nama/83.604poligon. Revisi b31c80a21ef4 dan c42d19b50ea7 diuji pada restore backup app_private kemudian diterapkan dengan guard revisi; dua laporan lama tetap privat dan0post komunitas tersisa setelah QA. Runtime DML terjaga. Titik Gambir31.71.01.1001 terverifikasi;5sampel resolver lokal16,59ms cold lalu1,92–2,23ms warm, bukan p95. Satu request Supabase termasuk jaringan1859,68ms, bukan benchmark perangkat.

Web: landing publik, feed/app, peta, moderasi, onboarding, keluarga error4xx/5xx, fallback tanpa WebGL dan daftar lokasi yang dapat diakses. Manrope/Caveat self-hosted Latin; palette forest bersama, logo mark/outlined wordmark/icon asli. Native: FlatList, filter bertingkat, detail/suka/komentar/publikasi, peta native, lima tab dengan kamera68px; capture dari tab melanjutkan composer, galeri langsung dari kamera, cancel kembali. Expo web memakai daftar lokasi; React web memakai MapLibre lazy. Asset prompts seluruh halaman tersedia; slot ilustrasi terhubung tetapi raster ilustrasi khusus belum dihasilkan. Contoh dataset landing berlabel/beratribusi; bukan posting palsu atau data training baru.

Verifikasi terukur tahap ini:

- 35tes backend lulus75,00detik, Ruff seluruh app/ml/tests/scripts/migrations lulus; mypy26modul lulus. Peringatan Starlette/httpx deprecation tetap ada.
- 5E2E lulus54,8detik: admin, komunitas lintas pengguna/peta/pencabutan, landing/onboarding/error responsif+axe, Expo galeri/ML/GPS mock, laporan web/edit/draft/delete.4tes Auth lulus23,5detik: sesi, logout failure, signup/resend/reset, PKCE. Bukan GPS hardware/email inbox.
- 9pemeriksaan Supabase nyata lulus; QA dibersihkan. Auth/database/Storage privat, isolasi laporan, signed derivative, proyeksi aman, suka/komentar retry, map/38provinsi, withdrawal/delete.
- Typecheck/lint dan build web lulus. Initial application422,69kB/gzip132,49kB; MapLibre1079,31kB/gzip293,53kB dimuat pada rute peta. Warning ukuran chunk peta dicatat, tidak disembunyikan.
- Audit npm web/mobile0kerentanan, pip-audit0kerentanan dikenal. `npm ci` bersih dari manifest/lockfile diuji pada .local/community-clean. Ekspor iOS/Android/web tersedia; bukti final export dan paket ditambahkan setelah perintah selesai.

Bukti: docs/evidence/community-*.txt/json/png. Kontrak API/OpenAPI/schema/ERD, README, DECISIONS, PRODUCT/DESIGN, REGIONS, COMMUNITY_IMPLEMENTATION, TESTING dan indeks deliverable diperbarui. Model95,86%, checkpoint/split/evaluasi tetap; tidak ada retraining.

Terbuka: raster ilustrasi final sesuai prompt; kamera/GPS/peta pada iOS/Android fisik, Maps key Android standalone; penyedia ubin production sesuai kapasitas/kebijakan; deployment HTTPS, SMTP, monitoring/shared limiter dan holdout model lapangan. Halaman error SPA bukan bukti HTTP status server hosting. Pengukuran lokal/remote di atas bukan klaim rilis production.

Final runtime: web5173/API8000 readiness loopback+LAN200/Metro8082 status200; konfigurasi API mobile cocok IP Wi-Fi192.168.100.168. Publisher dimuat ulang dengan source lease fence final; cleanup kontinu aktif sesuai izin sebelumnya. Ekspor final iOS/Android/web lulus; npm ci kedua client dari lockfile final lulus. Dua regresi multipart Expo lulus. Source/model/docs dan dataset lokal dikemas ulang lewat scripts/package_release.py; checksum ada di release/manifest.json, ZIP tetap lokal/diabaikan Git.

Tambahan verifikasi final: dua tes EXIF lulus melalui `node --experimental-strip-types --test shared/photo-location.test.ts`; koordinat selatan/endian dan metadata rusak/tidak ada ditangani tanpa lokasi rekaan. Bukti final check/build/export/EXIF diperbarui dari log terakhir.
