# Rencana penyempurnaan pengalaman pengguna WasteWise

Tanggal: 3 November 2026. Status: implementasi selesai dan pemeriksaan lokal lulus; pengujian iOS/Android fisik tetap terbuka. Hasil terukur dicatat di docs/PROGRESS.md.

## 1. Keputusan dan batas pekerjaan

- Sisi pengguna web tidak menggunakan sidebar, termasuk pada ukuran desktop.
- Operasi admin tetap memiliki sidebar. Halaman komunitas memakai layout pengguna meskipun dibuka akun admin.
- Seluruh teks antarmuka web/mobile memakai Manrope. Caveat dihapus dari heading, landing, onboarding, dan teks dekoratif. Logo simbol tetap; penulisan nama WasteWise memakai bobot konsisten.
- Beranda menampilkan **posting komunitas yang sudah dibagikan saja**, sesuai jawaban pengguna. Laporan privat tetap di Laporan saya.
- Beranda default menampilkan semua status: Pending, In Progress, Completed, Rejected. Status ditampilkan sebagai Menunggu, Diproses, Selesai, Ditolak.
- Filter lokasi, kategori, status tersembunyi di balik satu tombol ikon pada mobile. Ketentuan sama berlaku untuk Beranda dan Peta.
- Desain mempertahankan palet forest, alur foto/ML/GPS otomatis, izin berbagi, dan API yang berjalan. Perubahan ini tidak memerlukan retraining.
- Implementasi mengikuti rencana ini. Tidak melakukan migrasi atau publikasi laporan privat lama.

## 2. Temuan dari screenshot dan kode

| Prioritas | Temuan | Bukti | Perbaikan |
| --- | --- | --- | --- |
| P1 | Kerangka admin dipakai juga untuk pengguna biasa | `web/src/App.tsx` selalu merender `.sidebar` | Pisahkan UserShell dan AdminShell |
| P1 | Filter mengambil hampir seluruh area awal beranda web | `RegionFilters.tsx` memakai details terbuka; setiap wilayah memiliki input dan select terpisah | Toolbar ringkas, panel filter sesuai kebutuhan |
| P1 | Mobile menampilkan tombol wilayah serta dua baris kategori/status sekaligus | `mobile/src/CommunityFilters.tsx` | Satu pemicu ikon; semua pengaturan di panel |
| P1 | Web memiliki kartu, tetapi posisinya setelah formulir panjang | `Community.tsx` sudah memiliki PostCard dan feed-list | Foto dan kartu menjadi konten utama di layar awal |
| P2 | Font berganti antara Manrope dan Caveat | `styles.css`, beranda native, font loader native | Satu keluarga font dengan hierarki bobot/ukuran |
| P2 | Peta native berada di bawah judul dan filter besar, dengan tinggi tetap 430 | `mobile/app/(tabs)/map.tsx`, `CommunityMap.native.tsx` | Area peta mengisi ruang tersedia; toolbar kecil |
| P2 | Laporan mobile memakai banyak tombol besar dan pagination meskipun kosong | `mobile/app/(tabs)/reports.tsx` | Pencarian satu baris, filter ikon, empty state, pagination kondisional |

Catatan penting: endpoint feed sudah menerima status opsional. Tidak memilih status berarti semua status; kosongnya beranda pada screenshot tidak membuktikan kegagalan filter. Periksa jumlah publikasi yang terlihat oleh akun, status publikasi, dan hasil API sebelum mengubah logika. Status laporan berbeda dari state publikasi `processing/published/hidden/withdrawn`.

## 3. Struktur navigasi web

### UserShell

Desktop: logo di kiri; Beranda, Peta, Laporan saya, Panduan di tengah; Buat laporan dan menu akun di kanan. Header sekitar 68px; konten terpusat, maksimum sekitar 1184px. Hilangkan breadcrumb Ruang kerja dan slogan samping dari area pengguna.

Web pada layar kecil: header logo + akun; navigasi bawah Beranda, Peta, Foto, Laporan, Profil. Foto menjadi aksi tengah yang lebih besar, dengan label aksesibel. Profil menyediakan data akun, panduan, klasifikasi terpisah, dan keluar. Route profil dibuat nyata sebelum ditautkan.

Panduan dan klasifikasi tetap dapat diakses. Ringkasan pribadi dapat dibuka melalui menu akun; tidak memenuhi navbar utama dengan seluruh fitur.

### AdminShell

Sidebar hanya untuk kegiatan pengelolaan: Ringkasan, Laporan, Pengguna, Moderasi. Tautan Lihat komunitas membawa admin ke UserShell. Menu akun pada komunitas memberi jalan kembali ke Panel admin.

Pemetaan route:

- `/app`, `/map`, `/community/:id`: UserShell untuk seluruh akun yang login.
- `/dashboard`: AdminShell untuk admin; pengguna biasa tetap dapat membuka ringkasan pribadi yang sudah tersedia melalui UserShell.
- `/users`, `/moderation`: AdminShell dan pemeriksaan role admin; penolakan akses tetap dilakukan server.
- `/reports`, `/reports/:id`: UserShell untuk pengguna, AdminShell untuk pengelolaan oleh admin. Label Laporan saya hanya digunakan bila data benar-benar dibatasi ke pemilik.
- `/reports/new`, `/classify`, `/guide`, profil pengguna: UserShell.
- Landing, login, pemulihan akun, onboarding, error publik mempertahankan akses yang sesuai.

Jangan menentukan seluruh kerangka hanya dari role akun. Konteks route komunitas dan route operasional juga menentukan kerangka. Redirect setelah login harus mempertahankan tujuan semula.

## 4. Beranda web dan kartu foto

Urutan halaman:

1. Judul singkat Beranda; penjelasan maksimal satu baris.
2. Toolbar berisi ringkasan wilayah, Semua status, tombol Filter, akses Peta.
3. Ringkasan filter aktif hanya jika ada filter yang diterapkan.
4. Kartu posting terbaru; Lihat berikutnya di akhir jika cursor tersedia.

Tidak ada kolom slogan atau panel edukasi permanen di kanan. Panduan dipindahkan ke halaman/menu yang sesuai.

Komposisi kartu konsisten dengan mobile:

1. Identitas penulis, waktu, status laporan.
2. Foto 4:3 dengan ruang gambar stabil; foto utuh dapat dibuka di detail.
3. Kategori ML dan penanda perlu review jika berasal dari server.
4. Deskripsi ringkas maksimal tiga baris, dengan Baca selengkapnya yang membuka detail.
5. Kelurahan/kecamatan/kota bila tersedia, koordinat GPS ringkas, akses Lihat di peta.
6. Suka dan komentar beserta jumlah nyata; keadaan aktif, proses, gagal/retry jelas.

Desktop mulai sekitar 1024px memakai dua kolom kartu, urutan DOM tetap kronologis per baris. Tablet dan HP memakai satu kolom; lebar baca tablet dibatasi sekitar 680px. Tidak memakai masonry yang membuat urutan posting sulit diikuti.

Target: bila data tersedia, header kartu dan foto pertama terlihat tanpa harus menggulir melewati formulir filter pada viewport 390x844 dan 1440x900. Empty state tidak diganti posting palsu atau gambar dataset yang menyerupai posting nyata.

Pisahkan PostCard dari file halaman supaya feed dan detail memakai komponen yang sama, tanpa menggandakan logika suka, edit, dan moderasi.

## 5. Filter ringkas pada web dan mobile

Tombol memakai ikon pengaturan filter yang relevan, target sentuh minimal 44x44. Nama aksesibel: Buka filter. Indikator jumlah hanya menghitung filter aktif yang nyata, bukan jumlah hasil rekaan. Panel awal tertutup.

- Mobile: satu modal berbentuk sheet dengan header Filter, tombol Tutup, isi dapat digulir, tombol Terapkan dan Reset yang tetap mudah dijangkau.
- Desktop: panel terjangkar atau dialog ringkas. Keyboard, Escape, fokus masuk/keluar, label, dan pembaca layar harus bekerja.
- Urutan pengaturan: lokasi, kategori sampah, status laporan.
- Wilayah bertingkat: provinsi, kabupaten/kota, kecamatan, kelurahan/desa. Memilih kota tidak mewajibkan pengguna sampai kelurahan.
- Mengganti induk menghapus anak yang tidak lagi valid. Pemilihan tingkat anak dinonaktifkan sampai induk tersedia.
- Pencarian dan pilihan wilayah berada dalam satu kontrol yang jelas. Hindari pasangan input+select permanen untuk setiap tingkat.
- Isi panel menggunakan state sementara. Menutup tanpa Terapkan tidak mengubah feed; Reset mengosongkan pilihan sementara, diterapkan setelah Terapkan.
- Setelah diterapkan, tampilkan ringkasan aktif yang dapat dihapus. Menghapus induk sekaligus menghapus anak; menghapus status mengembalikan Semua status.
- Web mempertahankan parameter `r0` sampai `r3`, `category`, `status`, Back/Forward, refresh, dan tautan ke peta. Jangan menghapus parameter yang tidak dimiliki filter.
- Native mempertahankan pilihan selama navigasi dalam sesi, tetapi login baru dimulai dengan semua status/wilayah. Tidak menyimpan filter tersembunyi tanpa indikator.
- Request wilayah hanya berjalan ketika panel dibutuhkan; pencarian diberi debounce dan pembatalan request lama.

