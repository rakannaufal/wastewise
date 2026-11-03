# WasteWise — matriks layar, state dan acceptance

Status: rencana verifikasi implementasi mendatang. Tidak ada hasil tes baru yang diklaim dari dokumen ini.

Pendamping: [rencana utama](COMMUNITY_REDESIGN_PLAN.md), [prompt aset](ASSET_PROMPTS.md).

## 1. Peta seluruh layar

| Layar | Isi/tindakan utama | Aset | State penting |
| --- | --- | --- | --- |
| Landing web | Hero, cara kerja, preview komunitas/peta, kategori, FAQ, CTA login | B01/B02,L01-L05, guide | Guest/logged-in, menu kecil, API down, gambar gagal |
| Login/register | Email, konfirmasi, validasi, navigasi kembali | Logo,L06 pada layar lebar | Invalid, loading, unconfirmed, rate limit, provider down |
| Recovery/email | Alur Supabase/PKCE yang ada, pesan tujuan email yang aman | Logo,L06 opsional | Expired link, wrong browser, success, retry |
| Onboarding web/mobile | Tiga konsep, lewati, versi tersimpan | OB01-OB03 | First visit, skip, resume, gambar/font gagal |
| Home komunitas | Feed, filter wilayah/kategori/status, draft sendiri, likes/comment | Foto nyata; S01/S02 saat kosong | Loading, pagination, empty, offline, hidden, processing milik sendiri |
| Detail post/komentar | Foto, caption, GPS/provenance, status, like, komentar/moderasi | Foto nyata; ikon UI | Deleted,403/404, komentar panjang, keyboard, retry UUID |
| Peta web/mobile | Region filter, clusters, pins, daftar/popup | Tiles nyata, marker SVG; S02/E08 | Permission denied, zero pins, tile down, unmapped, zoom/bbox race |
| Kamera | Shutter, galeri, izin dan GPS capture | Ikon kamera asli; tanpa ilustrasi menutupi viewfinder | Denied, cancel, accurate/approximate GPS, rotate/background |
| Composer/preview | Kategori otomatis, GPS, deskripsi, audience dan share consent | Foto asli; ikon state | ML failed/retry, GPS unavailable, expiry, upload/delete race |
| Riwayat pribadi | List/filter/status/detail/edit milik sendiri | Foto nyata,S03 kosong | Empty, retry, Pending/edit409, delete |
| Detail laporan | Bukti privat, status/events, edit/review sesuai role | Foto privat | Owner/admin/other, photo replacement, revision conflict |
| Panduan | 12kategori, tindakan setempat, akses kamera | S05 dan12material | Category unknown, image fallback, sumber/atribusi |
| Profil | Nama tampilan, privasi sharing, onboarding ulang, logout | Logo/avatar netral | Logout provider failed, cache clear, name validation |
| Dashboard admin | Statistik riil, antrean, filters, drill-down | Tanpa ilustrasi besar; S04 empty | Cohort kosong, load partial, no access, conflict |
| Manajemen laporan admin | Review/status/history dan link post terkait bila ada | Thumbnail nyata | Needs review, rejection reason, pending mutation |
| Moderasi komunitas | Flags, post/komentar, hide/restore/alasan | Foto nyata,S04 empty | Concurrent action, restored, removed, audit |
| Manajemen user | Search, role, protected last-admin/delete | Avatar netral; tanpa dekorasi besar |403,409, blocked identity, destructive confirm |
| Error bersama | Status, tindakan relevan, request ID bila ada | E01-E08 | Semua4xx/5xx, unknown, assets unavailable |
| Offline/runtime fallback | Pertahankan input, retry, kembali aman | E08/logo kecil | API down, JS boundary, tile failure; bukan status palsu |
| Privasi/ketentuan/bantuan | Aturan publikasi GPS, izin, moderasi dan penggunaan | Logo; tipografi menjadi konten utama | Long content, anchor links, keyboard, mobile zoom |

## 2. Acceptance produk dan privasi

