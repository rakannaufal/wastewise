# WasteWise

Aplikasi pengenalan12 kategori sampah, pelaporan, komunitas foto publik dengan suka/komentar, serta peta lokasi. React web, Expo mobile, FastAPI, PostgreSQL, MobileNetV2. Bahasa antarmuka Indonesia.

Laporan baru otomatis dibagikan kepada publik, termasuk pengunjung tanpa akun, beserta foto dan GPS presisi. Komunitas dan peta menampilkan Menunggu, Diproses, Selesai; Ditolak hanya tersedia pada riwayat pemilik/admin. Arsip privat lama tidak dipublikasikan massal. Navigasi pengguna web memakai header dan navigasi bawah pada HP, tanpa sidebar; panel admin tetap terpisah. Ikon Filter membuka pilihan lokasi, kategori, dan status. Pilih Terapkan untuk mengubah hasil; Tutup membatalkan perubahan, Reset menyiapkan semua pilihan bawaan. Panduan memakai ilustrasi untuk12material pada web/mobile. Kartu komunitas tidak menampilkan badge status; riwayat/detail laporan tetap menampilkan status. Heading h1–h5 web serta judul/subjudul mobile memakai Caveat Bold sesuai referensi. Paragraf, label, tombol, dan teks kecil memakai Manrope.

## Enam hasil akhir

| Artefak | Lokasi |
| --- | --- |
| Dokumentasi API + OpenAPI | [API](docs/API.md), [openapi.json](docs/openapi.json), Swagger `/docs`, ReDoc `/redoc` |
| Schema, ERD, migrasi | [Database](docs/DATABASE.md), `backend-ml/migrations/versions/` |
| Source dan model terlatih | `web/`, `mobile/`, `backend-ml/`, [metadata](backend-ml/ml/models/metadata.json), `backend-ml/ml/models/wastewise-v1.pth` |
| Dataset dan sumber | `garbage_classification/`, [audit](backend-ml/dataset/audit.json), [dataset](docs/DATASET.md) |
| Hasil evaluasi | [Evaluasi](docs/EVALUATION.md), `backend-ml/outputs/evaluation/` |
| Instalasi dan penggunaan | README ini, [setup](docs/SETUP.md), [pengujian](docs/TESTING.md) |

Model lokal: akurasi test **95,86%**, macro F1 **94,10%**, F1 kelas terendah **85,14%** pada **2.318 gambar test**. Kedua quality gate lulus. Ini pengukuran pada dataset lokal yang dikelompokkan menurut kemiripan, bukan jaminan akurasi kamera lapangan.

## Mulai lokal

```bash
git clone https://github.com/rakannaufal/wastewise.git
cd wastewise
```

Prasyarat: Node 24.3+, Python 3.12, PostgreSQL 17 (`initdb`, `pg_ctl`, `psql` dalam PATH). Pada macOS, contoh instalasi PostgreSQL: `brew install postgresql@17`; tambahkan direktori `bin` paket ke PATH. Docker tidak diperlukan untuk prosedur lokal ini.

```bash
python3.12 -m venv backend-ml/.venv
backend-ml/.venv/bin/python -m pip install --upgrade pip
backend-ml/.venv/bin/python -m pip install -r backend-ml/requirements-dev.lock
npm ci --prefix web
npm ci --prefix mobile
bash scripts/dev-db.sh
```

Jalankan tiga terminal dari root proyek:

```bash
(cd backend-ml && .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --no-access-log)
npm run dev:web
(cd backend-ml && .venv/bin/python -m app.cleanup)
```

Buka `http://127.0.0.1:5173`. Mode awal dari bootstrap adalah Auth lokal. Daftar melalui formulir; tidak ada password demo atau admin bawaan. Untuk Supabase email Auth, ikuti bagian berikut. Admin pada mode lokal dibuat secara eksplisit:

```bash
cd backend-ml
.venv/bin/python -m app.manage create-admin --email admin@contoh.com --name 'WasteWise Admin'
```

Password diminta tanpa ditampilkan. Gunakan minimal 8 karakter dengan huruf besar/kecil, angka, simbol; maksimal 72 byte UTF-8.

