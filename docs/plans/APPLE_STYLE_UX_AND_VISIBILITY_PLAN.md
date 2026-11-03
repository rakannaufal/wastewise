# WasteWise: rencana dropdown, deskripsi opsional, navigasi dan visibilitas laporan

Tanggal: 3 November 2026. Status: diimplementasikan; hasil verifikasi dan batas perangkat/deployment dicatat pada docs/PROGRESS.md.

Dasar: enam permintaan terbaru pengguna, tiga screenshot, source pada commit b41711e, serta audit database read-only. Skill: antislop during sesuai pilihan sesi; Impeccable Shape untuk discovery dan brief, dengan pedoman iOS sebagai referensi perilaku. Stack React/Vite, Expo, FastAPI dan PostgreSQL dipertahankan. Model/dataset tidak dilatih ulang.

## 1. Hasil audit dan masalah sebenarnya

| Temuan | Bukti saat audit | Implikasi |
| --- | --- | --- |
| Dua laporan benar-benar tersimpan | 86e8dc53: Completed; 441edcc1: Pending | Empty state bukan berarti laporan hilang |
| Kedua laporan belum mempunyai CommunityPost | Outer join read-only menghasilkan publication_state kosong pada keduanya | Mengubah filter status saja tidak akan membuatnya tampil |
| Kedua laporan memiliki koordinat | Audit hanya mengeluarkan boolean, tanpa menyalin GPS presisi | Titik dapat direncanakan setelah validasi koordinat dan publikasi |
| Laporan Completed memakai legacy_unknown | Data asli, bukan kesimpulan dari foto | Jangan mengaku koordinatnya berasal dari GPS kamera; pertahankan penanda sumber belum diketahui |
| Feed memuat CommunityPost published atau processing milik sendiri | app/community.py:223 | Report dan posting komunitas merupakan dua entitas berbeda |
| Peta hanya memuat CommunityPost published | app/regions.py:48 | Publisher harus menyiapkan foto; laporan tersimpan belum tentu sudah terbit |
| Deskripsi diwajibkan berlapis | schemas.py:99/113, models.py:159/246, kedua ReportComposer | Menghapus required di textarea saja tetap menghasilkan kegagalan API/database |
| Navbar dibuat terpisah | Public.tsx:15 dan WorkspaceLayout.tsx | Logo, tinggi, menu, state akun dan tautan beranda tidak konsisten |
| Mobile memakai chip/radio untuk banyak opsi | CommunityFilters, RegionPicker, review kategori pada report/[id] | Kategori12/status/wilayah memperpanjang panel tanpa perlu |

Audit tidak mempublikasikan laporan, mengubah status, mengubah koordinat, atau mengubah data pengguna.

## 2. Keputusan produk

Sudah jelas dari permintaan terbaru:

- Pilihan input lebih dari3 memakai dropdown; pilihan panjang dapat dicari.
- Tombol mempunyai ukuran, posisi dan prioritas yang konsisten.
- Deskripsi opsional, termasuk saat laporan dibagikan ke komunitas.
- Navbar web memakai komponen dan aturan navigasi yang sama.
- Landing `/` memiliki section kartu ringkas; tombol **Lihat semua laporan** membuka `/app`.
- Arah visual mengikuti keterbacaan dan kerapian Apple, dengan identitas hijau WasteWise.
- Komunitas dan peta menampilkan Menunggu, Diproses, Selesai. Ditolak dikecualikan.
- Aturan terakhir menggantikan rencana sebelumnya yang menampilkan empat status di komunitas. Riwayat pribadi/admin tetap menyimpan semua empat status.

Keputusan akses dikonfirmasi langsung pengguna:

1. Foto/kartu laporan dan GPS presisi dapat dilihat publik, termasuk pengunjung tanpa login. Berlaku konsisten pada preview landing, daftar komunitas, detail publik dan peta; koordinat ditampilkan dengan presisi yang tersimpan.
2. Laporan baru otomatis dibagikan. Formulir menjelaskan cakupan publik sebelum pengiriman; tidak ada langkah Bagikan terpisah untuk laporan baru.
3. Teks formulir harus menyebut **publik, termasuk pengunjung tanpa akun**. Frasa terlihat oleh pengguna login dari opsi sebelumnya tidak lagi akurat setelah keputusan pertama.
4. Membuat laporan, suka, komentar dan pengelolaan tetap memerlukan login. Akses baca publik tidak memberikan hak menulis anonim.
5. Dua laporan lama yang ditunjuk pengguna masuk lingkup backfill saat implementasi. Laporan privat lama milik akun lain tidak diterbitkan massal tanpa peninjauan kebijakan sebelumnya.

