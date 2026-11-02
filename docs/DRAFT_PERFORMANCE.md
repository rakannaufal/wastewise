# Respons kategori dan penghapusan draft

## Perubahan

- Satu unggah tetap menghasilkan draft dan prediksi. Unggah foto asli, thumbnail dan inferensi berjalan paralel; session database tidak dibagikan ke thread pekerja.
- Koneksi HTTPS Supabase digunakan ulang. Bearer tetap diverifikasi ke Auth pada setiap request; role dan status blokir tetap dibaca dari database, tanpa cache identitas/role.
- Profil yang sudah cocok dibaca dengan satu query yang juga mengecualikan identitas terblokir. Provisioning/perubahan email mempertahankan advisory lock dan validasi lama.
- Antrean cleanup menggunakan batch INSERT ON CONFLICT DO NOTHING. Upload parsial yang gagal tetap mengantrekan objek saudara yang berhasil.
- Web/mobile langsung menyembunyikan foto, kategori dan lokasi ketika hapus ditekan. Indikator penghapusan tetap tampil. Data lokal dipertahankan sampai server mengonfirmasi; jika request gagal, draft tampil kembali dan dapat dicoba ulang.
- DELETE draft idempoten, termasuk draft kedaluwarsa. Draft akun lain tidak dihapus dan respons tidak membocorkan keberadaannya. Draft yang sudah menjadi laporan tetap ditolak409.
- Kategori tampil segera setelah respons prediksi, sebelum PATCH lokasi selesai. Indikator beralih ke penyimpanan lokasi agar pengguna mengetahui kategori sudah tersedia.

## Pengukuran

API lokal yang sama, Supabase Auth/Postgres/Storage nyata, checkpoint yang sama, gambar JPEG8042byte. Tiga create/delete berurutan sebelum perubahan, tiga sesudah. Median:

| Operasi | Sebelum | Sesudah | Penurunan |
| --- | --- | --- | --- |
| Foto sampai kategori tersedia | 5429.6 ms | 3332.1 ms | 38.6% |
| DELETE sampai konfirmasi server | 4266.4 ms | 2382.8 ms | 44.1% |

Bukti: [sebelum](evidence/draft-latency-before.json), [sesudah](evidence/draft-latency-after.json). Kedua run selesai membersihkan identitas/foto QA. Angka mencakup respons HTTP, bukan waktu pengambilan kamera, kompresi native, jaringan HP atau rendering. Sampel kecil ini bukan p95 atau jaminan produksi. Penghapusan fisik objek dilakukan worker setelah metadata draft dihapus; foto cached/downloaded tidak dapat ditarik seketika.

Ulangi pada development/staging yang diizinkan dengan API8000 aktif:

```bash
cd backend-ml
.venv/bin/python -m scripts.benchmark_drafts --run --label before
# Terapkan perubahan dan restart API, kemudian:
.venv/bin/python -m scripts.benchmark_drafts --run --label after
```

Runner membuat satu akun QA terkonfirmasi melalui admin API dan menghapus hanya sumber daya QA tersebut. Jangan arahkan ke produksi. Worker cleanup tetap harus berjalan.

## Verifikasi

28 tes backend lulus, termasuk barrier yang membuktikan tiga operasi tumpang tindih, kegagalan thumbnail sebelum upload dimulai, kegagalan sebagian upload dengan cleanup durable, DELETE dua kali, DELETE setelah expiry, isolasi pemilik dan penolakan draft consumed. Pemeriksaan role/blokir dan provisioning bersamaan tetap lulus. Ruff/mypy, check/typecheck web/mobile, build web, dua regresi serializer Expo dan dua tes EXIF lulus.

E2E web/Expo menguji DELETE tertahan: foto/kategori hilang sebelum respons; respons gagal mengembalikan foto/kategori; retry nyata berhasil, lalu foto baru dapat dipilih. Pengujian fisik iPhone/Android dan latency jaringan seluler masih diperlukan.

Hasil akhir: tiga E2E lokal lulus31,4detik;22pemeriksaan Supabase nyata dengan browser lulus dan cleanup QA selesai. Ekspor iOS/Android/web lulus. Audit npm kedua client0kerentanan.