## Login email melalui Supabase

Edit `backend-ml/.env` lokal (jangan commit), pertahankan `DATABASE_URL` dan `JWT_SECRET` hasil bootstrap:

```dotenv
AUTH_PROVIDER=supabase
SUPABASE_URL=https://brdhxmtdvjhuvpxqsjvi.supabase.co
SUPABASE_PUBLISHABLE_KEY=<publishable key proyek>
PUBLIC_WEB_URL=http://127.0.0.1:5173
```

Publishable key boleh dikirim ke client. `SUPABASE_SERVICE_KEY`, password database, dan JWT secret hanya untuk server. Web/mobile membaca konfigurasi publik dari `/api/v1/auth/config`; tidak perlu menggandakan key dalam variabel Vite/Expo.

1. Pada Supabase **Authentication → URL Configuration**, tetapkan Site URL ke alamat web yang digunakan. Izinkan redirect root dan `/auth/reset-password` untuk origin yang sama. Tambahkan origin production yang tepat saat deploy.
2. Restart API; buka web. Pilih **Daftar sekarang**, isi nama/email/kata sandi. Jika konfirmasi diwajibkan, akun belum dianggap login sampai email dikonfirmasi.
3. Buka tautan konfirmasi, kembali ke aplikasi, masuk. Native juga dapat masuk setelah konfirmasi email. **Kirim ulang konfirmasi** tersedia jika email belum diterima.
4. **Lupa kata sandi?** mengirim tautan pemulihan. Buka di browser/perangkat yang meminta pemulihan karena PKCE memerlukan verifier lokal. Native membuka web utama untuk alur ini. Periksa spam dan limit pengiriman; production perlu konfigurasi SMTP yang sesuai.
5. Backend memverifikasi token langsung ke Supabase, mensyaratkan email terkonfirmasi, lalu membuat profil aplikasi. Role awal selalu `user`; role dari metadata Supabase diabaikan. Supabase tidak menyimpan password dalam database aplikasi.

Akun Supabase yang sudah dikonfirmasi harus login sekali ke WasteWise sebelum dipromosikan:

```bash
cd backend-ml
.venv/bin/python -m app.manage promote-admin --email admin@contoh.com
```

Perintah ini harus dijalankan pengelola server, bukan pengguna biasa. Penghapusan pengguna melalui WasteWise memblokir identitas dan menjadwalkan penghapusan foto; penghapusan identitas pada layanan Supabase Auth dilakukan pengelola Supabase terpisah. Akun lokal dengan email sama tidak ditautkan otomatis; migrasi akun lama perlu peninjauan kepemilikan.

Auth, database, dan Storage adalah tiga konfigurasi terpisah. Publishable key cukup untuk Auth; koneksi PostgreSQL serta key server diperlukan untuk data/foto. Gunakan [SETUP](docs/SETUP.md) untuk role minimum, migrasi, bucket privat, dan verifikasi remote.

## Penggunaan