Contoh teks sebelum tombol kirim: **Foto, lokasi GPS presisi, dan deskripsi yang kamu isi akan terlihat oleh publik, termasuk pengunjung tanpa akun.** Tombol: **Kirim dan publikasikan**. Kebijakan ini menggantikan default privat/komunitas login-only pada rencana sebelumnya setelah implementasinya benar-benar tersedia.

## 3. Aturan status dan publikasi sebagai satu kontrak

Pisahkan tiga hal: status penanganan Report, state publikasi CommunityPost, dan siapa yang meminta data. Menunggu tidak sama dengan processing foto; Selesai tidak otomatis berarti published.

| Kondisi | Preview/komunitas | Peta | Riwayat pemilik/admin |
| --- | --- | --- | --- |
| Pending + published | Tampil | Tampil jika koordinat valid dan masuk area peta | Tampil |
| In Progress + published | Tampil | Tampil dengan aturan sama | Tampil |
| Completed + published | Tampil; status Selesai tetap jelas | Tampil; marker selesai dibedakan lewat label/bentuk/warna | Tampil |
| Rejected, apa pun publikasinya | Tidak tampil untuk pengunjung komunitas | Tidak tampil | Tampil dengan alasan penolakan |
| Laporan baru valid | Otomatis masuk antrean publikasi setelah pengiriman dengan penjelasan publik | Tampil setelah published dan koordinat valid | Tampil |
| Arsip privat di luar backfill yang disetujui | Tidak tampil | Tidak tampil | Tampil sesuai izin |
| Foto processing | Pemilik melihat indikator sedang disiapkan | Belum menjadi marker komunitas umum | Tampil |
| Hidden atau withdrawn | Tidak tampil | Tidak tampil | Laporan operasional tetap tersedia sesuai izin |
| Lokasi legacy_unknown | Boleh tampil setelah publikasi; sumber diberi label jujur | Koordinat lama divalidasi; tidak diganti lokasi HP saat ini | Sumber asli dipertahankan |

Rencana backend:

- Buat satu predicate eligibility yang dipakai feed, preview, peta, detail komunitas dan interaksi. Batas status diterapkan server, termasuk jika client mengirim status=Rejected secara langsung.
- Preview/feed/map/detail published eligible dapat dibaca tanpa token. Token yang disertakan tetap diverifikasi sebelum memberi kemampuan pemilik/admin; anonymous tidak boleh memperoleh processing/hidden/withdrawn atau hak pengelolaan. Endpoint tulis tetap memakai autentikasi wajib.
- Gunakan subset status komunitas Pending/In Progress/Completed; enum status laporan operasional tetap empat nilai. Dropdown komunitas berisi Semua status + tiga nilai tersebut.
- Detail posting yang ditolak tidak boleh tetap terbuka lewat URL lama untuk pengguna lain. Pemilik/admin mengakses alasan melalui detail laporan operasional.
- Suka/komentar mengecek kembali status terkini; request yang berlomba dengan penolakan ditolak dengan respons konsisten. Menyembunyikan kartu lewat CSS tidak cukup.
- Penolakan tidak menghapus foto operasional atau mengubah hidden/withdrawn menjadi published. Pembukaan ulang status hanya mengembalikan visibilitas jika publikasinya masih memenuhi syarat.
- Mutasi status memicu invalidasi/refetch daftar yang relevan. Client lain memperbarui saat fokus/refresh dan polling terbatas saat aktif; jangan menjanjikan realtime tanpa mekanisme distribusi event yang benar-benar dibuat.
- Signed URL yang sudah diterbitkan memiliki masa berlaku; hilang dari feed tidak berarti URL lama langsung dicabut. Dokumentasikan batas ini.

Untuk dua laporan saat ini:

