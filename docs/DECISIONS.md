# Keputusan implementasi

## D-01: Nama dan kategori (2026-11-02)

Instruksi pengguna mengganti branding menjadi WasteWise serta mewajibkan folder lokal garbage_classification dengan 12 kategori. Ini menggantikan RealWaste/tiga kategori pada blueprint awal. `shared/categories.json` menjadi metadata tampilan; enum API/DB dan urutan tensor memakai ID folder persis. SPEC asli dipertahankan sebagai sejarah.

## D-02: Stack dipertahankan

React/Vite/TypeScript/Tailwind untuk web, Expo/React Native/TypeScript untuk mobile, FastAPI/SQLAlchemy/Alembic/PostgreSQL untuk backend. Inferensi dan pipeline memakai PyTorch/torchvision MobileNetV2. Satu backend menyederhanakan transaksi dan izin dibanding layanan terpisah.

## D-03: Development lokal, production privat

Karena kredensial Supabase belum tersedia, verifikasi memakai PostgreSQL 17 terisolasi port 54339 dan disk privat lokal. Adapter Supabase menyertakan timeout, upload, signed URL, delete dan pemeriksaan bucket privat. Konfigurasi production menolak storage lokal. Ini tidak membuktikan konektivitas atau kebijakan akun Supabase remote.

## D-04: Transfer learning sesuai perangkat

RAM perangkat 8 GB membuat fine tuning seluruh backbone dengan batch 64 tertahan. Proses dihentikan, cache fitur dipertahankan; model akhir melatih classifier linear dengan dropout 0,25 di atas fitur MobileNetV2 ImageNet. Satu view deterministik dan satu view augmentasi train dipakai. Pemilihan checkpoint hanya berdasarkan validation macro F1. Tidak ada tuning setelah hasil test dilihat.

## D-05: Split dan sumber

Sumber dikonfirmasi pengguna: Kaggle mostafaabla/garbage-classification. Audit membaca 15.515 file lokal; jumlah itu tidak diasumsikan identik dengan versi publik lain. SHA256 exact duplicates dan pHash Hamming <=4 dikelompokkan transitif sebelum split 70/15/15 seed42. Kelompok konflik-label dikeluarkan. Metode ini mengurangi kebocoran, tetapi tidak membuktikan seluruh objek atau sesi pengambilan foto independen.

## D-06: Otorisasi dan lifecycle

JWT 60 menit; role dibaca ulang dari database. Register menolak role. Filter/statistik dibatasi server. Minimal satu admin dilindungi advisory transaction lock. Delete memakai outbox cleanup persisten. Mode lokal tidak memiliki refresh/recovery endpoint; bootstrap admin lokal memakai getpass. D-10 menggantikan pengaturan sesi untuk Supabase.

## D-07: Tampilan

Dashboard operasional tema terang, forest green, Plus Jakarta Sans, sidebar sage, satu tindakan klasifikasi dan panduan material. Angka berasal dari API. Gambar contoh berasal dari dataset beratribusi, bukan gambar report palsu. Tidak ada klaim dampak lingkungan kuantitatif.

## D-08: Runtime dan dependensi

Node24, Python3.12, PostgreSQL17. Lockfiles npm terpisah untuk web/mobile, Python runtime requirements.txt dan environment development requirements-dev.lock. Override minimatch/glob memperbaiki temuan audit transitif; build dan bundel diperiksa ulang. CI disediakan, belum dijalankan di GitHub.

## D-09: Grafik dan navigasi mobile

Grafik kategori dan status memakai batang CSS dengan pasangan label/jumlah semantik, sehingga seluruh 12 kategori tetap terbaca pada ponsel dan pembaca layar. Data langsung dari summary API; grafik disembunyikan saat belum ada laporan. Recharts pada blueprint tidak diperlukan untuk visualisasi sederhana ini. Mobile menyediakan lima tab, termasuk Profil, serta filter status pada riwayat. Foto draft diteruskan melalui memori, bukan parameter URL.

## D-10: Supabase email Auth

SDK resmi menangani signup, konfirmasi, login, persistensi, refresh, PKCE dan pemulihan password web. Backend menghubungi `/auth/v1/user` dengan publishable key untuk setiap request terautentikasi, menolak email belum terkonfirmasi/anonymous dan gagal tertutup saat provider bermasalah. Role tetap dibaca dari PostgreSQL, bukan user_metadata atau claim yang diurai client. UUID identitas menjadi ID profil tanpa password_hash. Email collision dengan akun lokal tidak ditautkan otomatis. Tombstone blocked_identities mencegah profil terhapus dibuat kembali dari token provider yang masih aktif. Penghapusan Auth account tetap operasi admin Supabase terpisah.

Mode lokal dipertahankan untuk tes terisolasi; tidak ada fallback JWT lokal ketika Supabase dipilih. Web menyimpan sesi melalui SDK, native melalui SecureStore yang dipecah per chunk. Pemulihan native memakai web utama, sehingga tidak memerlukan universal link yang belum dikonfigurasi. Kegagalan revoke saat logout tetap menghapus sesi perangkat menurut kontrak SDK terpasang; token yang sudah diterbitkan tetap memiliki masa berlaku provider.


## D-11: Laporan otomatis melalui draft (2026-11-02)

`POST /reports` kini menerima JSON draft_id/description dan Idempotency-Key. Kedua client berpindah bersamaan; tidak ada client publik yang telah dirilis. Backend menolak kontrak multipart manual, kategori/AI/status/pemilik tambahan. Draft terikat akun, hash foto dan request UUID; normalnya satu upload/inferensi. Model gagal mempertahankan draft, bukan laporan dengan label manual. Finalisasi dan cleanup memakai lock transaksi agar draft tidak dikonsumsi atau dibersihkan bersamaan. Operasi blocking dijalankan di thread kerja ASGI.

## D-12: Asal lokasi dan review

Kamera menyimpan GPS ≤30 detik dari shutter dan akurasi ≤50 m. Galeri membaca EXIF tanpa mengarang waktu/akurasi; bila GPS tidak ada, pengguna menyatakan foto berasal dari tempat saat ini sebelum GPS unggah disimpan. Timestamp perangkat diberi toleransi masa depan 5 detik. Lokasi client/EXIF tetap dapat dipalsukan; ini provenance, bukan bukti kehadiran. Review policy memakai validation dengan checksum checkpoint. Hasil confidence/margin rendah perlu review. Koreksi kategori admin beralasan menyimpan prediksi asli. Test split/model tidak dituning ulang.

## D-13: Operasi admin dan payload ringan

Status/review terpisah, setiap mutasi ber-revision dan event transaksi. Admin dashboard membedakan cohort tanggal dan antrean seluruh periode; backlog hanya mengikuti filter kategori. Median dihitung dari event nyata, bukan updated_at legacy. Thumbnail320px dan batch signed URL mengurangi transfer serta round-trip Storage. Chart SVG/CSS tidak menambah library grafik. Draft native disimpan dalam direktori privat akun selama24jam; logout membersihkannya. Token tetap SecureStore. API publik HTTPS dan pengujian iOS/Android fisik merupakan gate rilis tersisa.
