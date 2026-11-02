# Kontrak REST API

Status: API terimplementasi dan diuji lokal. Schema executable tersedia di `/openapi.json`, Swagger `/docs`, ReDoc `/redoc`, dan ekspor `docs/openapi.json`. Response models dan validasi berasal dari kode FastAPI/Pydantic. Contoh request lengkap tersedia di `docs/requests.http`.

## Dasar dan otorisasi

- Development origin: `http://localhost:8000`; prefix: `/api/v1`.
- Production origin: belum tersedia. Jangan memakai URL contoh SPEC sebagai deployment nyata.
- JSON untuk register/login/update. `multipart/form-data` untuk laporan dan prediksi.
- Header autentikasi: `Authorization: Bearer <access_token>`.
- Tanggal: ISO 8601 UTC. ID: UUID. Confidence/probabilities API: persen `0..100`, bukan pecahan `0..1`.
- Pagination: `page >= 1`, `per_page` default 10, maksimum 100. Urutan stabil `created_at DESC, id DESC`.
- Token tidak sah/kedaluwarsa/akun terhapus: `401`. Role tidak cukup: `403`. Laporan tidak ada atau di luar kepemilikan pengguna: `404`.

Semua respons aplikasi memakai tiga field berikut; contoh hanya menjelaskan format, bukan bukti request yang pernah dijalankan:

```json
{
  "success": true,
  "message": "Reports retrieved successfully",
  "data": {
    "reports": [],
    "pagination": {
      "current_page": 1,
      "per_page": 10,
      "total_items": 0,
      "total_pages": 0
    }
  }
}
```

```json
{
  "success": false,
  "message": "Invalid or expired token",
  "data": null
}
```

Pasang exception handler untuk error validasi, HTTP, dan error tak terduga agar envelope konsisten. Error tak terduga memakai pesan generik. Tambahkan `X-Request-ID` pada respons dan log tanpa token/password/foto. Pengunduhan OpenAPI, halaman docs, dan respons protokol tanpa body seperti CORS preflight bukan envelope JSON aplikasi.

## Enum

| Field | Nilai persis |
| --- | --- |
| `role` | `admin`, `user` |
| `category`, `ai_predicted_category` | `battery`, `biological`, `brown-glass`, `cardboard`, `clothes`, `green-glass`, `metal`, `paper`, `plastic`, `shoes`, `trash`, `white-glass` |
| `status` | `Pending`, `In Progress`, `Completed`, `Rejected` |

Urutan kelas tensor ML tidak ditentukan oleh tabel ini; baca metadata checkpoint.

## Daftar endpoint

| Method | Path | Akses | Hasil sukses |
| --- | --- | --- | --- |
| GET | `/api/v1/auth/config` | Publik | `200`, provider, public URL/key dan web_url |
| POST | `/api/v1/auth/register` | Publik, mode lokal, dibatasi laju | `201`, UserRead |
| POST | `/api/v1/auth/login` | Publik, mode lokal, dibatasi laju | `200`, TokenRead |
| GET | `/api/v1/auth/me` | Login | `200`, UserRead |
| GET | `/api/v1/categories` | Publik | `200`, metadata 12 kategori |
| GET | `/api/v1/reports` | Milik sendiri; admin semua | `200`, reports + pagination |
| POST | `/api/v1/reports` | Login | `201`, ReportRead |
| GET | `/api/v1/reports/{id}` | Pemilik/admin | `200`, ReportRead |
| PATCH | `/api/v1/reports/{id}/status` | Admin | `200`, id + status + updated_at |
| DELETE | `/api/v1/reports/{id}` | Pemilik/admin | `200`, data null |
| GET | `/api/v1/stats/summary` | Milik sendiri; admin semua | `200`, StatsRead |
| GET | `/api/v1/users` | Admin | `200`, users + pagination |
| PATCH | `/api/v1/users/{id}` | Admin | `200`, UserRead |
| DELETE | `/api/v1/users/{id}` | Admin | `200`, data null |
| POST | `/api/v1/predict` | Login, dibatasi laju | `200`, PredictionRead |
| GET | `/health/live` | Publik | `200`, status proses |
| GET | `/health/ready` | Publik | `200` jika DB dan Storage siap; selain itu `503`; status model dilaporkan terpisah |