1. Dry-run dua ID yang ditemukan; periksa pemilik, foto privat, koordinat, sumber lokasi dan apakah posting sudah ada.
2. Terbitkan hanya lingkup yang disetujui, dengan jejak versi kebijakan/aktor/waktu; cegah duplikasi melalui unique report_id dan transaksi.
3. Publisher membuat foto/thumbnail; pantau processing, retry dan kesalahan yang terlihat oleh pemilik.
4. Pastikan kedua kartu ada pada feed tanpa filter dan kedua lokasi terwakili pada peta. Pada zoom jauh, dua laporan dapat berupa satu cluster dengan count2; dua marker terpisah diperiksa setelah zoom.
5. Cocokkan wilayah memakai poligon. Lokasi unresolved tetap masuk Semua wilayah; jangan menebak kelurahan atau memasukkannya pada filter wilayah tertentu tanpa kecocokan.

Tidak memakai ulang GPS perangkat saat ini untuk melengkapi lokasi foto lama.

## 4. Deskripsi benar-benar opsional

Kontrak yang disarankan: database dan response tetap string; nilai kosong disimpan sebagai `""`. Input tidak dikirim, null, string kosong, atau whitespace dinormalisasi menjadi string kosong. Teks yang diisi boleh1–5000 karakter setelah trim. Tidak lagi ada minimum10 karakter.

| Lapisan | Perubahan yang direncanakan |
| --- | --- |
| Web/native composer | Label Deskripsi (opsional); hilangkan required/minLength dan syarat10karakter pada canSave |
| Draft lokal | Deskripsi kosong tersimpan/pulih tanpa dianggap draft rusak |
| POST reports | Foto/draft, prediksi, lokasi dan izin tetap wajib; deskripsi tidak menghalangi pengiriman |
| PATCH reports | Field tidak dikirim mempertahankan nilai lama; null/kosong secara eksplisit mengosongkan nilai, tetap memakai revision |
| Pydantic | Normalisasi request kosong; tetap menolak tipe yang salah dan panjang>5000 |
| PostgreSQL | Migrasi batas Report.description dan CommunityPost.caption dari10..5000 menjadi0..5000; NOT NULL tetap dipertahankan |
| Caption komunitas | Publish/Edit menerima caption kosong; field yang tidak dikirim saat publish mengikuti deskripsi laporan yang sudah dinormalisasi |
| DTO/shared types | Response tetap string untuk kompatibilitas; tipe request menandai input opsional secara eksplisit |
| Kartu/detail | Sembunyikan blok caption kosong; kategori/lokasi menjadi identitas kartu. Label Tanpa deskripsi hanya pada konteks administratif yang memerlukannya |

Jangan mengisi database dengan kalimat buatan seperti Sampah terdeteksi otomatis agar lolos validator. Judul presentasi seperti Plastik di Gambir boleh dihitung dari kategori/wilayah nyata, terpisah dari deskripsi pengguna.

Komentar tetap wajib berisi teks. Alasan penolakan, pembukaan ulang, review dan moderasi tetap wajib; permintaan deskripsi opsional tidak menghapus kontrol tersebut. Edit deskripsi laporan tidak diam-diam menimpa caption publik yang sudah diedit terpisah.

Idempotensi harus memakai payload yang telah dinormalisasi: request deskripsi dihilangkan dan request `description:""` tidak menghasilkan dua laporan. PATCH membedakan omitted dengan explicit empty.

## 5. Dropdown untuk pilihan lebih dari3

Aturan berlaku pada input yang meminta pengguna memilih nilai. Navigasi utama, kumpulan kartu, legenda, daftar hasil ML dan konten panduan tidak diubah menjadi dropdown hanya karena jumlahnya banyak.

| Pilihan | Bentuk target |
| --- | --- |
| Filter12kategori + Semua material | Dropdown dengan label tetap; pencarian bila diperlukan |
| Komunitas: Semua/Menunggu/Diproses/Selesai | Dropdown,4pilihan |
| Riwayat/admin: Semua + empat status | Dropdown,5pilihan |
| Provinsi/kota/kecamatan/kelurahan | Empat dropdown bertingkat; provinsi aktif dulu, anak aktif setelah induk dipilih |
| Review kategori admin12nilai | Dropdown; prediksi asli tetap read-only |
| Urutan maksimal3nilai | Kontrol ringkas sesuai ruang; tidak wajib tombol terpisah |
| Kamera/galeri2aksi | Dua aksi jelas sesuai konteks kamera |
| Publikasi laporan baru | Otomatis; penjelasan publik terlihat sebelum tombol kirim, tanpa toggle privat/bagikan |
| Kategori hasil ML | Hasil otomatis read-only, tidak menjadi pilihan manual pengguna |

