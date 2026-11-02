# Kontrak REST API

Status: API terimplementasi dan diuji lokal. Schema executable tersedia di `/openapi.json`, Swagger `/docs`, ReDoc `/redoc`, dan ekspor `docs/openapi.json`. Response models dan validasi berasal dari kode FastAPI/Pydantic. Contoh request lengkap tersedia di `docs/requests.http`.

## Dasar dan otorisasi

- Development origin: `http://localhost:8000`; prefix: `/api/v1`.
- Production origin: belum tersedia. Jangan memakai URL contoh SPEC sebagai deployment nyata.
- JSON untuk register/login/update. `multipart/form-data` untuk upload draft dan prediksi; JSON untuk finalisasi/edit laporan.
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
| POST | `/api/v1/report-drafts` | Login | `201`, DraftRead |
| GET | `/api/v1/report-drafts/{id}` | Pemilik | `200`, DraftRead |
| PATCH | `/api/v1/report-drafts/{id}` | Pemilik | `200`, LocationUpdate menjadi DraftRead |
| POST | `/api/v1/report-drafts/{id}/retry` | Pemilik | `200`, DraftRead, tanpa upload baru |
| DELETE | `/api/v1/report-drafts/{id}` | Pemilik | `200`, discard draft belum dikonsumsi |
| GET | `/api/v1/admin/dashboard` | Admin | `200`, cohort, backlog, queues, trend, timing |
| PATCH | `/api/v1/reports/{id}` | Pemilik Pending/admin | `200`, ReportRead |
| PATCH | `/api/v1/reports/{id}/review` | Admin | `200`, ReportRead |
| GET | `/api/v1/reports/{id}/events` | Pemilik/admin | `200`, maksimal100 event terbaru |
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

Readiness tidak membeberkan koneksi, path internal, atau secrets. Respons menyediakan status dependency yang ringkas. Jika DB dan Storage siap tetapi model tidak tersedia, readiness tetap `200` dengan `data.status: "degraded"` dan `data.model: "unavailable"`; draft tetap dapat dibuat, namun finalisasi menunggu prediksi yang berhasil. Jika semuanya siap, status `ready`. Jangan membuat load balancer menghentikan seluruh traffic hanya karena model tidak siap; browsing laporan dan retry draft tetap diperlukan. Liveness tetap `200` selama proses hidup; `/predict` tetap `503` bila model tidak siap.

## Autentikasi

`GET /auth/config` mengembalikan `provider: local|supabase`, `supabase_url`, `supabase_publishable_key`, `web_url`. Hanya key publik yang boleh muncul. Pada mode Supabase, register/login lokal menjawab409; client memakai SDK resmi langsung ke Supabase. Token dikirim sebagai Bearer ke API WasteWise. Backend memverifikasi dengan `/auth/v1/user`; invalid401, belum konfirmasi/anonymous401, gangguan provider503. UUID provider membentuk profil ber-role user pada login pertama. Email collision dengan akun lokal409. Identitas aplikasi yang diblokir403. Metadata role Supabase tidak dipercaya.

Signup, resend, refresh, recovery/update password, dan logout provider merupakan API Supabase, bukan endpoint baru WasteWise. PKCE recovery harus dibuka di browser asal. Role aplikasi selalu berasal dari DB; provisioning tidak menerima role dari pengguna.

Paragraf register/login berikut berlaku untuk `AUTH_PROVIDER=local`.

`POST /auth/register` menerima hanya `email`, `password`, `full_name`. Email dinormalisasi trim/lowercase lalu divalidasi. Nama setelah trim 3..255 karakter. Password minimal 8 karakter, memuat huruf besar/kecil, angka, karakter khusus, dan maksimal 72 byte UTF-8 untuk bcrypt. Field tidak dikenal, termasuk `role`, ditolak `422`. Email duplikat menjawab `409`.

`POST /auth/login` menerima email dan password; salah satu salah tetap menghasilkan pesan generik `401`. `data` TokenRead berisi `access_token`, `token_type: "bearer"`, `expires_in: 3600`, dan `user`. Password/hash tidak pernah dikembalikan. Role diambil dari DB, tidak hanya dari claim JWT.

UserRead berisi `id`, `email`, `full_name`, `role`, `created_at`, `updated_at`. Tidak ada endpoint refresh/logout WasteWise; pada mode Supabase SDK menangani refresh dan logout. Pada mode lokal, logout hanya menghapus token perangkat.

## Draft foto, lokasi dan finalisasi

`POST /report-drafts`: multipart dengan **hanya** `image`, `request_id` UUID, `photo_source=camera|gallery`, opsional `captured_at` ISO8601 berzona. Field berulang/tidak dikenal ditolak422. Kamera wajib captured_at dalam24jam terakhir, toleransi clock masa depan5detik. Gambar JPEG/PNG/WebP maksimum5MiB; request6MiB, decode20juta pixel. Client menormalisasi maksimal1600px/JPEG.82; server melakukan decode, orientasi, membuang EXIF, RGB JPEG.90 maksimal2048px, lalu inferensi pada bytes yang disimpan. Thumbnail JPEG320px disimpan privat.