Readiness tidak membeberkan koneksi, path internal, atau secrets. Respons menyediakan status dependency yang ringkas. Jika DB dan Storage siap tetapi model tidak tersedia, readiness tetap `200` dengan `data.status: "degraded"` dan `data.model: "unavailable"`; laporan manual tetap dilayani. Jika semuanya siap, status `ready`. Jangan membuat load balancer menghentikan seluruh traffic hanya karena fitur prediksi opsional tidak siap. Liveness tetap `200` selama proses hidup; `/predict` tetap `503` bila model tidak siap.

## Autentikasi

`GET /auth/config` mengembalikan `provider: local|supabase`, `supabase_url`, `supabase_publishable_key`, `web_url`. Hanya key publik yang boleh muncul. Pada mode Supabase, register/login lokal menjawab409; client memakai SDK resmi langsung ke Supabase. Token dikirim sebagai Bearer ke API WasteWise. Backend memverifikasi dengan `/auth/v1/user`; invalid401, belum konfirmasi/anonymous401, gangguan provider503. UUID provider membentuk profil ber-role user pada login pertama. Email collision dengan akun lokal409. Identitas aplikasi yang diblokir403. Metadata role Supabase tidak dipercaya.

Signup, resend, refresh, recovery/update password, dan logout provider merupakan API Supabase, bukan endpoint baru WasteWise. PKCE recovery harus dibuka di browser asal. Role aplikasi selalu berasal dari DB; provisioning tidak menerima role dari pengguna.

Paragraf register/login berikut berlaku untuk `AUTH_PROVIDER=local`.

`POST /auth/register` menerima hanya `email`, `password`, `full_name`. Email dinormalisasi trim/lowercase lalu divalidasi. Nama setelah trim 3..255 karakter. Password minimal 8 karakter, memuat huruf besar/kecil, angka, karakter khusus, dan maksimal 72 byte UTF-8 untuk bcrypt. Field tidak dikenal, termasuk `role`, ditolak `422`. Email duplikat menjawab `409`.

`POST /auth/login` menerima email dan password; salah satu salah tetap menghasilkan pesan generik `401`. `data` TokenRead berisi `access_token`, `token_type: "bearer"`, `expires_in: 3600`, dan `user`. Password/hash tidak pernah dikembalikan. Role diambil dari DB, tidak hanya dari claim JWT.

UserRead berisi `id`, `email`, `full_name`, `role`, `created_at`, `updated_at`. Tidak ada endpoint refresh/logout WasteWise; pada mode Supabase SDK menangani refresh dan logout. Pada mode lokal, logout hanya menghapus token perangkat.

## Laporan

`GET /reports` menerima `page`, `per_page`, `search`, `status`, `category`, `user_id`. `search` mencari deskripsi, panjang maksimum 200 karakter. `user_id` hanya boleh digunakan admin; pengguna yang mengirim parameter itu mendapat `403`. Filter tidak mengganti batas kepemilikan. Count dan hasil menggunakan predicate yang sama. Halaman valid di luar hasil menjawab array kosong, tetap mengembalikan total sebenarnya.

`POST /reports` menerima:

| Field | Tipe | Validasi |
| --- | --- | --- |
| `image` | File, wajib | JPEG/PNG/WebP, maksimum 5 MiB = 5,242,880 byte; isi gambar harus dapat didekode |
| `category` | Enum, wajib | Kategori final pilihan pengguna |
| `description` | String, wajib | Trim, 10..5000 karakter |
| `latitude` | Number, wajib | Finite, -90 sampai 90 |
| `longitude` | Number, wajib | Finite, -180 sampai 180 |

Field AI, `status`, dan `user_id` dari client ditolak `422`. Verifikasi MIME dari isi, batasi dimensi hasil decode, tangani decompression bomb, dan hapus metadata EXIF sebelum menyimpan. Standar output upload adalah RGB JPEG dengan sisi terpanjang maksimal 2048 px; tampilkan hasil kompresi di client bila dilakukan di client. Inferensi saat menyimpan laporan memakai gambar yang sudah disanitasi, sama dengan gambar yang disimpan. Perlakukan `NaN` dan infinity sebagai input tidak valid.

