# Referensi wilayah Indonesia

Sumber MIT: [cahyadsn/wilayah](https://github.com/cahyadsn/wilayah), [cahyadsn/wilayah_boundaries](https://github.com/cahyadsn/wilayah_boundaries). Versi commit, URL dan SHA256 setiap file tercatat pada `backend-ml/dataset/regions/sources.json`; kedua lisensi disertakan. Import hanya membaca pasangan nilai dan JSON; **SQL upstream tidak pernah dieksekusi** karena memuat DROP/DELETE.

Inventaris terukur:38 provinsi,514 kabupaten/kota,7.285 kecamatan,83.762 kelurahan/desa;83.604 poligon cocok kode,0 kode poligon asing.158 kelurahan/desa belum memiliki poligon. Lihat coverage.json. Header dump menyebut Kepmendagri2138/2025; README upstream menyebut2430/2025. Perbedaan ini dipertahankan sebagai batas provenance; tidak mengklaim seluruh batas terbaru atau berkekuatan hukum.

Koordinat poligon upstream adalah **latitude,longitude**, bukan urutan GeoJSON. Resolver memakai bbox lalu ray casting even-odd agar lubang dan pulau terpisah tetap diperhitungkan. Satu kecocokan memberi rantai nama desa/kecamatan/kota/provinsi. Nol kecocokan=unresolved; lebih dari satu=ambiguous. Tidak memakai centroid terdekat, tidak mengarang label. GPS/EXIF client tetap dapat dipalsukan; label administratif bukan bukti kehadiran.

Dari root:

```bash
backend-ml/.venv/bin/python backend-ml/scripts/fetch_regions.py
(cd backend-ml && .venv/bin/python -m app.import_regions)
```

Pengunduh menggunakan commit dari manifest yang sudah ada, memverifikasi SHA256 pada importer. File poligon sekitar368MB diunduh lokal dan diabaikan Git; source/model/dataset ML tetap terpisah. Import idempoten, hierarki divalidasi, nama masuk per tingkat, poligon diperbarui per kabupaten/kota. Jangan menghapus manifest untuk memperbarui data tanpa meninjau perubahan versi, cakupan, lisensi dan regresi titik GPS.

Filter parent dilakukan di server. Pencarian wilayah dibatasi200nama; input pencarian disediakan untuk daftar panjang. Filter feed/peta memakai kode persis atau keturunannya. Posisi peta memakai GPS laporan, bukan titik pusat administratif.

Indeks bbox c42d19b50ea7 mendukung kandidat sebelum ray casting. Import Supabase lengkap telah selesai dan diverifikasi terpisah pada PROGRESS.
