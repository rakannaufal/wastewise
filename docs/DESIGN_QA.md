# WasteWise: design delivery gate

Catatan: laporan 2 November di bawah merupakan bukti historis. Gate penyempurnaan terbaru berada pada bagian terakhir; Manrope menggantikan font lama sesuai D-16.

Tanggal: 2 November 2026. Mode antislop: **during**, sesuai pilihan pengguna. Hasil: **PASS untuk web dan alur Expo web yang diuji**. Native iOS/Android baru melewati typecheck/ekspor; gate pemasangan dan interaksi perangkat tetap terbuka, bukan dinyatakan PASS.

Arah sebelum implementasi: PRODUCT.md dan DESIGN.md, ruang kerja daylight forest/sage, foto material nyata, alur foto/kategori/tindakan. ENERGY 2 / RHYTHM 2 / MOTION 1, variance 4. Bukti: source, screenshot pada evidence/, skenario Playwright pengguna/pengelola/Expo web, dan audit axe WCAG 2 A/AA serta 2.1 AA. Laporan ini bukan sertifikasi aksesibilitas seluruh platform.

## Hard gate

- R-02 PASS: scan source UI tidak menemukan em dash; salinan antarmuka memakai kalimat langsung.
- R-03 PASS: assertion scrollWidth pada viewport 390/1440 lulus; screenshot web-mobile.png dan expo-web-profile.png diperiksa, grafik berpadding dan kolom ditumpuk.
- R-17 PASS: metrik dashboard berasal dari /stats/summary; grafik baru muncul untuk total_reports > 0; tidak ada angka dampak rekaan.
- R-18 PASS: source tidak memuat testimonial, nama pelanggan atau foto profil fiktif.
- R-23 PASS: nama WasteWise diminta pengguna; wordmark teks, avatar berupa inisial pengguna, foto contoh berlabel dan dipetakan SOURCES.json; navigasi mengikuti fungsi blueprint.
- R-24 PASS: navigasi membuka route implementasi; Ringkasan/Laporan/Klasifikasi/Panduan/Pengguna diuji; lima tab Expo, Profil dan tautan profil dijalankan.
- R-25 PASS: axe tidak menemukan pelanggaran pada login, klasifikasi, formulir laporan, detail, dashboard kosong/berisi, dan panduan mobile web; warna angka langkah formulir diperbaiki dari rasio 4,44:1 menjadi muted yang mencapai AA.
- R-26 PASS: kontrol utama memiliki handler/href nyata; tes mengeksekusi autentikasi, foto, prediksi, simpan, pencarian/filter, role/status, dialog, delete, retry, logout; tombol pagination dibatasi menurut hasil API.
- R-27 PASS: smoke memeriksa dashboard kosong/filter kosong; admin test memeriksa offline/error/retry; komponen Loading/Failure/Empty dipakai sesuai permintaan data; panduan mobile menampilkan hasil pencarian kosong.
- R-28 PASS: tidak ada FAQ pengisi template.
- R-32 PASS: login via Enter dan dialog via Escape lulus; :focus-visible tersedia untuk kontrol web, dialog memulihkan fokus; skip link tersedia.
- R-33 PASS: fitur ditulis di source React/React Native dan CSS; tidak ada penggantian stylesheet/source oleh script runtime eksternal.
- R-34 PASS: satu tema terang dinyatakan di DESIGN.md dan app.json; tidak ada toggle tema yang mengarah ke mode belum dibuat.
- R-35 PASS: build web, ekspor mobile dan tiga skenario browser dijalankan; browser-tests.txt mencatat click-through alur, failure path; perangkat native dinyatakan belum diuji.
- R-36 PASS: tidak ada klaim sertifikasi, kecepatan atau keamanan absolut; privasi laporan diuji di API; confidence dijelaskan sebagai estimasi model.
- R-37 PASS: PRODUCT.md/DESIGN.md mendahului UI; dials dan komposisi dinyatakan eksplisit.
- R-38 PASS: foto contoh beratribusi; screenshot akun/laporan QA berlabel pengujian dan berasal dari request nyata, bukan seed aktivitas pelanggan.

## Purpose gate

- R-01 PASS: tidak ada gradient atau glow dekoratif; aksen hijau solid membedakan tindakan utama.
- R-04 PASS: kamera untuk input foto, clipboard untuk laporan, lokasi untuk koordinat, jam untuk antrean, check untuk selesai; label menyertai ikon. Alasan tertulis di DESIGN.md.
- R-06 PASS: Plus Jakarta Sans dipilih untuk identitas Indonesia dan keterbacaan; uppercase kecil hanya metadata; alasan tercatat DESIGN.md.
- R-07 PASS: tidak ada pola grid/noise/blueprint di latar.
- R-08 PASS: panah menunjukkan perpindahan task/panduan; submit/filter/hapus memakai verba langsung; DESIGN.md mencatat fungsi tersebut.
- R-09 PASS: capsule hanya status nyata dari server; tidak ada badge promosi di atas judul.
- R-10 PASS: tidak ada glassmorphism; backdrop dialog hanya memisahkan fokus.
- R-12 PASS: panel memakai border; elevasi untuk drawer/dialog yang mengambang; komposisi diperiksa pada screenshot.
- R-13 PASS: tidak ada glow pada kontrol, kartu atau latar.
- R-14 PASS: metrik ringkas, tabel laporan, callout foto, batang distribusi dan daftar panduan punya bentuk sesuai isi; kartu kategori seragam untuk perbandingan 12 material.
- R-19 PASS: motion terbatas pada feedback kontrol, spinner dan drawer; prefers-reduced-motion meniadakan transisi/animasi nonesensial.
- R-22 PASS: aset merupakan foto material dataset; tidak ada ilustrasi generik.