Backend menentukan pemilik dari token dan status awal `Pending`. Saat model siap, server menghitung prediksi dan menyimpan kategori prediksi, confidence, versi model. Kategori final tetap pilihan pengguna. Model tidak tersedia atau inferensi gagal secara terkendali: ketiga field AI `null`, laporan manual tetap `201`. Kegagalan Storage/DB tidak boleh dilaporkan sebagai sukses.

ReportRead berisi:

```text
id: UUID
user_id: UUID
user_name: string
category: WasteCategory
description: string
image_url: signed URL
image_url_expires_at: UTC timestamp
latitude: JSON number
longitude: JSON number
status: ReportStatus
ai_predicted_category: WasteCategory | null
ai_confidence: number 0..100 | null
ai_model_version: string | null
created_at: UTC timestamp
updated_at: UTC timestamp
```

`user_email` boleh ditambahkan pada detail untuk admin saja. `image_path` internal tidak perlu dipublikasikan. Client mengambil ulang detail saat signed URL kedaluwarsa; jangan terus mengulang request tanpa batas.

`PATCH /reports/{id}/status` menerima satu field `status`. Admin dapat memilih salah satu dari empat status, termasuk membuka ulang laporan; mengirim status yang sama bersifat idempoten. Tidak ada workflow petugas tersembunyi pada MVP.

`DELETE /reports/{id}` menghapus row dan menambahkan job penghapusan gambar dalam transaksi yang sama. Respons `200` berarti row sudah dihapus dan cleanup sudah dijadwalkan secara persisten. Worker menyelesaikan penghapusan object. Jika upload berhasil tetapi commit pembuatan laporan gagal, lakukan compensating delete; kegagalan kompensasi wajib tercatat dan dapat direkonsiliasi.

## Statistik

StatsRead berisi `total_reports`, `by_category` dengan semua 12 key kategori, `by_status` dengan semua empat key status, dan `recent_reports` maksimal lima item berisi `id`, `category`, `status`, `created_at`. Key tanpa hasil bernilai 0. Scope pengguna sama seperti `/reports`; jangan menghitung semua laporan lalu menyembunyikannya di UI. Untuk kartu berfoto, client mengambil `/reports?per_page=5`.

## Manajemen pengguna

`GET /users`: `page`, `per_page`, `search` pada nama/email, dan `role`. Item berisi UserRead ditambah `report_count`. Jangan melakukan query tambahan untuk setiap pengguna jika agregasi dapat dilakukan sekaligus.

`PATCH /users/{id}`: `full_name` dan/atau `role`, minimal satu field. Email/password tidak diubah endpoint ini. `DELETE /users/{id}` menolak penghapusan diri sendiri. Penurunan role atau penghapusan admin terakhir ditolak `409`. Lindungi invariant admin terakhir dengan penguncian transaksi yang konsisten untuk semua operasi role/admin, termasuk CLI bootstrap, agar dua request serentak tidak meloloskan dua perubahan yang berbahaya.

Penghapusan akun memasukkan seluruh object gambar miliknya ke cleanup queue sebelum menghapus akun dan laporan secara cascade. Token akun terhapus langsung gagal saat pemeriksaan DB berikutnya. Identitas Supabase dicatat dalam blocked_identities agar tidak diprovisikan kembali. Ini tidak menghapus identitas Supabase Auth; pengelola menyelesaikan penghapusan pada provider secara terpisah.

## Prediksi

`POST /predict` menerima satu `image` dengan aturan upload yang sama. Normalisasi/sanitasi gambar memakai fungsi bersama dengan upload laporan. Model hanya melakukan klasifikasi 12 kelas; tidak ada bounding box.

PredictionRead berisi `category`, `confidence`, `probabilities` dengan seluruh 12 key kategori, dan `model_version`. Confidence adalah nilai maksimal probabilities. Nilai probabilities berjumlah sekitar 100 setelah pembulatan, toleransi 0.02 poin persentase. Client tidak boleh membaca urutan key JSON sebagai indeks tensor.