1. Buka landing page, pilih **Masuk**. **Beranda** memuat posting komunitas; **Ringkasan** memuat statistik milik sendiri atau seluruh laporan untuk pengelola. **Peta** memuat lokasi posting yang dibagikan.
2. Di HP pilih **Buat laporan**, lalu **Ambil foto sampah** atau **Pilih gambar dari galeri**. ML berjalan otomatis setelah foto dinormalisasi; kategori tidak dipilih pengguna. Web menyediakan alur galeri yang sama.
3. Kamera memasangkan GPS dengan waktu pemotretan. Galeri memakai EXIF GPS jika tersedia. Jika tidak ada, tekan konfirmasi bahwa foto diambil di lokasi saat ini, lalu aplikasi mengambil GPS otomatis. Jika lokasi berbeda, ambil foto ulang di tempat tersebut. Izin ditolak atau akurasi belum cukup: klasifikasi tetap tersedia, pengiriman menunggu lokasi; tidak ada input koordinat manual.
4. Deskripsi opsional (maksimal 5.000 karakter), tekan **Kirim dan publikasikan** setelah membaca pemberitahuan bahwa foto dan GPS presisi terlihat publik. Normalnya foto di-upload dan dianalisis sekali; finalisasi menggunakan draft. Draft sementara bertahan hingga 24 jam, retry pengiriman tidak menggandakan laporan. Tombol **Hapus draft foto** membatalkan draft. ML gagal: draft dipertahankan untuk retry, laporan belum dibuat.
5. Laporan milik pengguna dapat diedit saat Pending, termasuk mengganti foto melalui analisis baru. Foto, kategori AI asli, sumber/waktu/akurasi lokasi dan riwayat tersedia di detail. Confidence bukan bukti ketepatan; prediksi kurang meyakinkan masuk review admin.
6. Admin mendapat dashboard periode 30 hari, filter URL, tren, distribusi, antrean seluruh periode dan median waktu penanganan. Klik angka membuka daftar terkait. Admin mereview kategori dengan alasan tanpa menghapus prediksi AI asli.
7. Workflow status: Pending → In Progress/Rejected; In Progress → Completed/Rejected; Completed/Rejected → Pending. Penolakan atau pembukaan ulang memerlukan alasan. Perubahan bersamaan dengan revisi lama ditolak; muat ulang detail. Delete menjadwalkan pembersihan foto/thumbnail oleh worker.

Supabase Auth menyimpan sesi web di browser dan native di SecureStore; SDK memperbarui token otomatis. Keluar setelah memakai perangkat bersama. Mode lokal untuk pengujian tetap memakai JWT 60 menit tanpa refresh.

## Mobile

Salin `mobile/.env.example` ke `mobile/.env`, isi `EXPO_PUBLIC_API_URL` dengan IP LAN komputer, bukan localhost untuk ponsel fisik. Jalankan API dengan `--host 0.0.0.0` hanya pada jaringan pengembangan tepercaya; sesuaikan `PUBLIC_API_URL` agar tautan foto dapat dijangkau ponsel. Untuk web Expo, tambahkan origin yang digunakan ke `CORS_ORIGINS`.

Pada macOS dengan Wi-Fi di interface en0, periksa IP memakai `ipconfig getifaddr en0`. Ganti nilai contoh pada `mobile/.env` dengan IP aktual; jangan menyalin teks `IP_KOMPUTER` secara literal:

```dotenv
EXPO_PUBLIC_API_URL=http://IP_KOMPUTER:8000
```

Hentikan API lama sebelum menjalankan ulang pada port yang sama. Dari root proyek, jalankan API untuk jaringan lokal, kemudian Expo di terminal terpisah:

```bash
(cd backend-ml && .venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --no-access-log)
npm --prefix mobile start -- --port 8082 --lan
```

HP dan komputer harus berada pada Wi-Fi yang saling dapat mengakses. Buka `http://IP_KOMPUTER:8000/health/ready` di Safari HP untuk menguji koneksi sebelum login. Setelah mengubah `.env`, muat ulang aplikasi; restart Expo bila bundle masih memakai alamat lama. Jika IP komputer berubah, perbarui `.env`. Pada iPhone, izin Local Network untuk Expo Go harus diaktifkan. Pesan `Tidak terhubung. Periksa jaringan dan alamat server.` menunjukkan kegagalan akses API, bukan bukti password salah.

```bash
npm run dev:mobile
```

Lima tab: **Beranda, Peta, Foto, Laporan, Profil**. Filter lokasi/kategori/status dibuka melalui ikon pengaturan; tutup panel untuk membatalkan, atau tekan Terapkan. Ringkasan pribadi, klasifikasi terpisah, serta panduan tersedia melalui Profil. Riwayat menyediakan pencarian, filter status, dan pagination. Kamera/galeri, SecureStore, lokasi dan izin membutuhkan pengujian perangkat nyata. Bundel iOS/Android/web telah diekspor; pemasangan perangkat dan rilis toko belum dilakukan.

## Data, model, dan evaluasi ulang