Perilaku:

- Web memakai native select untuk pilihan pendek. Wilayah panjang memakai combobox yang bisa dicari, dengan keyboard, Enter, Escape, label, fokus dan selected state yang benar.
- Native memakai satu baris pemilih tertutup; sentuh untuk membuka pemilih dengan pencarian/list virtual saat opsinya panjang. Hindari menu kecil yang berisi83ribu wilayah sekaligus.
- Backend membatasi hasil wilayah dan menerima parent/search. Pencarian debounce sekitar250ms, batalkan request lama; tampilkan loading, kosong, gagal/retry dan hasil terpotong.
- Mengganti provinsi mengosongkan kota/kecamatan/kelurahan; label dan kode dibersihkan bersama. Reset mengembalikan draft panel ke default; Terapkan baru mengubah hasil.
- Pilihan wilayah tidak menimpa GPS laporan. Ini filter, bukan formulir koordinat manual.
- Status aktif tetap tampil sebagai ringkasan yang bisa dihapus; banyak chip pilihan permanen di dalam panel dihilangkan.
- Hindari nested modal/sheet pada mobile. Pemilih wilayah menggunakan satu panel aktif dengan judul Kembali/Pilih, menjaga draft filter saat kembali.

## 6. Tombol dan susunan tindakan

Bangun varian yang dipakai lintas halaman: primary, secondary, tertiary dan destructive; ukuran regular/small/icon. Target sentuh minimum44px; kontrol utama mobile48px. Lebar mengikuti konteks, bukan seluruh tombol selalu100%.

- Satu tindakan utama per kelompok: Kirim laporan pada composer, Terapkan pada filter, Simpan perubahan pada edit.
- Desktop memakai action row sejajar; mobile menumpuk hanya saat ruang tidak cukup. Label tidak terpotong pada320px atau zoom200%.
- Dialog/sheet mempunyai footer tetap: Reset sekunder, Terapkan utama; Tutup di header. Keyboard dan safe area tidak menutup tindakan.
- Tombol ikon memiliki label aksesibel/tooltip pada web; ikon bersifat dekoratif saat label teks sudah tersedia.
- Suka/komentar menjadi tindakan ringan di kaki kartu, tidak bersaing dengan foto atau tombol buat laporan.
- Destructive dipisahkan secara ruang dari Simpan/Kirim dan meminta konfirmasi yang menyebut objeknya.
- Saat loading, lebar tombol stabil, status terbaca, double submit diblokir; kegagalan menyediakan retry tanpa membuang foto/draft.
- Perbaiki toolbar laporan pada screenshot: satu grid pencarian/filter/tanggal/urutan; Reset satu posisi konsisten. Petunjuk geser tabel hanya muncul jika tabel benar-benar overflow; pagination disembunyikan bila satu halaman.

Tidak ada tombol dummy, panah dekoratif di semua aksi, atau label abstrak seperti Lanjut tanpa konteks.

## 7. Navbar web tunggal dan arsitektur halaman

Satu `SiteHeader` bersama mengatur logo, lebar konten, tinggi, baseline, menu, state aktif, akun dan versi layar kecil. Dipakai landing, komunitas, peta, laporan, panduan dan profil. Login/onboarding/error memakai varian ringkas dari komponen yang sama bila navigasi penuh mengganggu tugas.

| Tujuan | Route dan perilaku |
| --- | --- |
| Beranda | `/`, landing dengan preview laporan |
| Komunitas | `/app`, seluruh kartu eligible, filter dan pagination |
| Peta | `/map`, lokasi dengan eligibility sama |
| Panduan | `/guide`; pengunjung anonim diberi akses atau login sesuai kontrak panduan yang disepakati saat implementasi |
| Laporan saya | `/reports` untuk user; admin diarahkan ke konteks pengelolaan dengan label yang benar |
| Buat laporan | `/reports/new`, meminta login bila belum masuk |
| Akun | Masuk untuk anonim, Profil/menu akun untuk sesi aktif |