Request UUID scoped akun. Foto/sumber/waktu yang sama dengan UUID sama mengembalikan draft sebelumnya tanpa menyimpan/inferensi lagi. UUID sama dengan payload foto berbeda409. Draft24jam, hanya pemilik, tidak dibagi dengan admin. DraftRead: `id`, `image_url`, `image_url_expires_at`, `prediction`, `classification_state`, `expires_at`, `latitude`, `longitude`, `photo_source`, `captured_at`, `location_source`, `location_recorded_at`, `location_accuracy_m`. Nilai belum diketahui null / legacy_unknown. Prediction menggunakan kontrak PredictionRead.

Model gagal terkendali: draft201 dengan prediction=null dan analysis_failed. `POST /report-drafts/{id}/retry` membaca foto yang sudah tersimpan, menjalankan model hanya jika hasil belum ada. Tidak meng-upload ulang. Draft habis masa simpan409. `DELETE` memasukkan foto/thumbnail ke cleanup lalu menghapus draft yang belum dikonsumsi; draft dikonsumsi409.

`PATCH /report-drafts/{id}` menerima LocationUpdate JSON:

| Field | Aturan |
| --- | --- |
| latitude, longitude | Bilangan finite, -90..90 / -180..180 |
| location_source | device_capture, photo_exif, device_upload_confirmed |
| location_recorded_at | Timestamp berzona, nullable hanya untuk EXIF; masa depan maks5detik |
| location_accuracy_m | 0..50 meter untuk GPS perangkat; EXIF boleh null |
| confirmed | true wajib untuk device_upload_confirmed |

Kamera hanya menerima device_capture dengan fix berbeda ≤30detik dari captured_at. Galeri tidak dapat mengklaim device_capture. GPS konfirmasi galeri harus berumur ≤30detik saat PATCH. EXIF menyatakan metadata foto, bukan GPS terverifikasi. API tidak membuktikan keberadaan fisik atau keaslian EXIF. Tidak menerima alamat/koordinat yang diketik melalui formulir produk.

`POST /reports`: JSON `{"draft_id":"UUID","description":"10..5000 karakter setelah trim"}` dengan header wajib `Idempotency-Key: UUID`. Kategori, confidence, model, sumber foto/lokasi, pemilik dan status awal ditentukan backend dari draft dan token; tambahan field ditolak422. Draft wajib dimiliki, belum dikonsumsi, belum kedaluwarsa, memiliki prediksi dan lokasi valid. Model belum berhasil503; lokasi kurang422. Status awal Pending. Satu draft hanya dapat dikonsumsi sekali.

Key finalisasi scoped akun dan fingerprint payload; retry sama mengembalikan laporan sama201, key sama dengan isi berbeda409. Lock transaksi melindungi request serentak. Jika laporan hasil sudah dihapus, retry mengembalikan404. Laporan baru tidak memiliki fallback kategori manual. Hasil lemah boleh difinalisasi sebagai needs_review; classification_state terpisah dari status penanganan.

## Laporan, edit dan riwayat

`GET /reports`: page/per_page/search/status/category/user_id ditambah `date_from`, `date_to` (berzona, batas `[from,to)`), `needs_review=true`, `sort=newest|oldest`. Search deskripsi maksimum200karakter. user_id hanya admin403. Filter tidak mengganti ownership; count/pagination memakai predicate sama, halaman di luar hasil berisi array kosong. Urutan created_at,id stabil.

ReportRead: `id`, `user_id`, `user_name`, `category`, `description`, `image_url`, `thumbnail_url`, `image_url_expires_at`, `latitude`, `longitude`, `status`, `ai_predicted_category`, `ai_confidence`, `ai_model_version`, `classification_state`, `revision`, `photo_source`, `captured_at`, `location_source`, `location_recorded_at`, `location_accuracy_m`, `created_at`, `updated_at`. Foto/thumbnail signed900detik; ambil ulang resource untuk memperbarui. List/dashboard menggunakan batch signing. Path Storage tidak dikirim.

`PATCH /reports/{id}`: JSON revision>=1, description10..5000, opsional draft_id pengganti. Pemilik dapat mengedit saat Pending; admin lintas status. Deskripsi saja mempertahankan kategori/AI/lokasi. Foto pengganti wajib melalui draft milik pelaku, analisis/lokasi baru; foto lama masuk cleanup. Revisi lama409; setiap perubahan nyata menambah revision dan event edited. Tidak ada perubahan nyata tidak menambah event.

