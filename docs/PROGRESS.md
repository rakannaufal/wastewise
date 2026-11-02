# Status implementasi WasteWise

Tanggal verifikasi: 2 November 2026. Lingkungan: macOS arm64, RAM 8 GB, Node 24.22.1, Python 3.12.8, PostgreSQL 17.11. Source yang diuji: working tree branch lokal `codex/wastewise`. Tujuan repository: https://github.com/rakannaufal/wastewise. Status publikasi dicatat setelah verifikasi remote. Catatan perencanaan awal dipertahankan di [history](history/planning-2026-11-02.md); status awal tersebut sudah digantikan dokumen ini.

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
| Pengujian backend | 17 tes PostgreSQL lulus termasuk kontrak Auth Supabase; Ruff dan mypy lulus | evidence/backend-tests.txt, evidence/backend-static.txt |
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
- Backup/restore production, downgrade migrasi, shared rate limiter, monitoring dan rekonsiliasi orphan masih bagian gate rilis. Jalankan satu worker API sampai limiter bersama tersedia.
- Outbox menangani penghapusan yang tercatat. Kegagalan DB dan storage bersamaan saat kompensasi upload dapat meninggalkan orphan; rekonsiliasi wajib sebelum production.
- Metadata Kaggle menyatakan Database Open Database, Contents Copyright Original Authors. Handoff lokal tidak menjadi izin publikasi ulang seluruh foto.

Langkah berikutnya: verifikasi pengiriman email dengan alamat yang dikuasai pengguna, rekonsiliasi orphan dan deployment staging; uji perangkat native sesuai SETUP.md.

## Integrasi Supabase aktual

Proyek pengguna terverifikasi melalui dashboard dan CLI resmi. Tabel awal kosong sebelum migrasi. Revisi Alembic akhir41ba8d170ab2 diterapkan ke remote; empat tabel app_private. Tidak memindahkan atau menghapus data lokal yang sudah ada. Bucket waste-images private, JPEG-only, batas5MiB. Rahasia hanya .env0600; konfigurasi lokal sebelumnya disimpan privat dalam .local untuk pemulihan development.

- 17 tes backend PostgreSQL lokal lulus. Runner menggunakan kredensial role test tersendiri; konfigurasi cloud tidak dapat mengarahkannya ke remote.
- Tiga E2E lokal web/admin/Expo web lulus sebelum pengalihan cloud. Empat E2E kontrak SDK Auth lulus: login/persistensi/logout saat provider503, signup pending/resend/reset, invalid credentials, PKCE password recovery. Axe pada layar konfirmasi mobile tidak menemukan pelanggaran tag yang diperiksa.
- Smoke cloud nyata lulus: login provider, provisioning profil, metadata role diabaikan, inference checkpoint, persistensi report, signed URL, pemilik lain404, akses public ditolak, perubahan role/status, delete dan outbox cleanup. Browser Chrome tanpa mock login/reload/logout juga lulus. Bukti: evidence/supabase-smoke.json dan supabase-web-session.png. Identitas QA dibuat admin-confirmed lalu dihapus; ini tidak menguji email delivery.
- Site URL dan empat redirect root/reset localhost/127.0.0.1 port5173 disimpan di dashboard. Konfirmasi email tetap diwajibkan. Domain deployment harus ditambahkan setelah URL aktual tersedia.
- Signed URL adalah capability900detik; CDN/browser yang sudah menyimpan respons dapat tetap menyajikannya sampai kedaluwarsa. Upload baru meminta cache-control0. Cleanup dibuktikan lewat inventory Storage, bukan klaim pencabutan semua URL secara instan.
- Audit npm web/mobile setelah SDK: nol kerentanan diketahui. Ekspor Expo iOS/Android/web lulus.

CLI terhubung melalui akun dashboard pengguna, bukan plugin Supabase. Key server disimpan setelah izin eksplisit pengguna; nilainya tidak dicetak dan tidak masuk repository.