Navbar tidak berpura-pura anonim saat sesi aktif: halaman root pada screenshot masih menampilkan Masuk meskipun akun dapat membuka komunitas. Status sesi berasal dari provider yang sama.

Menu primer tidak dipadatkan oleh semua fitur sekaligus. Rekomendasi: Beranda, Komunitas, Peta, Panduan; Laporan saya dan Panel admin ada pada menu akun. Tombol Buat laporan tetap menjadi aksi utama saat masuk. Dropdown menu akun adalah navigasi tambahan, terpisah dari aturan dropdown input.

Admin memakai global header yang sama di atas workspace. Sidebar sekunder khusus Ringkasan/Laporan/Pengguna/Moderasi tetap menjadi alat operasional; logo/account/header tidak digandakan. Ini menyatukan navbar tanpa menyamakan hak akses. Small-screen admin memakai drawer sekunder.

Pada HP web, header ringkas dan navigasi bawah tetap selaras dengan route aktif. Native mempertahankan lima tujuan utama dan kamera tengah yang diminta pengguna; status aktif Beranda/Komunitas dipetakan secara eksplisit agar dua item tidak sekaligus terpilih.

## 8. Landing dengan preview nyata

Urutan yang direncanakan:

1. Navbar bersama, mengikuti state akun.
2. Hero ringkas: fungsi foto, klasifikasi otomatis dan lokasi; tinggi mengikuti konten agar area awal tidak didominasi ruang kosong.
3. Section Laporan di sekitar: maksimal3kartu terbaru eligible, kemudian tombol **Lihat semua laporan**.
4. Cara kerja/panduan ringkas dan footer.

Preview memakai komponen dasar kartu yang sama dengan `/app`, dengan density lebih ringkas; bukan salinan layout dan logika baru. Grid3kolom desktop,2tablet,1HP; bila hanya ada dua posting, tampil dua tanpa kartu pengisi. Gambar contoh dataset di hero tetap diberi label dan tidak dihitung sebagai posting warga.

- Pengunjung tanpa login mendapat preview nyata beserta GPS presisi, sesuai keputusan pengguna. `/app`, detail komunitas dan `/map` menyediakan akses baca publik yang konsisten. Suka/komentar/membuat laporan tetap meminta login, lalu mempertahankan returnTo.
- Gunakan proyeksi publik berisi foto turunan, kategori, caption opsional, status, wilayah, koordinat dan jumlah interaksi. Tidak mengirim email/user_id, profil privat, metadata EXIF lain, Storage path atau original image. Rendition publik membuang metadata foto; koordinat tetap disajikan secara eksplisit pada DTO sesuai kebijakan yang dipilih.
- Bucket tetap privat; backend hanya menerbitkan URL foto turunan untuk posting eligible dengan masa berlaku terbatas. Terapkan rate limit dan cache yang tidak mencampur field personal seperti liked_by_me/is_owner dengan respons anonim. URL yang sudah diterbitkan tidak dijanjikan langsung hilang sebelum kedaluwarsa.
- Lihat semua laporan langsung membuka `/app` tanpa login wall. Navbar anonim menampilkan Masuk; navbar sesi aktif menampilkan akun yang benar.
- Pagination/filter penuh hanya pada `/app`. Landing tidak memuat seluruh arsip atau library peta.
- Empty state membedakan belum ada publikasi, filter tidak cocok dan gagal jaringan. Error tidak disamarkan sebagai data kosong.

## 9. Arah visual Apple untuk WasteWise

Bahasa visual yang dituju: hierarchy jelas, permukaan terang, ruang yang terukur, tipografi rapi, gambar utama, kontrol yang tenang dan respons langsung. Palet hijau serta logo WasteWise dipertahankan; tidak memakai aset atau identitas Apple.