## Liveliness

- Dials PASS: ENERGY 2 / RHYTHM 2 / MOTION 1 tertulis di DESIGN.md.
- Consistency PASS: judul jelas, aksen terarah, ritme metrik/tabel/foto/grafik/daftar, gerak minimal sesuai dials; screenshot desktop dan mobile diperiksa.
- Focal point PASS: login menuju formulir, dashboard menuju laporan/klasifikasi, klasifikasi menuju foto/hasil, detail menuju material/status, profil menuju data akun.
- Whitespace PASS: grid, padding panel 24px dan jarak antarseksi memisahkan tugas; mobile memakai satu kolom.
- Accent PASS: forest green menandai tindakan utama, total dan selection; warna status hanya semantik dan selalu disertai teks.
- Identity PASS: foto material dipasangkan dengan langkah penanganan di klasifikasi/detail/panduan; wordmark dan kalimat pendek konsisten.
- Design Read PASS: arah operasional, konteks pengguna, taksonomi dan dials tercatat PRODUCT.md/DESIGN.md sebelum generasi.

## Craftsmanship dan consistency locks

- C-1 PASS: keputusan warna, font, struktur, motion dan aset memiliki alasan tertulis pada DESIGN.md/DECISIONS.md.
- C-2 PASS: handler/href nyata ditinjau; kontrol alur utama dijalankan pada tiga skenario browser; tidak ada tombol dekoratif kosong.
- C-3 PASS: tiap bagian mendukung laporan, pengenalan material, penanganan atau akun; tidak ada bagian pemasaran pengisi.
- C-4 PASS: breakpoint 390/1440, keyboard, request error/retry, offline, empty dan data nyata diuji pada cakupan web; native device tidak disertakan klaim ini.
- C-5 PASS: statistik, kategori dan confidence berasal dari API/model; tidak ada pelanggan atau dampak rekaan.
- R-05 PASS: dashboard berupa ruang kerja dengan antrean laporan dan foto material, bukan landing hero/pricing/testimonial.
- R-11 PASS: input 10px, panel 16px, dialog 20px; capsule terbatas status; tokens tercatat DESIGN.md.
- R-15 PASS: CTA spesifik, antara lain Buat laporan, Kenali material, Simpan laporan, Buka panduan dan Hapus laporan.
- R-16 PASS: tidak ada buzzword pemasaran; AI dipakai hanya menjelaskan asal estimasi dan keterbatasan.
- R-20 PASS: komposisi memakai 12 material, foto dataset, kategori yang dapat dikoreksi, lokasi dan tindakan penanganan; identitas terikat domain.
- R-21 PASS: tema terang sesuai ruang kerja daylight dan app.json; dark mode tidak menjadi kebutuhan pengguna.
- R-29 PASS: forest/sage, tinta/netral dan warna status semantik; alasan dan token tercatat DESIGN.md.
- R-30 PASS: komposisi diperiksa pada screenshot; bukan penyalinan visual produk referensi tertentu.
- R-31 PASS: alasan setiap keputusan utama tersedia dalam satu paragraf atau kalimat pada DESIGN.md.

## Bukti dan batas

`evidence/browser-tests.txt`: tiga skenario lulus. `evidence/web-smoke-final.txt`: audit tambahan setelah padding grafik/kontras diperbaiki. `evidence/accessibility-*.json`: daftar pelanggaran kosong pada layar yang diuji. Screenshot menunjukkan laporan QA temporer, bukan aktivitas pengguna produksi. Kamera native, izin OS, perangkat nyata, pengujian pembaca layar manual, serta cakupan semua ukuran/font sistem belum diverifikasi; lihat TESTING.md dan PROGRESS.md.

## Gate penyempurnaan, 3 November 2026

Cakupan: navigasi pengguna/admin, beranda/kartu komunitas, filter, profil web, riwayat dan peta mobile, tipografi bersama. Antislop during dan Impeccable mengikuti arah yang sudah tersedia; ENERGY2/RHYTHM2/MOTION1 dipertahankan. Bukti: `refinement-web-feed*.png`, `refinement-mobile-*.png`, log browser/check/build/export serta TESTING.md. PASS berlaku pada web/Expo web yang dijalankan; pemasangan iOS/Android tetap terbuka.