## 6. Perbaikan mobile per halaman

### Beranda

Header berisi judul Manrope sekitar 26/34, ikon filter di kanan, keterangan pendek. Hilangkan heading tulisan tangan dan tiga baris kontrol sebelum feed. Kartu memakai jarak 16px, foto besar, metadata ringkas. FlatList, refresh saat fokus, tarik untuk menyegarkan, dan pagination tetap dipertahankan.

Loading awal memakai placeholder kartu; refresh tidak mengosongkan daftar yang masih valid. Error memuat halaman berikutnya tidak menghilangkan posting yang telah terlihat. Pergantian filter membatalkan hasil lama dan mengulang cursor.

### Peta

Peta memakai sisa tinggi layar di antara header dan navigasi bawah. Judul ringkas, tombol filter kecil, ringkasan filter saat aktif. Marker membuka ringkasan kartu, lalu detail; cluster memperbesar area. Sediakan daftar lokasi alternatif, pesan offline, dan retry. Kontrol peta, atribusi, dan kartu lokasi tidak tertutup tombol kamera atau safe area.

Tidak meminta GPS baru hanya untuk membuka peta. Tombol lokasi saya boleh meminta izin saat disentuh. Tidak menggeser peta otomatis berulang kali setelah pengguna mulai menjelajah.

### Laporan saya

Header ringkas + ikon tambah, pencarian dengan ikon kirim/returnKey search, tombol filter status. Daftar langsung di bawah toolbar; tidak menampilkan semua tombol status di halaman awal. Satu baris laporan berisi thumbnail, kategori, ringkasan deskripsi, waktu, dan status.

Pagination hanya tampil bila hasil dan halaman relevan tersedia. Empty state membedakan belum pernah melapor dengan tidak ada hasil filter. Error tidak ditampilkan sebagai daftar kosong. Tidak menampilkan Halaman 1 beserta dua tombol nonaktif pada hasil nol.

### Navigasi bawah

Lima tab dipertahankan, ikon kamera tengah 64 sampai 68px. Label tab Manrope; safe area iPhone/Android dihitung sekali. Isi daftar mendapat padding bawah sehingga kartu terakhir dan tombol komentar tidak tertutup navbar. Pengujian termasuk keyboard terbuka dan ukuran teks sistem diperbesar.

## 7. Aturan semua status dan pemunculan laporan

- Default web/mobile: tidak mengirim parameter status; kategori dan lokasi juga tidak dibatasi tanpa tindakan pengguna.
- Posting yang published muncul meskipun laporannya Menunggu, Diproses, Selesai, atau Ditolak. Perubahan status admin memperbarui label, bukan menghapus posting.
- Published tidak berarti Completed. Hidden/withdrawn tetap tidak terlihat oleh pengguna lain, apa pun status laporannya.
- Laporan privat lama tidak diubah menjadi publik. Foto, lokasi, atau laporan yang belum dibagikan tidak masuk feed komunitas.
- Setelah pengiriman laporan dengan persetujuan berbagi, respons berhasil memperbarui cache feed, riwayat, dan peta. Kembali ke Beranda tidak menunggu interval polling untuk menyadari posting baru.
- Saat worker menyiapkan foto, pemilik melihat kartu processing yang jujur; setelah terbit, gambar dan interaksi tersedia. Pengguna lain melihat posting setelah publikasi siap.
- Beranda kosong harus memeriksa state API, filter aktif, dan akun, kemudian memberi aksi yang sesuai. Jangan mengatasi kosong dengan melewati aturan publikasi.
- Status difilter server hanya ketika diminta. Pengujian membuat empat posting dengan empat status untuk membuktikan semuanya tampil default.

## 8. Tipografi dan komponen bersama

Manrope dipilih karena sudah tersedia lokal pada kedua platform dan mudah dibaca pada label/data. Bobot: 400 isi, 500 metadata penting, 600 kontrol, 700 judul. Warna, bukan perubahan keluarga font, memberi penekanan.

Web: body 15/24, label 13/18, heading produk 28/36. Native: body 15/22, metadata 12/18, heading 26/34. Angka target menjadi token yang konsisten; pembesaran aksesibilitas tetap didukung.

Audit seluruh heading, input, tombol, dialog, tab, onboarding, landing, error, dan label navigator. React Native memakai mapping font eksplisit per bobot; tidak mengandalkan pewarisan font pada View. Font ikon tidak diganti dengan font teks. Setelah seluruh referensi Caveat hilang, hapus dependensi/load/aset yang tidak dipakai dan perbarui lockfile.