- Satu keluarga font konsisten tetap menjadi default proyek: Manrope. Rasa Apple diterapkan lewat hierarki, skala, alignment, spacing dan perilaku; perubahan ke font sistem menjadi keputusan lintas platform tersendiri bila nanti diminta.
- Heading display lebih terkendali; konten operasional tidak memakai skala hero. Body sekitar16–17px dengan line-height yang terbaca; nilai final diperiksa pada perangkat, termasuk font scaling.
- Permukaan putih/off-white; forest sebagai satu tint utama. Status tetap memakai teks + indikator semantik, bukan warna saja.
- Radius dan elevasi berasal dari token; bayangan hanya untuk elemen yang mengambang. Tidak menambah blur/glass ke seluruh kartu atau latar.
- Transisi singkat sekitar160–220ms hanya untuk perubahan state/panel; hormati reduced motion dan hindari parallax pada alur laporan.
- Web: pointer/keyboard/focus/hover. Native: safe area, swipe-back, keyboard avoidance, sheet yang dapat ditutup dan aksesibilitas platform. Android tetap memakai perilaku yang familier di Android.
- Foto menjadi fokus kartu; kategori/status/lokasi mengikutinya. Caption kosong tidak meninggalkan ruang kosong buatan.
- Kamera tengah lebih besar tetap dipertahankan sesuai permintaan pengguna; konvensi aksi ini merupakan keputusan produk yang perlu diuji pada iOS/Android, bukan klaim kepatuhan penuh Apple HIG.

Tidak menjanjikan responsivitas hanya dari browser kecil; simulator/emulator dan perangkat tetap menjadi tahap pembuktian terpisah.

## 10. Urutan implementasi dan file

| Prioritas/tahap | Slice yang harus berjalan | Area utama | Gate |
| --- | --- | --- | --- |
| P0-A | Terapkan keputusan publik/GPS presisi dan publikasi otomatis pada kontrak; dry-run dua laporan | PRODUCT/DESIGN/DECISIONS dan rencana | Formulir menjelaskan akses publik secara akurat |
| P0-B | Deskripsi opsional end-to-end dengan migrasi | schemas/models/reports/community_schemas, Alembic, shared/contracts, kedua composer | Submit kosong berhasil, publish kosong berhasil, alasan wajib tetap wajib |
| P0-C | Eligibility tiga status sama pada semua API | community.py, regions.py, predicate bersama, DTO/filter shared | Ditolak tidak bisa muncul lewat parameter/URL lama |
| P0-D | Publikasi/backfill sesuai keputusan, publisher dan visibility | command idempotent baru, community worker, ShareReport | Dua laporan nyata masuk feed/peta; tidak menggandakan posting |
| P1-A | Token dan komponen Button/Select/Combobox | web/components/ui, mobile/src/ui dan picker terpisah | Keyboard, loading, safe area, target sentuh |
| P1-B | Dropdown semua pilihan>3 | RegionFilters, CommunityFilters, RegionPicker, review admin | Anak wilayah/reset/search benar; hasil ML tetap otomatis |
| P1-C | SiteHeader dan route matrix konsisten | App.tsx, WorkspaceLayout, Public, SiteHeader baru | Sesi/returnTo/admin guard tidak rusak |
| P1-D | Landing preview + full feed, kartu dan map | Public, CommunityPreview baru, kedua PostCard, Community, Map | Preview/daftar/peta memakai aturan data yang sama |
| P2 | Rapikan seluruh tombol/toolbar dan states | Reports/detail/profile/onboarding/error web/native | Komposisi, aksesibilitas, kinerja terukur |
| Rilis | Bukti, clean install, docs dan paket | tests/E2E, README/API/DB/OpenAPI/TESTING/PROGRESS/DELIVERABLES | Lulus sesuai platform yang benar-benar dijalankan |

Migrasi description/caption diterapkan sebelum client baru. Client baru harus menampilkan penjelasan publik dan versi kebijakannya; jangan menerbitkan kiriman client lama yang masih menjanjikan privat tanpa penanganan kompatibilitas. Server mencatat waktu/versi kebijakan pada pengiriman. Constraint downgrade tidak boleh diam-diam mengisi atau menghapus teks kosong; rollback harus menghentikan downgrade atau melakukan remediasi yang ditinjau. Snapshot model/split/evaluasi tidak diubah.

Perubahan lokal `mobile/tsconfig.json` yang sudah ada tetap dipertahankan dan tidak menjadi bagian implementasi ini.

## 11. Kriteria penerimaan dan tes penting

