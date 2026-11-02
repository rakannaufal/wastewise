# Instalasi, konfigurasi, deployment

## Local development yang diuji

Node24.22.1, Python3.12.8, PostgreSQL17.11, macOS arm64 RAM8GB. `.node-version` memilih major24. Semua perintah dijalankan dari root kecuali disebutkan. Gunakan README untuk urutan venv, pip, npm ci, dev-db, API, web dan worker.

`bash scripts/dev-db.sh` membuat cluster terisolasi `.local/postgres`, socket `.local/socket`, port54339, DB wastewise, role runtime wastewise, kredensial acak `.env` berizin0600. Tidak memakai cluster Homebrew yang sudah ada. Migrasi dijalankan sebagai owner melalui socket lokal, lalu grant DML runtime. Socket trust hanya untuk development lokal; jangan gunakan pola ini di server bersama.

Hentikan cluster lokal secara tertib bila sudah tidak digunakan:

```bash
pg_ctl -D "$PWD/.local/postgres" stop
```

Jangan menghapus folder cluster untuk mereset masalah aplikasi. Backup sebelum perubahan data. Tidak ada seed laporan fiktif; register user normal dari aplikasi, bootstrap admin via getpass.

## Environment backend

| Variabel | Fungsi |
| --- | --- |
| DATABASE_URL | URL SQLAlchemy PostgreSQL; wajib, rahasia |
| JWT_SECRET | secret acak minimal32 karakter; wajib |
| ENVIRONMENT | development/test/production |
| AUTH_PROVIDER | local untuk tes mandiri; supabase untuk login email provider |
| PUBLIC_WEB_URL | web utama, tujuan konfirmasi/reset dari mobile |
| SUPABASE_PUBLISHABLE_KEY | key publik untuk SDK dan verifikasi token server |
| PUBLIC_API_URL | origin yang dapat dijangkau client untuk signed media lokal |
| CORS_ORIGINS | origin web dipisahkan koma, tanpa wildcard |
| STORAGE_BACKEND | local atau supabase |
| STORAGE_PATH | path disk privat untuk development/test |
| STORAGE_BUCKET | default waste-images, bucket privat |
| SUPABASE_URL | HTTPS origin project Supabase |
| SUPABASE_SERVICE_KEY | service key backend saja |
| MODEL_PATH | checkpoint WasteWise tervalidasi |
| RATE_LIMIT_ENABLED | true secara default; false hanya pada test terisolasi |

Pydantic menolak secret JWT pendek dan local storage pada production. `.env.example` tidak berisi secret nyata. VITE_API_URL dan EXPO_PUBLIC_API_URL hanya origin publik, jangan memasukkan service key/JWT secret ke variabel client.

## Mobile dan platform

`npm --prefix mobile run export` menghasilkan JavaScript/assets untuk iOS/Android/web, bukan APK/IPA terpasang. Untuk perangkat: Expo Go yang sesuai SDK atau development build, IP LAN backend, izin kamera/foto/lokasi. Jika izin lokasi ditolak, isi latitude/longitude manual. Gallery menyediakan alternatif kamera. Android/iOS entitlement/signing, bundle ID final dan privacy disclosure harus diperiksa sebelum toko aplikasi.

Sesi Supabase native disimpan SecureStore dalam chunk; Expo web memakai browser storage SDK. Mode lokal native tetap SecureStore, web memori. SDK memperbarui sesi; perubahan status foreground native memulai/menghentikan refresh. Tidak ada antrean submit offline; kegagalan ditampilkan untuk dicoba ulang tanpa sukses palsu.

## Gate deployment publik yang belum dijalankan