Komponen yang diperlukan: UserHeader, UserBottomNav, AdminShell, FilterTrigger, FilterPanel/FilterSheet, ActiveFilters, PostCard, PostSkeleton, ReportListItem, dan AppText/token native. Komponen dibuat sesuai kebutuhan nyata; logika API dan kontrak shared tetap dipakai.

## 9. Tahapan dan file

| Tahap | Hasil | File utama | Risiko yang diperiksa |
| --- | --- | --- | --- |
| 1 | Baseline screenshot/data dan route matrix | `web/e2e`, `mobile/app/(tabs)`, docs rencana | Salah menganggap tidak ada publikasi sebagai bug status |
| 2 | UserShell/AdminShell, menu, profil | `web/src/App.tsx`, komponen/layout baru, `web/src/styles.css` | Otorisasi, redirect login, route detail lama |
| 3 | Manrope tunggal dan token | `web/src/main.tsx`, `styles.css`, `mobile/src/ui.tsx`, `_layout.tsx`, layar native terkait | Font fallback, ikon, skala teks, lockfile |
| 4 | Filter ikon dengan draft/apply | `RegionFilters.tsx`, `mobile/src/CommunityFilters.tsx`, hooks filter | URL, anak wilayah, request lama, fokus/keyboard |
| 5 | Feed dan kartu web/mobile | `Community.tsx`, PostCard terpisah, `mobile/src/PostCard.tsx`, tab index | Semua status, cache invalidation, pagination, interaksi |
| 6 | Peta dan riwayat mobile ringkas | tab map/reports, `CommunityMap.native.tsx`, varian Expo web | Safe area, scrolling peta, hasil kosong, marker |
| 7 | Verifikasi dan dokumentasi | E2E, backend regression bila diperlukan, DESIGN/DECISIONS/PROGRESS/README | Klaim pengujian lokal berbeda dari bukti HP fisik |

Tidak diperkirakan perlu schema baru. Perubahan kontrak API hanya dilakukan bila reproduksi membuktikan kebutuhan; kalau ada, OpenAPI/shared types/dokumentasi diperbarui bersama. Modifikasi pengguna pada `mobile/tsconfig.json` dipertahankan dan tidak dimasukkan commit pekerjaan ini.

## 10. Kriteria penerimaan dan verifikasi

1. Akun user membuka seluruh alur normal tanpa sidebar/drawer navigasi samping. Admin dapat berpindah komunitas dan pengelolaan tanpa kehilangan sesi.
2. Web memiliki kartu foto nyata dengan kelengkapan setara mobile; kartu dan peta tidak tertunda di bawah formulir filter panjang.
3. Filter awal tertutup. Satu tombol ikon bekerja pada Beranda dan Peta mobile; Terapkan, Reset, Tutup, pilihan induk/anak benar.
4. Semua empat status published muncul di beranda default. Filter satu status, reset, reload/fokus, status berubah, load more diuji.
5. Laporan privat, withdrawn, hidden tidak bocor ke pengguna lain; pemilik tetap dapat mengakses laporan privat melalui riwayat.
6. Posting baru yang dibagikan segera terlihat oleh pemilik; proses foto memiliki indikator nyata, bukan foto/label rekaan.
7. Manrope konsisten pada web/native; input, tab, tombol, dan heading tidak memakai fallback tak disengaja. Logo mark tetap sesuai identitas.
8. Lebar 320, 390, 768, 1024, 1440; zoom web 200%; teks sistem native diperbesar; tanpa overflow horizontal atau kontrol terpotong.
9. Target sentuh minimal 44px, kontras teks normal minimal 4.5:1, fokus terlihat, keyboard/VoiceOver dan reduced motion diperiksa.
10. Empty, loading awal, refresh, pagination error, offline, signed URL kedaluwarsa, sesi berakhir, foto gagal dimuat memiliki pemulihan yang jelas.

Perintah saat implementasi:

```bash
npm run check
npm run build
(cd backend-ml && .venv/bin/python scripts/test_browser.py)
npm --prefix web run e2e:auth
npm --prefix mobile run export
```

Jika logika server berubah, jalankan runner backend terisolasi di `docs/TESTING.md`. Perubahan presentasi tidak memerlukan retraining atau evaluasi ulang checkpoint. Smoke test native dilakukan pada iOS/Android fisik bila tersedia, mencakup kamera/galeri, GPS, filter, posting baru, map gesture, dan navigasi kembali.

Bukti disimpan berupa screenshot sebelum/sesudah per ukuran, hasil tes empat status, hasil akses lintas akun, dan log build/export. Semua kriteria ini adalah target verifikasi, **belum dinyatakan lulus untuk perubahan yang masih direncanakan**.