Folder asli `garbage_classification/<category>/*.jpg` dipertahankan. Nama 12 folder adalah ID kategori resmi. Checkpoint terlatih disertakan dalam Git beserta metadata/checksum. Dataset tidak disertakan dalam Git; tersedia di workspace dan arsip lokal hasil packaging. Untuk instalasi dari GitHub, unduh dari [Kaggle](https://www.kaggle.com/datasets/mostafaabla/garbage-classification), lalu letakkan 12 folder kategori langsung di `garbage_classification/`. Dataset hanya diperlukan untuk audit/training/evaluasi, bukan untuk menjalankan inference dengan checkpoint yang disertakan. Sumber pengguna dikonfirmasi sebagai Kaggle Mostafa Abla. Baca [atribusi dan batas lisensi](THIRD_PARTY_NOTICES.md) sebelum publikasi gambar.

```bash
cd backend-ml
.venv/bin/python -m ml.prepare
.venv/bin/python -m ml.train --epochs 30 --finetune 0 --batch-size 16
.venv/bin/python -m ml.evaluate
```

Jangan melatih ulang untuk mengoptimalkan test yang sudah dibuka. Checkpoint dipilih dari validation macro F1; test hanya untuk evaluasi final. Model yang hilang mengakibatkan `/predict` 503. Foto disimpan sebagai draft untuk retry; finalisasi laporan memerlukan prediksi dan lokasi otomatis yang valid. Kebijakan review dikalibrasi dari validation, bukan test: `python -m ml.calibrate_review`. Baca [aturan review](docs/EVALUATION.md).

## Verifikasi dan paket

```bash
npm run check
npm run build
npm --prefix mobile run export
(cd backend-ml && .venv/bin/python scripts/test_local.py -q)
(cd backend-ml && .venv/bin/ruff check app ml tests scripts migrations && .venv/bin/mypy app)
(cd backend-ml && .venv/bin/python scripts/test_browser.py)
node --experimental-strip-types --test shared/photo-location.test.ts
node --test mobile/scripts/photo-upload.test.mjs
python3 scripts/package_release.py
```

Runner `scripts/test_browser.py` memakai database lokal `wastewise_browser`, API8001, Vite5180 dan Expo web8083 secara terisolasi. Google Chrome dan PostgreSQL lokal diperlukan; runtime Node/npm harus berada di PATH. Runner mengekspor Expo ke `.local/mobile-browser`, memulai layanan sementara dan menghentikannya setelah tes; sesi pengembangan pengguna tidak dipakai. Geolocation browser ditiru agar deterministik, bukan pembuktian GPS hardware. Tes kontrak Auth terpisah: `npm --prefix web run e2e:auth`.

Smoke Supabase development dengan identitas QA sementara: `(cd backend-ml && .venv/bin/python -m scripts.supabase_smoke --run --browser)`. Memerlukan API8000, web5173, Expo web8081, server key privat, koneksi DB, dan izin membuat/menghapus identitas QA. Jangan jalankan terhadap produksi. Hanya UUID QA yang dibersihkan. Konfirmasi email QA berasal dari admin; email delivery tidak diuji.

`release/manifest.json` mencatat snapshot paket, bukan jaminan selalu sesuai working tree. Jalankan packaging ulang setelah verifikasi perubahan terbaru. Dataset dan ZIP diabaikan Git; checkpoint resmi disertakan.

## Batas verifikasi

Implementasi dan bukti terbaru tercatat di [PROGRESS](docs/PROGRESS.md). Supabase Auth, PostgreSQL dan Storage privat sudah diuji dengan akun QA sementara, termasuk login browser nyata, sesi reload, upload/signed URL/delete. Tes pengiriman email masuk belum dilakukan; identitas QA dibuat admin-confirmed. Belum ada deployment publik, build terpasang pada perangkat, ataupun pengujian kamera lapangan. Rekonsiliasi orphan tersedia melalui `python -m app.reconcile` (audit default); panduan enqueue/cleanup dan gate rilis berada di [SETUP](docs/SETUP.md).

`SPEC.md` adalah blueprint asli dan dipertahankan. Keputusan WasteWise/12 kategori terbaru berada di [DECISIONS](docs/DECISIONS.md). [Prompt lanjutan](PROMPT_LANJUTAN.md) menyasar pekerjaan verifikasi dan deployment berikutnya.

### Respons kategori dan hapus draft

Setelah mengambil/memilih foto, kategori muncul otomatis; tidak perlu menekan Kirim laporan. Model dan unggah foto berjalan paralel. Saat **Hapus draft foto** ditekan, pratinjau disembunyikan selama server memproses; jika gagal, draft tampil kembali untuk dicoba ulang. Worker cleanup harus aktif untuk menghapus objek privat dari Storage. Pengukuran dan batas verifikasi: [docs/DRAFT_PERFORMANCE.md](docs/DRAFT_PERFORMANCE.md). Reload Expo Go setelah pembaruan aplikasi.


## Feed, filter wilayah, dan peta

Laporan baru otomatis masuk antrean publikasi setelah **Kirim dan publikasikan**. Foto turunan, deskripsi opsional, serta **GPS presisi** terlihat publik, termasuk tanpa akun. Login tetap diperlukan untuk membuat laporan, suka, komentar, dan pengelolaan. Menunggu, Diproses, dan Selesai tampil; Ditolak dikecualikan dari feed, detail publik, dan peta. Pemilik dapat menarik posting; admin dapat menyembunyikan konten. Penggantian foto pada posting aktif masuk antrean turunan ulang, sementara hidden/withdrawn tetap terlindungi. Caption publik dan deskripsi laporan dapat diedit terpisah. Client lama tanpa `publication_policy:"public-gps-v2"` ditolak422, tidak diam-diam menerbitkan laporan.

Untuk instalasi baru/upgrade, jalankan Alembic menggunakan kredensial migrator sesuai SETUP; runtime cukup DML. Kemudian dari root:

```bash
backend-ml/.venv/bin/python backend-ml/scripts/fetch_regions.py
(cd backend-ml && .venv/bin/python -m app.import_regions)
(cd backend-ml && .venv/bin/python -m app.community_worker)
```

Publisher berjalan bersama worker cleanup yang sudah ada. Referensi wilayah sekitar368MB; sumber MIT, versi/checksum,158 batas wilayah yang belum tersedia dijelaskan pada [REGIONS](docs/REGIONS.md). Lihat [implementasi komunitas](docs/COMMUNITY_IMPLEMENTATION.md), [prompt aset](docs/plans/ASSET_PROMPTS.md), dan [matriks layar](docs/plans/SCREEN_MATRIX.md).

Native: lima tab **Beranda, Peta, Foto, Laporan, Profil**. Kamera tengah berukuran68px; onboarding/panduan ada di Profil. Peta native memerlukan build/perangkat yang mendukung react-native-maps; Google Maps key untuk Android standalone harus dikonfigurasi sebelum distribusi. Expo web memakai daftar lokasi; peta web lengkap tersedia di React website. Ubin OpenStreetMap development memerlukan internet; tetapkan penyedia ubin production sesuai kapasitas dan kebijakan penggunaan.

Logo mark/wordmark/icon sudah tersedia. Ilustrasi raster khusus masih menunggu output aset yang disetujui; prompt seluruh halaman sudah disediakan. Tidak mengklaim ilustrasi tersebut sudah dibuat. Model, split dataset dan evaluasi95,86% tidak diubah atau dilatih ulang oleh fitur komunitas.

### Halaman publik dan tampilan

`/` menampilkan maksimal tiga kartu terbaru dan tombol **Lihat semua laporan** ke `/app`. `/app`, `/map`, dan `/community/:id` dapat dibaca tanpa login. `/about`, `/faq`, `/privacy` menjelaskan aplikasi, batas AI, dan kebijakan publikasi. Navbar serta footer dipakai bersama. Pilihan lebih dari tiga memakai dropdown; wilayah web dapat dicari, mobile memakai panel pemilih tertutup. Model tetap menentukan kategori otomatis.

Grafis SVG lokal: `web/public/illustrations/report-notes.svg`, `sort-materials.svg`. Font heading Caveat disertai OFL; font web subset WOFF62KB, native TTF lokal. Kredit footer **© 2026 Khay Brownies · Website by rakandev** mengikuti teks eksplisit pengguna, sementara identitas produk tetap WasteWise.