1. Buat PostgreSQL/Supabase project terpisah staging dan production. Konfigurasi pooler/SSL sesuai provider; secret owner dan runtime dipisahkan. Jalankan migrasi dan grants dengan secret manager.
2. Buat bucket waste-images **private**, pastikan app_private tidak diekspos Data API. Set STORAGE_BACKEND=supabase dan ENVIRONMENT=production. Uji upload, signed URL, expiry, forbidden owner dan worker delete ke bucket staging.
3. Deploy API satu worker + cleanup worker berkelanjutan dengan checkpoint beserta metadata. Gunakan HTTPS, reverse proxy/body limit6MiB, timeout dan konfigurasi forwarded IP yang tepercaya. Jangan aktifkan access log yang mencetak signed media token.
4. Web: build dengan VITE_API_URL HTTPS lalu deploy `web/` ke Vercel memakai vercel.json. Update CORS origin yang benar. Mobile: EXPO_PUBLIC_API_URL HTTPS, development build dan tes perangkat.
5. Periksa readiness, signup/login, report create/list/filter/detail/delete, perubahan status, sesi kedaluwarsa, recovery worker dan backup/restore. Lakukan tinjauan hak distribusi dataset/foto sebelum mempublikasikan contoh gambar.
6. Tambahkan monitoring error tanpa foto/token, rekonsiliasi orphan, shared rate limiter jika multi-worker, kebijakan retensi dan prosedur penghapusan data. Simpan rollback checkpoint/database migration plan sebelum rilis.

CI GitHub berjalan otomatis pada repository pengguna; hasil terakhir lihat tab Actions. Tidak ada URL produksi. Hosting belum dipilih/dibeli; biaya lokal nol untuk layanan cloud, biaya hosting bergantung paket provider dan trafik aktual. Tarif belum diverifikasi, sehingga tidak dicantumkan sebagai harga pasti.

## Supabase server

Gunakan session pooler port5432 untuk backend SQLAlchemy pada jaringan IPv4; format username `<runtime-role>.<project-ref>`. Gunakan `postgresql+psycopg://.../postgres?sslmode=require`. Gunakan role runtime tanpa superuser, create DB/role atau ownership schema: hanya CONNECT, USAGE app_private, dan SELECT/INSERT/UPDATE/DELETE tabel aplikasi. Role owner terpisah menjalankan Alembic. Jangan expose app_private melalui Data API; anon/authenticated tidak memerlukan grant tabel aplikasi.

Bucket waste-images harus private; backend service key tidak boleh disalin ke web/mobile. URL/key Auth tidak otomatis memindahkan database atau foto lokal ke cloud. Jangan gunakan password lokal ke Supabase. Simpan rahasia melalui .env berizin0600 atau secret manager hosting, jangan melalui chat/Git.

Auth: aktifkan email, pertahankan konfirmasi email, isi Site URL dan daftar redirect root/reset. Gunakan origin yang sama selama PKCE recovery. Uji signup dan email delivery dengan alamat yang dikuasai penguji; tes mock tidak menggantikan bukti ini. Signup mobile boleh dikonfirmasi di web lalu login manual di mobile.

Koneksi remote pada workspace ini sudah diverifikasi menggunakan role wastewise_runtime melalui session pooler dan `sslmode=verify-full`, dengan CA Supabase resmi. Untuk mesin/hosting baru, unduh sertifikat dari Database → Settings → Download certificate, gabungkan dengan CA publik bila perlu, lalu gunakan `sslrootcert` yang menunjuk path deployment tersebut. Jangan menonaktifkan verifikasi TLS untuk mengatasi CA yang belum terpasang. Rahasia dan path absolut workspace tidak disertakan di Git.

Bucket remote dan migrasi sudah dibuat; tidak perlu membuat ulang/reset proyek pengguna. Gunakan migration owner untuk perubahan berikutnya, pertahankan runtime tanpa ownership. Foto lama lokal tidak otomatis dimigrasikan. Signed URL15menit dapat tersimpan dalam cache sampai expiry meskipun object sudah dihapus.

## Rekonsiliasi orphan

```bash
cd backend-ml
.venv/bin/python -m app.reconcile
.venv/bin/python -m app.reconcile --enqueue --grace-hours 24
.venv/bin/python -m app.cleanup --once
```

Perintah pertama hanya membaca inventory dan DB. Tinjau jumlah kandidat sebelum enqueue; perintah kedua membuat job, worker melakukan penghapusan. Hanya key milik aplikasi UUID/UUID.jpg, minimal24jam, tidak ada referensi laporan, serta bucket konfigurasi yang diproses. Inventory yang terputus tidak membuat job parsial. Grace menghindari upload baru/in-flight; key tidak pernah digunakan ulang API. Worker juga memeriksa referensi sebelum delete dan mencatat ReferencedObjectPreserved bila masih dipakai. Gunakan staging sebelum menjalankan enqueue pada produksi. Penyimpanan baru meminta cache-control0; URL yang pernah dicache tetap dapat bertahan sampai expiry.