`PATCH /reports/{id}/review`: admin, revision, category enum12kelas, reason setelah trim5..1000karakter. Kategori final menjadi hasil review, classification_state=reviewed. `ai_predicted_category`, confidence dan model asli tetap. Event category_reviewed menyimpan sebelum/sesudah dan alasan. Foto pengganti adalah hasil model baru dan bisa memerlukan review baru.

`PATCH /reports/{id}/status`: admin, revision, status, reason opsional maks1000. Pending→In Progress/Rejected; In Progress→Completed/Rejected; Completed/Rejected→Pending. Rejected dan reopen wajib alasan minimal5karakter. Transisi lain409, alasan kurang422, revision lama409. Status sama dengan revision terkini bersifat idempoten tanpa event tambahan.

`GET /reports/{id}/events`: pemilik/admin, maksimal100 event terbaru (created_at DESC,id DESC). Field id/kind/actor_name/details/reason/created_at. Jenis created, edited, status_changed, category_reviewed. Event dan mutasi satu transaksi; actor yang terhapus nullable. Data lama tidak direkayasa riwayatnya.

`DELETE /reports/{id}`: pemilik/admin; hapus row serta enqueue foto/thumbnail dalam transaksi. Respons200 berarti cleanup persisten dijadwalkan. Worker melindungi referensi laporan aktif dan draft belum dikonsumsi. Draft kedaluwarsa dibersihkan bertahap; consumed draft yang masih direferensikan laporan aktif dipertahankan untuk provenance; metadata tidak terpakai dibersihkan setelah expiry. Penghapusan akun membersihkan aset report dan draft akun itu.

## Dashboard admin

`GET /admin/dashboard`: date_from/date_to berzona (maks366hari), timezone IANA default Asia/Jakarta, category/status opsional. Default30hari termasuk hari ini. `cohort.total/by_status/by_category/needs_review` memakai created_at dalam `[from,to)` dan filter aktif. `previous_total/change_percent` memakai durasi sebelumnya setara; denominator0 menghasilkan null. `trend` mengisi hari kosong0.

`backlog.active/needs_review`, `queue`, `review_queue` mencakup seluruh tanggal dengan filter kategori saja; tidak tersaring periode/status cohort. Queue maksimal5 tertua per jenis. `median_response_hours` memakai transisi pertama ke In Progress; `median_completion_hours` memakai pertama ke Completed. Hanya laporan dengan event created yang dihitung, tanpa mengestimasi updated_at legacy. `generated_at`, zona/filter efektif turut dikembalikan. Penghapusan row menghilangkan kontribusi laporan dari agregat, bukan buku besar permanen.

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

Rate limit yang diimplementasikan (per proses, satu worker API): login 10/menit/IP, register 5/menit/IP, prediksi/retry 30/menit/akun, upload draft30/menit/akun, finalisasi30/menit/akun. Gunakan state limit yang konsisten pada deployment multi-worker atau batasi deployment menjadi satu worker dan dokumentasikan batasnya. IP forwarding dipercaya hanya dari reverse proxy yang ditetapkan. Batasi pula concurrency inferensi dan ukuran body sebelum seluruh body dibaca.

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
curl --fail-with-body http://localhost:8000/api/v1/report-drafts \
  -H "Authorization: Bearer $TOKEN" -F 'image=@foto.jpg' \
  -F 'request_id=GANTI_UUID_UPLOAD' -F 'photo_source=gallery'
# PATCH sumber GPS draft sesuai kondisi sebenarnya sebelum finalisasi.
curl --fail-with-body http://localhost:8000/api/v1/reports \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: GANTI_UUID_FINALISASI' \
  --data-binary @report.local.json
curl --fail-with-body 'http://localhost:8000/api/v1/reports?category=plastic&status=Pending&page=1&per_page=10' \
  -H "Authorization: Bearer $TOKEN"
```

ID/key bukan urutan kelas. GET categories mengembalikan nama Indonesia, family, description dan action. Seluruh metadata AI server-derived; client yang mengirim ai_confidence, status atau user_id pada create ditolak422. Limit keseluruhan request6MiB, file5MiB, decode20 juta pixel, hasil JPEG RGB sisi maksimal2048.

## Catatan operasional

Worker `python -m app.cleanup` wajib berjalan untuk menuntaskan delete foto. Signed URL berlaku900detik; cache CDN/browser yang sudah menerima foto dapat bertahan sampai expiry dan tidak dijamin tercabut instan setelah delete; tautan berlaku sebagai bearer capability, jangan dibagikan. Access log bawaan Uvicorn dinonaktifkan; log aplikasi memakai template route agar token media tidak tercetak. Respons aplikasi mengirim no-store, nosniff, Referrer-Policy dan request ID.

Model wajib untuk finalisasi laporan baru. Inferensi gagal mempertahankan draft analysis_failed untuk retry; laporan belum dibuat. Readiness503 karena dependency tidak sehat melaporkan status dependency tanpa secret; error request database tak terduga memakai envelope500 generik.