| ID | Bukti yang wajib diperoleh |
| --- | --- |
| P01 | Foto kamera/galeri tetap memicu ML otomatis; tidak ada combobox kategori atau koordinat manual user |
| P02 | Draft tidak muncul di feed/peta akun lain; pintasan draft Home hanya pemilik |
| P03 | Kirim tanpa share membuat laporan privat; share yang ditinjau membuat satu post tanpa mengulang inferensi |
| P04 | AkunB login dapat membaca postA yang dipublikasikan; guest tidak dapat membaca feed/post/komentar/peta |
| P05 | UserB tetap ditolak saat meminta endpoint laporan privatA; DTO post tidak menyertakan email/metadata Auth/private path |
| P06 | Card dan pin memakai GPS/provenance yang sama dengan laporan; tidak memakai IP, centroid atau alamat tebakan |
| P07 | GPS presisi dan audience terlihat pada preview; laporan lama tidak tiba-tiba dibagikan |
| P08 | Cabut publikasi menghilangkan post dari feed, hasilID, komentar dan peta; laporan privat tetap ada |
| P09 | Signed URL baru tidak diterbitkan setelah unshare/hide; keterbatasan URL lama/cache dijelaskan |
| P10 | Delete post/report/account menangani like/comment/media/outbox tanpa menghapus foto laporan aktif yang masih direferensikan |
| P11 | Review/status admin tercermin di post tanpa mengubah AI prediction asli; like tidak mengubah workflow |
| P12 | Ganti foto/lokasi meminta review publikasi baru; perubahan deskripsi privat tidak membocorkan teks ke caption diam-diam |

## 3. Like, komentar dan moderasi

- Like dua kali dengan request paralel tetap satu baris; unlike dua kali berhasil idempoten. Count tidak negatif atau berbeda dari relasi tersimpan.
- Optimistic like gagal mengembalikan state; cepat like–unlike/reload tidak menyebabkan count lompat permanen.
- Komentar kosong/terlalu panjang/HTML berbahaya/input Unicode diuji. Teks tampil sebagai teks, bukan markup.
- Retry komentar memakai UUID sama, tidak menghasilkan duplikat. Jaringan gagal mempertahankan isi input dan memberikan retry.
- User tidak menghapus komentar orang lain. Admin hide/restore mempunyai reason, revision dan audit.
- Post hidden/removed menolak interaksi di setiap endpoint, termasuk ID yang sudah diketahui.
- Flag spam/rate limit ditangani; user terblokir tidak kembali melalui provider token lama.
- Pagination komentar/feed tetap stabil ketika post/komentar baru masuk atau dihapus; filter yang berubah mereset cursor yang sesuai.

## 4. Wilayah Indonesia dan peta

- Sumber sampai desa/kelurahan mempunyai URL, lisensi/atribusi, snapshot version dan checksum; mapping kode tidak mencampur sumber secara diam-diam.
- Parent provinsi→kabupaten/kota→kecamatan→kelurahan/desa valid; nama ganda dan prefix Kab./Kota terbaca.
- Contoh koordinat yang benar dari beberapa provinsi diperiksa terhadap sumber, termasuk kota/kabupaten senama dan boundary polygon. Jangan menjadikan data contoh sebagai koordinat pengguna.
- Akurasi GPS tidak diketahui, titik di batas/laut, wilayah belum dipetakan, resolver down, koordinat luarIndonesia dan format lat/lng terbalik diuji.
- Filter kelurahan tidak mengubah titik laporan; filter induk mengganti pilihan anak dan query key/cursor.
- Kombinasi wilayah/kategori/status feed dan peta menghasilkan himpunan yang sesuai; cluster count tidak mencakup data privat/hidden.
- Bbox invalid, zoom invalid, pergeseran cepat, respons lama datang belakangan dan batas500feature diuji; request lama dibatalkan/diabaikan.
- Klik pin membuka post yang benar, `Lihat di peta` mengembalikan titik yang sama; tombol back mempertahankan filter dan posisi yang masuk akal.
- Izin lokasi ditolak tetap dapat mencari wilayah. Tidak ada pemantauan lokasi latar belakang.
- API/tile down menampilkan fallback daftar/error lokal tanpa menghentikan Home atau membuang draft.
- Atribusi tiles tidak tertutup bottom sheet/nav. Key provider dibatasi domain/bundle sesuai platform, biaya/kuota tercatat sebelum produksi.

## 5. Layout, warna dan navbar

