# Pengujian

## Backend dan database

```bash
cd backend-ml
.venv/bin/python scripts/test_local.py -q
.venv/bin/ruff check app ml tests scripts migrations
.venv/bin/mypy app
```

Runner membuat/reuse DB wastewise_test terpisah, menerapkan migrasi lalu menjalankan pytest dengan ENVIRONMENT=test. Fixture hanya membersihkan akun/path yang dibuat tes tersebut. Tidak menyentuh DB aplikasi; role test lokal dibuat/dirotasi khusus runner dan tidak memakai URL database cloud. Tujuh belas tes mencakup validasi/register/login, anti role injection, kepemilikan list/detail/delete, filter/pagination, statistik 12 kategori, status admin, spoof AI, upload invalid/oversize/koordinat invalid, model degraded/manual report, outbox cleanup, JWT/media expiry, role DB current, last-admin concurrent demotion, rate limiting, checkpoint korup, penghapusan akun, filter pengguna, dan fingerprint/group leakage split.

Prediksi tertentu dalam tes unit/integrasi dimock secara eksplisit untuk menguji metadata server. Ini tidak menjadi bukti akurasi model; model nyata diukur oleh evaluasi test dan dipakai dalam browser smoke test.

## Web

```bash
npm --prefix web run check
npm --prefix web run build
npm --prefix web run e2e
```

E2E memerlukan API localhost:8000, Vite 127.0.0.1:5173, ekspor Expo web 127.0.0.1:8081, Google Chrome, dan dataset lokal. Jalankan ekspor mobile terlebih dahulu, tunggu selesai, lalu layani dengan `python3 -m http.server 8081 --bind 127.0.0.1 --directory mobile/dist` dari root. Izinkan keempat origin localhost/127.0.0.1 port 5173/8081 melalui CORS_ORIGINS backend. Jangan mengganti bundel Expo ketika tes berjalan.

Tiga skenario browser:

1. Web pengguna: register/login, empty dashboard, axe WCAG2A/AA/2.1AA, klasifikasi nyata, koreksi kategori, simpan laporan lokasi manual, detail, ringkasan jumlah nyata dan grafik 12 kategori/4 status, viewport 390/1440, drawer, filter kosong, panduan 12 kategori, delete dengan dialog, logout.
2. Web pengelola: login keyboard, show password, perubahan status, filter dan perubahan peran pengguna, proteksi pengelola, penghapusan akun, dialog Escape, offline banner, kegagalan request dan retry.
3. Expo web: register/login, pilih foto galeri, prediksi nyata, draft tanpa foto dalam URL, simpan/detail/hapus laporan, filter status, profil, navigasi panduan, logout dan overflow pada viewport 390.

Screenshot berada di docs/evidence. Akun QA memakai password acak; setup/teardown hanya mengelola akun uji lokal dengan nama dan pola email yang dibatasi. Jangan menjalankan tes di produksi.

## Mobile

```bash
npm --prefix mobile run typecheck
npm --prefix mobile run export
```

Export memeriksa bundel iOS/Android/web. Ini tidak menggantikan pemasangan pada emulator/perangkat. Belum diverifikasi pada perangkat: kamera, izin ditolak/revoked, SecureStore reboot, keyboard/safe area seluruh ukuran layar, jaringan lambat/offline/retry, tanda tangan build dan publikasi toko.

## Model

```bash
cd backend-ml
.venv/bin/python -m ml.evaluate
```

Checkpoint dan test manifest harus cocok checksum. Output: metrics.json, predictions.jsonl, confusion_matrix.png, training_curves.png. Accuracy >0,85 dan setiap kelas F1>=0,75; evaluasi gagal tidak boleh diubah menjadi PASS. Test tidak boleh dipakai memilih hyperparameter. Ulang evaluasi checkpoint sama boleh untuk reproduksi, bukan untuk menyetel model terhadap test.

## Audit keamanan

`npm audit --prefix web`, `npm audit --prefix mobile`, dan `python -m pip_audit`. Override glob/minimatch diterapkan untuk temuan transitif; pip diperbarui untuk temuan toolchain. Simpan JSON audit di docs/evidence; hasil sesuai tanggal pemeriksaan, bukan jaminan tidak ada kerentanan baru.

Downgrade migrasi dan backup/restore production tidak dijalankan. Supabase remote telah diuji dengan identitas QA sementara; deployment publik, email delivery dan pengujian lapangan belum diverifikasi.

## Kontrak Auth dan smoke Supabase

`npm --prefix web run e2e:auth` memakai provider tiruan eksplisit dan tidak memerlukan akun Supabase. Jangan menafsirkan hasilnya sebagai pengiriman email nyata. Empat skenario memeriksa konfirmasi, recovery PKCE, sesi reload dan logout saat provider gagal.

```bash
cd backend-ml
.venv/bin/python -m scripts.supabase_smoke --run --browser
```

Hanya jalankan pada konfigurasi development/staging yang memang diizinkan untuk QA. API dan Vite harus hidup. Memerlukan key server privat; membuat dua identitas QA admin-confirmed, menguji backend/bucket/browser nyata, membersihkan UUID yang dibuat. Worker normal memproses job due; jangan arahkan ke produksi. Flag browser memerlukan Node24 dan Google Chrome. Output bukti disanitasi tanpa password/token; tidak menguji email masuk. Signed URL yang sudah dicache tidak dijamin langsung tercabut saat object dihapus.