1. Menunggu/Diproses/Selesai published tampil pada preview/feed/map; Ditolak tidak tampil, termasuk parameter langsung dan URL detail lama.
2. Riwayat pemilik/admin tetap memuat Ditolak dan alasan. Hidden/withdrawn tidak diterbitkan kembali oleh perubahan status atau worker lama.
3. Dua laporan yang diaudit dapat diverifikasi satu per satu setelah publikasi yang disetujui; map cluster count bukan disalahartikan sebagai laporan hilang.
4. Create tanpa description, null, kosong dan whitespace berhasil;1–9karakter diterima;5001karakter/tipenya salah ditolak. Data tersimpan/response sesuai normalisasi.
5. Publish/Edit caption kosong berhasil. PATCH omitted mempertahankan deskripsi; explicit empty membersihkannya; stale revision tetap409.
6. Finalisasi retry dengan deskripsi kosong tidak membuat duplikasi. Model unavailable/lokasi invalid tetap menghalangi pengiriman seperti kontrak sekarang.
7. Komentar kosong dan alasan moderasi/penolakan kosong tetap ditolak.
8. Dropdown>3 tidak lagi menjadi deretan chip/radio. Pencarian wilayah dibatasi; ganti induk menghapus anak; Cancel/Reset/Apply dan Back/Forward URL benar.
9. Root sesi aktif menampilkan akun yang benar; header konsisten pada landing/feed/map/detail/admin. Lihat semua laporan mencapai daftar dan mempertahankan tujuan setelah login.
10. Tanpa login, landing/feed/detail/peta menampilkan foto turunan dan GPS presisi yang diizinkan. Email, ID akun/profil privat, original image, field pemilik dan state nonpublik tidak bocor melalui HTML/API/cache. Menulis tanpa login tetap401.
11. Tombol tetap dapat disentuh pada320/390/768/1024/1440px, zoom200%, teks panjang dan keyboard terbuka. Dialog dipakai melalui keyboard dan Escape; fokus kembali dengan benar.
12. Perubahan status menyingkirkan posting dari query komunitas berikutnya; stale client cache ditangani sesuai interval/focus yang didokumentasikan.
13. Refresh gagal/load-more gagal mempertahankan kartu yang ada. Signed URL expired, offline, sesi expired, publisher gagal dan foto gagal punya pemulihan yang jelas.
14. iOS/Android diverifikasi melalui simulator/perangkat untuk picker, gesture, kamera/galeri, GPS, font scaling dan safe area. Expo web tidak menggantikan bukti perangkat.
15. Ukur request/payload sebelum/sesudah; landing maksimal3posting, gambar responsive/lazy, peta hanya dimuat pada rute peta. Tidak mengklaim lebih cepat hanya dari tampilan.

Perintah saat implementasi, belum dijalankan untuk rencana ini:

```bash
npm run check
npm run build
npm --prefix mobile run export
node --experimental-strip-types --test shared/filters.test.ts
(cd backend-ml && .venv/bin/python scripts/test_local.py tests/test_workflow.py tests/test_community.py -q)
(cd backend-ml && .venv/bin/python scripts/test_browser.py)
npm --prefix web run e2e:auth
```

Tambahkan tes baru untuk optional description/visibility/navbar, audit axe layar yang berubah, serta migrasi pada database uji dan clone backup sebelum perubahan remote. Hasil sebelumnya tidak dihitung sebagai bukti implementasi rencana ini.

## 12. Batas tahap perencanaan

Hasil tahap ini adalah dokumen rencana dan diagnosis berbukti dengan dua keputusan akses sudah ditetapkan. Belum ada perubahan aplikasi, migrasi, publikasi dua laporan, endpoint anonim, deployment, maupun training baru. Langkah implementasi pertama: kerjakan kontrak publikasi publik serta slice P0-B/P0-C agar masalah data dan aturan tampilan selesai sebelum pemolesan visual.

## Penajaman setelah implementasi

Pengguna mengklarifikasi h1–h5 memakai tulisan tangan tebal seperti referensi, sedangkan paragraf/kontrol/teks kecil tetap Manrope. Caveat Bold lokal diterapkan pada web/native. Ditambahkan About, FAQ, Privasi, footer exact copy yang diminta, dua SVG grafis lokal dan variasi sage/cream/forest. Jakob’s Law diterapkan melalui navigasi desktop konvensional, menu HP, label Komunitas konsisten, dropdown akun dengan outside/Escape dismissal, accordion FAQ, kontrol native serta aksi foto/suka/komentar yang familiar. Tidak ada gesture wajib tersembunyi.