- Hard Gate PASS: foto dari laporan QA yang benar-benar dikirim; tanpa aktivitas/testimonial/angka dampak palsu. Sidebar pengguna tidak ada; seluruh route navigasi tersedia. Screenshot, assertion overflow320–1440px, Manrope dan audit axe pada layar dalam suite memeriksa layout/kontras. Filter punya label, draft, Cancel/Reset/Apply; empty/loading/error/retry nyata. Alur galeri, ML/GPS mock, suka, komentar, admin dan delete dijalankan.
- Purpose Gate PASS: hijau forest meneruskan identitas; ikon filter menyembunyikan kepadatan kontrol, kamera menonjolkan tugas utama, marker menunjukkan lokasi nyata. Kartu4:3 mengutamakan foto laporan; dua kolom desktop menjaga urutan kronologis. Manrope dipakai karena tersedia di kedua platform dan diminta konsisten; alasan warna/layout/font/spacing/kartu tercatat DESIGN.md dan rencana.
- Liveliness PASS: foto menjadi fokus Beranda; ruang memisahkan toolbar dan posting; aksen hanya tindakan/selection, status berteks; material/kategori/lokasi mengikat identitas WasteWise. Tidak menambah animasi dekoratif atau section pengisi; dials sesuai arah sebelum implementasi.
- Craftsmanship dan consistency locks PASS: komponen kartu/filter dipakai kembali, profil memiliki route nyata, riwayat kosong tanpa pagination palsu. Default tanpa status dibuktikan melalui pengujian empat status; laporan privat tetap terisolasi. Perbaikan worker diuji pada development dan bundle production. Source, build, typecheck/lint, screenshot dan hasil terukur disediakan; batas native/perangkat dinyatakan secara eksplisit.

Batas: bukan sertifikasi semua layar/teknologi bantu; belum menguji perangkat fisik, font sistem ekstrem atau distribusi toko. Warning chunk MapLibre besar tetap dicatat. Tidak ada klaim benchmark HP atau produksi dari pemeriksaan ini.


## Gate publikasi dan Jakob’s Law, 3 November 2026

Mengikuti pilihan antislop during sebelumnya. Pola yang familier dipakai untuk mengurangi kebutuhan belajar: logo menuju Beranda, urutan navigasi bersama, label Komunitas konsisten, menu hamburger pada HP, akun berupa dropdown, Escape/outside-click menutup menu, FAQ accordion native, filter dengan Terapkan/Reset/Tutup. Kamera tetap tindakan utama. Sidebar operasional hanya admin. Ini penerapan prinsip desain; belum merupakan hasil studi usability pengguna.

Identitas: Caveat Bold untuk h1–h5/judul mobile sesuai referensi; Manrope untuk paragraf, label dan kontrol. Ilustrasi SVG catatan/pensil dan material dibuat lokal sesuai permintaan, latar sage About, cream FAQ, forest footer, putih pada kartu foto. Tidak mengklaim raster hasil image generation. Footer mempertahankan teks Khay Brownies persis sesuai permintaan pengguna.

Gate PASS terbatas pada source dan pengujian browser: route nyata, navigasi keyboard, overflow/axe pada viewport dalam suite, foto laporan QA nyata, caption opsional, CTA spesifik dan status berlabel. Bukti `public-policy-landing-*.png`, `community-landing-*.png`, log `public-policy-browser.txt`. Tidak ada statistik dampak/testimonial rekaan. Foto, kategori dan GPS berasal dari API; kategori tidak diketik pengguna. Batas perangkat fisik dan chunk peta tetap berlaku.


## Professional social refinement, 3 November 2026

User explicitly replaces handwriting with Manrope throughout web/native. WasteWise header on native tabs, familiar bottom navigation retained. Back/edit/delete controls have44px targets and accessible labels; destructive confirmation remains explicit. Comment composer uses compact inline layout, author avatar/body/date rows and labelled delete icon, preserving pending/error handling. UI does not add inactive repost/bookmark controls from the reference. Startup logo uses the existing brand asset; native splash configuration is not proof of standalone behavior.

Purpose: reduce repetitive buttons and establish a consistent reading hierarchy, with actual report photos/category/location as the focus. Public eligibility and privacy contracts unchanged. Desktop/mobile screenshot inspection found a CSS specificity conflict on the composer and a stretched back link; both corrected. Screenshot capture resets scroll/focus to avoid sticky-header capture artifacts. Native physical accessibility/splash remains unverified; automated browser checks are scoped evidence.


## Card menu and replies, 3 November 2026

Antislop during and Impeccable craft floor applied to the existing Manrope/green identity. Card header contains three-dot disclosure; owner edit/withdraw and report actions stay anchored inside the card. No new decorative controls. Likes use red #C62546, immediate count and a short scale animation; reduced motion disables animation. Replies indent one level, lazy-load30 rows, keep labelled delete controls and44px reply targets. Web Escape/outside dismissal and native explicit close are available. Ownership and root/reply deletion remain server-enforced. Expo web is browser evidence; physical device frame rate, VoiceOver/TalkBack and native keyboard remain unverified.