- Manrope tunggal di web/iOS/Android; loader/fallback tidak menghasilkan layar kosong. Data table/caption/GPS tidak memakai tulisan tangan.
- Token berasal dari satu sumber; tidak ada hijau berbeda yang ditambahkan sembarang di komponen. Status tetap memiliki teks dan warna semantik.
- Tombol Foto tengah lebih besar dan mudah dijangkau, label terbaca, hit area penuh, ikon bukan gambar raster. Membuka modal kamera, batal kembali ke tab asal.
- Lima posisi Beranda/Peta/Foto/Laporan/Profil muat pada320px, safe area iPhone dan Android; ikon lain tidak menyusut ke target sentuh kecil.
- Bar tidak menutupi akhir feed, tombol composer, popup peta atau input komentar. Keyboard/font besar/landscape diuji pada perangkat.
- Web320/360/390/768/1024/1440 tidak overflow halaman; tabel admin boleh mempunyai scroll wilayah sendiri dengan header/status tetap dapat diakses.
- Keyboard/fokus/skip link, VoiceOver/TalkBack, zoom200%, reduced motion, kontras4,5:1teks/3:1komponen diuji. Axe bukan satu-satunya bukti aksesibilitas.

## 6. Landing, onboarding dan error

- Guest membuka `/` tanpa diarahkan login. Landing tetap menyajikan informasi inti saat backend mati.
- Komunitas/Peta dari landing mempunyai login returnTo internal yang aman. Reset password/PKCE lama tetap bekerja.
- Hero dan langkah mengikuti screenshot melalui Manrope, whitespace dan ilustrasi hijau asli; tidak ada testimonial/mitra/angka dampak palsu.
- Onboarding hanya first-run/versi yang relevan, bisa dilewati dan dibuka ulang. Tidak memaksa kamera/GPS sebelum tombol terkait dipakai.
- Semua4xx/5xx mempunyai mapping/fallback;400/422/413 tetap dekat form bila memungkinkan. Unknown status tidak menampilkan stack trace.
- Offline/runtime failure tidak dilabeli kode HTTP yang tidak diterima; API tetap JSON dengan status benar.
- Aset gagal dimuat tidak menghapus judul/tindakan; ilustrasi inti dapat tampil tanpa API. Fallback hosting500/502 diuji saat deployment.

## 7. Performa dan gate teknis

Target di rencana utama merupakan sasaran. Simpan angka hasil sebenarnya dan lingkungan ukur, jangan mengganti angka target menjadi klaim lulus.

- Backend: unit/integrasi PostgreSQL untuk Auth/RBAC, visibility, SQL constraints, idempotensi, outbox/media/region, boundary/bbox/cluster dan cleanup/reconcile.
- Web/Expo web: E2E dua akun untuk publish→feed→like→comment→filter kelurahan→map→unshare; admin moderation/status→user projection; sesi kedaluwarsa dan kegagalan jaringan.
- Device: kamera/GPS/JPEG/HEIC, galeri, upload, map provider, permissions, keyboard, reboot draft, low-memory dan20siklus capture pada iPhone serta Android nyata.
- Kinerja: fixture50.000post dengan interaksi; SQL EXPLAIN/query count, payload peta, Lighthouse halaman publik/feed dan profiler mobile. Ukur Maps cold load terpisah dari feed.
- Regression: benchmark draft create/delete, ekspor iOS/Android/web, check/lint/typecheck/build, audit dependencies dan CI. Tidak boleh mengulang error serializer multipart Expo yang sudah diperbaiki.
- Release: migration rehearsal/backup, flags, URLs/keys provider, signup-email/recovery nyata, monitoring jobs/5xx, cleanup permissions dan rollback tervalidasi.

## 8. Enam deliverable tetap wajib

| Deliverable | Pembaruan yang diperlukan |
| --- | --- |
| Dokumentasi API | Endpoint sosial/wilayah/map, DTO, status, visibility, cursor/idempotensi dan moderasi |
| Schema/ERD | Tabel/constraint/index baru, wilayah/geometri, outbox dan lifecycle media |
| Source + model | Perubahan web/mobile/backend; checkpoint dan preprocess lama tetap dapat dijalankan |
| Dataset + sumber | Dataset sampah tetap; sumber/lisensi data wilayah dan aset dicatat terpisah |
| Evaluasi model | Metrik lama tetap berlabel dataset/test; fitur sosial tidak dianggap menaikkan akurasi |
| README instalasi/penggunaan | Migrasi, import wilayah, worker, map keys/tiles, publish/unshare, filters, onboarding/error dan device steps |

Semua butir di atas masih merupakan acceptance implementasi mendatang. Tahap rencana tidak membuktikan endpoint, peta, logo, aset atau layar baru sudah tersedia.