Model/checkpoint/metadata tidak tersedia atau tidak cocok menjawab `503`; inference error terduga juga `503` tanpa prediksi palsu. Kesalahan pemrograman tak terduga tetap `500` dan tercatat. Tidak ada target akurasi yang dapat diverifikasi dari satu respons prediksi.

## Error, pembatasan laju, dan dokumentasi akhir

| Kode | Penggunaan |
| --- | --- |
| 400 | Multipart/payload protokol tidak dapat diparse |
| 401 | Kredensial atau token tidak valid |
| 403 | Role/parameter khusus admin tidak diizinkan |
| 404 | Resource tidak ditemukan atau laporan di luar scope |
| 409 | Email duplikat, self-delete admin, atau invariant admin terakhir |
| 413 | Batas byte upload terlampaui |
| 415 | Format gambar tidak didukung |
| 422 | Field kurang/salah, extra field, UUID/enum/query/koordinat invalid |
| 429 | Rate limit; sertakan `Retry-After` |
| 500 | Error tak terduga dengan pesan generik |
| 503 | Model, DB, atau Storage yang diperlukan sedang tidak tersedia |

Rate limit yang diimplementasikan (per proses, satu worker API): login 10/menit/IP, register 5/menit/IP, prediksi 30/menit/akun. Gunakan state limit yang konsisten pada deployment multi-worker atau batasi deployment menjadi satu worker dan dokumentasikan batasnya. IP forwarding dipercaya hanya dari reverse proxy yang ditetapkan. Batasi pula concurrency inferensi dan ukuran body sebelum seluruh body dibaca.

Artefak akhir: `/docs`, `/redoc`, `/openapi.json`, ekspor `docs/openapi.json`, dan contoh cURL yang telah diuji. OpenAPI mendefinisikan Bearer security scheme, multipart, seluruh respons error/envelope, enum, pagination, serta model readiness. Contoh login, laporan, prediksi, filter, perubahan status tersedia pada requests.http. Bukti request nyata disanitasi di docs/evidence; tidak menyertakan token atau password.

## Contoh cURL

`TOKEN` adalah token sesi hasil login milik pengguna; tidak ada token bawaan. Ganti path foto sesuai perangkat. Body JSON login dapat disimpan di file lokal berizin0600, di luar Git.

```bash
curl --fail-with-body http://localhost:8000/health/ready
curl --fail-with-body http://localhost:8000/api/v1/categories
curl --fail-with-body -X POST http://localhost:8000/api/v1/auth/login \
  -H 'Content-Type: application/json' --data-binary @login.local.json
curl --fail-with-body http://localhost:8000/api/v1/predict \
  -H "Authorization: Bearer $TOKEN" -F 'image=@foto.jpg'
curl --fail-with-body http://localhost:8000/api/v1/reports \
  -H "Authorization: Bearer $TOKEN" -F 'image=@foto.jpg' \
  -F 'category=plastic' -F 'description=Botol plastik di dekat taman' \
  -F 'latitude=-6.2' -F 'longitude=106.8'
curl --fail-with-body 'http://localhost:8000/api/v1/reports?category=plastic&status=Pending&page=1&per_page=10' \
  -H "Authorization: Bearer $TOKEN"
```

ID/key bukan urutan kelas. GET categories mengembalikan nama Indonesia, family, description dan action. Seluruh metadata AI server-derived; client yang mengirim ai_confidence, status atau user_id pada create ditolak422. Limit keseluruhan request6MiB, file5MiB, decode20 juta pixel, hasil JPEG RGB sisi maksimal2048.

## Catatan operasional

Worker `python -m app.cleanup` wajib berjalan untuk menuntaskan delete foto. Signed URL berlaku900detik; cache CDN/browser yang sudah menerima foto dapat bertahan sampai expiry dan tidak dijamin tercabut instan setelah delete; tautan berlaku sebagai bearer capability, jangan dibagikan. Access log bawaan Uvicorn dinonaktifkan; log aplikasi memakai template route agar token media tidak tercetak. Respons aplikasi mengirim no-store, nosniff, Referrer-Policy dan request ID.

Model tetap opsional untuk create report. Ketika inference gagal terkendali, laporan manual menyimpan ketiga field AI null. Readiness503 karena dependency tidak sehat melaporkan status dependency tanpa secret; error request database tak terduga memakai envelope500 generik.
