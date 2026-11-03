# WasteWise — paket prompt dan spesifikasi aset

Status: **prompt/rencana produksi, belum menghasilkan gambar atau logo final**. Pendamping: [rencana](COMMUNITY_REDESIGN_PLAN.md), [layar](SCREEN_MATRIX.md).

## 1. Sistem visual dan penggunaan

Mengikuti screenshot Bantuin yang diberikan: ilustrasi tinta sederhana, bentuk terbaca, sorotan warna datar, ruang kosong. Warna diadaptasi menjadi hijau WasteWise. Teks UI ditulis oleh web/native menggunakan Manrope; jangan memasukkan heading, tombol, kode error atau label ke gambar.

Prompt generatif ditulis dalam bahasa Inggris agar dapat langsung dipakai pada generator; copy antarmuka tetap Indonesia. Untuk ilustrasi, gabungkan **BASE + satu VARIANT + NEGATIVE**. Buat satu hero/onboarding sebagai acuan visual, setujui konsistensinya, lalu gunakan sebagai image reference untuk varian lain. Jangan menghasilkan seluruh batch dengan gaya yang berbeda-beda.

### BASE — semua ilustrasi

```text
Create an original editorial illustration for WasteWise, an Indonesian community waste reporting and image classification app. Warm, thoughtful hand-ink drawing, clean dark forest-green contours (#17281F), restrained flat forest green (#215B3C), pale sage (#E4EFE5), and small lime-paper accents (#D8EB96). Airy composition, a few purposeful objects, coherent line weight, tactile but clean, gentle asymmetry, clear silhouette at small mobile sizes. Friendly and contemporary, with environmental details drawn from everyday Indonesian neighborhoods. No embedded interface text. Background transparent where supported; otherwise a uniform warm off-white (#F5F7F4) that can be cleanly removed. Draw the subject described below. Keep all important details inside the central 80 percent, with generous empty space around it.
```

### NEGATIVE — semua ilustrasi

```text
No words, letters, numbers, watermarks, QR codes, product logos, fake UI text, photorealistic faces, recognizable people, license plates, exact addresses, political symbols, stock recycling-arrow emblems, generic leaf globe, glossy 3D, neon, glass effects, heavy gradients, excessive grain, dense patterns, tiny decorative icons, or cluttered collage. Do not fabricate a real location map or an official administrative boundary.
```

Kontur harus tetap terbaca pada lebar240px; jangan bergantung pada goresan sangat tipis. Jangan menambahkan tulisan dengan generator lalu mencoba memperbaikinya berulang. Transparansi/hasil raster perlu diperiksa; ekstensi PNG tidak otomatis berarti alpha benar.

## 2. Logo simbol, wordmark, app icon

Logo adalah pengecualian gaya: geometri lebih presisi agar berfungsi di ukuran kecil. Prompt menghasilkan **konsep**, bukan pengganti master vektor. Logo final digambar ulang sebagai SVG bersih, diuji monokrom16/24/32px, serta diekspor PNG/ikon platform. Tidak menyalin logo Bantuin atau screenshot navbar.

### B01 — logo simbol

File final: `brand/wastewise-symbol.svg`; konsep1024×1024; latar transparan; P0.

```text
Design an original minimal vector-style symbol for WasteWise. Form a confident capital W from two interlocking folded material strips, suggesting careful sorting and a second life for everyday materials. One strong recognizable silhouette, an intentional small negative-space opening, balanced proportions, no fine details. Forest green #215B3C on transparent background. It must remain recognizable as a solid one-color app mark at 16 pixels. Show one isolated symbol only, centered with generous clear space. No wordmark, no letters outside the symbol, no leaf, no globe, no recycling arrows, no camera clip art, no gradient, no shadow, no mockup.
```

QA: tidak terbaca sebagai merek lain; lubang/strip tidak runtuh di16px; varian putih berfungsi pada hijau. Pemeriksaan kemiripan merek dilakukan sebelum publikasi; tidak menjanjikan perlindungan merek dari hasil generator.

### B02 — logo teks / wordmark

Final: `brand/wastewise-wordmark.svg`; ekspor lebar1200×240; P0.

```text
Explore a clean typographic wordmark reading exactly "WasteWise" with this exact capitalization. Use the visual character of Manrope SemiBold: open counters, readable proportions, calm and contemporary. Introduce one subtle custom joining detail in the W forms that echoes folded material, without reducing legibility. Forest green #215B3C, one horizontal wordmark, transparent background, ample whitespace. No icon, no tagline, no punctuation, no extra text, no cursive lettering, no gradient, no presentation mockup. Prioritize exact spelling and optical spacing.
```

Produksi: ketik `WasteWise` dengan font berlisensi dan kerning manual, bukan memakai piksel ejaan AI. Simpan versi editable/font serta outlined SVG. Seluruh teks halaman dan logo teks memakai Manrope sesuai keputusan D-16.

### B03 — lockup simbol + teks

Gunakan master B01+B02, **bukan generate logo baru**. Susunan horizontal untuk navbar, stacked untuk splash. Minimum clear space satu lebar strip simbol; jangan memaksa wordmark ke dalam ikon aplikasi. Varian hijau, putih, monokrom. Ukuran referensi1600×400 dan1024×1024.

### B04 — app icon dan splash

```text
Create a flat app-icon composition using the supplied approved WasteWise symbol exactly as given, without redrawing or changing its geometry. Deep forest-green square background #215B3C, approved symbol in warm off-white #F5F7F4, generous central safe area, strong contrast, no text, no badge, no shadow, no decorative objects. Use a full square canvas; platform tooling will apply the icon mask.
```

Final1024×1024opaque; Android adaptive foreground/background terpisah; iOS mengikuti spesifikasi asset terbaru. Splash dirakit dari logo, bukan menambahkan ilustrasi berat. Konfigurasi dark/tinted icon hanya bila didukung build yang dipakai.

## 3. Landing dan autentikasi

| ID | File tujuan | Ukuran/rasio sumber | Prioritas |
| --- | --- | --- | --- |
| L01 | `landing/hero-neighborhood.png` | 1536×1024,3:2 | P0 |
| L02 | `landing/step-photo.png` | 1024×1024 | P0 |
| L03 | `landing/step-classify.png` | 1024×1024 | P0 |
| L04 | `landing/step-community.png` | 1024×1024 | P0 |
| L05 | `landing/community-strip.png` | 1536×768,2:1 | P1 |
| L06 | `auth/welcome.png` | 1024×1280,4:5 | P1 |

**L01 — hero**

```text
A hand holding a simple smartphone pointed toward one discarded plastic bottle beside a small neighborhood walkway. Nearby, a folded sheet and a small sorting container suggest the next useful action. A single location pin and a subtle connected path imply community reporting, without drawing a literal map. Include a low boundary wall and one small tropical plant as Indonesian neighborhood context. Composition weighted to the right, left third almost empty for HTML headline placement. No phone screen text, no simulated prediction percentages, no people’s faces. An inviting, practical scene about noticing and acting, not a fantasy perfectly clean city.
```

**L02 — langkah foto**

```text
A close editorial vignette of a smartphone framing one empty plastic bottle on a plain surface. Four simple framing corners make the action immediately clear. One hand enters from the lower edge, no identifiable person. Large central objects, generous margins, no words or fake UI.
```

**L03 — langkah kategori/GPS**

```text
A recognizable paper carton in the foreground, a small picture card behind it, a simple location pin and a neat stack of three material cards. Communicate recognizing one material and locating it without arrows everywhere or floating dashboards. Clear calm arrangement, no labels, no confidence numbers, no actual map.
```

**L04 — langkah komunitas**

```text
Three simple photo sheets arranged as a small shared neighborhood noticeboard, each showing one material object. One small heart outline and one speech-bubble shape imply support and conversation. A location pin anchors the board to a short neighborhood path. No text, no portraits, no invented impact statistics.
```

**L05 — strip penutup**

```text
An airy horizontal neighborhood walkway with three separated vignettes: noticing a discarded item, recording a picture, and a sorting container beside a community noticeboard. Low-rise Indonesian residential details, modest scale, no sweeping smart-city skyline. Keep a continuous low horizon and the upper half mostly empty. No identifiable people or claims of city-wide cleanup.
```

**L06 — auth bersama**

```text
A quiet vertical still life with a folded paper sheet, an empty bottle, a reusable sorting basket and one small location pin. The objects sit together like a welcoming editorial illustration, weighted toward the lower half with open space above. No forms, no padlocks as the main subject, no text. Calm enough to sit beside login, registration, password reset and email confirmation screens.
```

Pratinjau produk landing memakai screenshot implementasi atau mockup yang diberi label contoh. **Jangan menghasilkan feed palsu berisi foto masyarakat, koordinat atau angka dampak.**

## 4. Onboarding

Sumber1024×1024; ekspor mobile sekitar720px dan web responsif. Ketiga aset harus satu set. Copy/indikator1/3 tetap native/HTML.

### OB01 — `onboarding/capture.png`

```text
A simple smartphone above one cardboard carton and one bottle, with the bottle clearly isolated inside a small camera frame. A subtle picture-sheet shape beside the phone suggests a gallery alternative. Welcoming, easy for a first-time user to understand in one glance, no camera permission dialog, no words.
```

### OB02 — `onboarding/recognize-locate.png`

```text
One photo sheet containing a paper carton, a small material card echoing that shape, and one location pin connected by a single short line. Illustrate the relationship between photo, material recognition and location. Avoid a magical robot or all-knowing AI face. Keep the composition simple and leave room around every object.
```

### OB03 — `onboarding/share-with-care.png`

```text
A community photo card resting beside a map pin and a small open privacy gate, with one heart shape and one comment bubble. The gate suggests deliberate sharing with a known community, not publishing to the whole world. One clean central arrangement, no globe, no real map, no personal identifiers, no text.
```

## 5. Empty states dan edukasi

Sumber1024×768, ekspor lebar480–720px. Aset kecil; jangan mengambil ruang utama pada layar kerja.

**S01 — `states/feed-empty.png`**

```text
A small neighborhood noticeboard with one blank photo sheet waiting to be pinned, and a simple phone resting nearby. The scene feels ready for the first useful report rather than abandoned. Compact central silhouette, plenty of empty background, no words or numbers.
```

**S02 — `states/no-location-results.png`**

```text
A simple magnifying glass beside one folded map sheet and one location pin, the sheet carrying only a few abstract paths with no real geographical boundaries. Suggest trying a different search area, not a missing or dangerous neighborhood. Compact, calm, no text.
```

**S03 — `states/reports-empty.png`**

```text
A tidy empty photo tray with one blank report sheet and a small camera-frame shape beside it. Convey that a personal report history starts with one photo. No stacks of completed reports, no success trophy, no text.
```

**S04 — `states/queue-clear.png`**

```text
An orderly sorting tray and one neatly folded sheet on a clear work surface, with a small balanced check-shaped object resting beside them. Convey no pending tasks in this queue, without implying that all waste in a city has disappeared. Restrained and compact, no numbers or text.
```

**S05 — `guide/sort-overview.png`**

```text
An editorial still life of a paper carton, a plastic bottle, a clear glass jar, a metal can and a fruit peel separated into visibly distinct small groups on a simple work surface. Every material remains recognizable. Calm instructional composition, no universal disposal color code, no hazardous handling instructions, no text.
```

Komentar kosong cukup copy dan ikon kecil. Loading skeleton, tombol kamera, like, comment, marker dan lokasi memakai ikon/komponen nyata; **bukan gambar hasil generator**. Profil default memakai avatar netral geometris atau inisial nama pengguna sebagai UI; jangan menghasilkan potret orang yang tidak nyata seolah pemilik akun.

## 6. Dua belas kategori panduan

Gunakan BASE+NEGATIVE dengan tambahan style berikut, lalu satu subject dari tabel. Satu objek per gambar; sumber768×768; final320–480px.

```text
A single isolated material study for a waste sorting guide. Front three-quarter view, clear recognizable silhouette, centered composition, consistent object scale and ink treatment across a set of twelve. Keep the actual material color where it is essential to distinguish green, brown and clear glass; green brand accents remain secondary. No instruction text, no category labels, no symbols printed on the object.
```

| ID/file | SUBJECT yang ditambahkan |
| --- | --- |
| `guide/battery.png` | `One intact used household cylindrical battery, simple metal ends, neutral unbranded casing, no leakage or damage.` |
| `guide/biological.png` | `One banana peel with a small dry vegetable leaf, clearly organic household food residue, clean and non-graphic.` |
| `guide/brown-glass.png` | `One empty brown amber glass bottle, transparent amber body, no label, no cap.` |
| `guide/cardboard.png` | `One small flattened corrugated cardboard carton, visible folded edge, no branding or tape text.` |
| `guide/clothes.png` | `One folded worn cotton T-shirt, soft fabric folds, simple unbranded garment.` |
| `guide/green-glass.png` | `One empty green glass bottle, visibly translucent green material, no label, no cap.` |
| `guide/metal.png` | `One empty aluminum beverage can with a small dent, silver-gray material, unbranded.` |
| `guide/paper.png` | `Three lightly crumpled plain paper sheets, distinct from thick cardboard, no printing.` |
| `guide/plastic.png` | `One empty transparent PET bottle with a detached small cap beside it, no label.` |
| `guide/shoes.png` | `One pair of worn simple sneakers, no recognizable brand, fabric uppers and rubber soles.` |
| `guide/trash.png` | `One small crumpled mixed-material snack wrapper and a used tissue, ordinary non-hazardous residual household trash, no branding, no medical waste.` |
| `guide/white-glass.png` | `One empty colorless transparent glass jar, visibly clear glass rather than white paint or ceramic, no label or lid.` |

Ilustrasi panduan tidak menambah/mengganti dataset ML, tidak dipakai menghitung evaluasi dan tidak dianggap contoh report nyata. Aturan pengumpulan setempat tetap mengikuti panduan teks; warna ilustrasi bukan janji fasilitas daur ulang menerima semua material.

## 7. Error 4xx/5xx: delapan keluarga aset

Sumber1024×768; final480–640px. Semua memakai BASE/NEGATIVE; kode error dan CTA dirender sebagai teks UI.

| ID/file | Status utama |
| --- | --- |
| E01 `errors/input.png` | 400,405,413,415,422 |
| E02 `errors/access.png` | 401,403 |
| E03 `errors/not-found.png` | 404,410 |
| E04 `errors/conflict.png` | 409 |
| E05 `errors/slow-down.png` | 429 |
| E06 `errors/server.png` | 500,501,5xx umum |
| E07 `errors/maintenance.png` | 503 yang diketahui pemeliharaan |
| E08 `errors/connection.png` | 408,502,504,offline/tile failure; copy membedakan sebab |

**E01 — input**

```text
A photo sheet placed beside a simple rectangular frame, with one corner not yet aligned and a small pencil resting nearby. The mismatch is easy to correct, not catastrophic. An encouraging visual about adjusting an input or choosing a suitable picture. No warning triangle, no words, no numbers.
```

**E02 — akses/sesi**

```text
A small closed neighborhood gate with a clear simple key shape resting outside it and a short welcoming path. Communicate that access needs the right permission, not that the user is being punished. No security camera, police imagery, chains, people, text or numbers.
```

**E03 — tidak ditemukan**

```text
A single location pin resting beside an unfolded abstract path sheet whose path ends gently before the expected spot. A small magnifying glass sits nearby. Communicate something cannot currently be found, without a dramatic lost traveler. No real map, no country outline, no text or numbers.
```

**E04 — konflik/perubahan**

```text
Two nearly identical report sheets offset beside a small folded material sample, with one simple curved return mark indicating that the latest sheet should be checked. The composition suggests a version mismatch, not duplicate rubbish. No actual letters, checklists, code, numbers or interface.
```

**E05 — terlalu banyak permintaan**

```text
A modest hourglass resting beside a neatly stacked set of small photo sheets. Two calm horizontal strokes suggest a brief pause. Friendly and patient, no racing clock, no alarm, no suggestion of permanent lockout, no text or numbers.
```

**E06 — gangguan server**

```text
A small sorting workbench with one loose connecting piece and a simple repair tool placed neatly beside it. The objects remain upright and safe. Suggest a fixable technical interruption without smoke, explosions, angry robots or piles of pollution. No text or numbers.
```

**E07 — pemeliharaan**

```text
A small sorting station temporarily resting under a tidy repair cover, with one simple tool and one carefully folded sheet beside it. Deliberate care and a short pause, not abandonment. Clear silhouette, restrained details, no construction warning text, no numbers.
```

**E08 — koneksi**

```text
A smartphone and a location pin separated by a single gently interrupted connecting line, with an abstract folded path sheet below. Suggest reconnecting to continue while the saved work remains safe. No Wi-Fi error text, no cloud logos, no fake real-world map, no numbers.
```

State body/form tidak harus menampilkan ilustrasi besar. Contoh413 di composer cukup validasi dekat foto; E01 hanya ketika layout memerlukan empty/error regional. Tidak membuat halaman penuh untuk setiap kegagalan kecil.

## 8. Peta, social preview dan pemakaian screenshot

- Marker peta, cluster, ikon status dan ikon kamera dibuat sebagai komponen/SVG asli; tidak menggunakan bitmap AI pada ratusan pin.
- Basemap memakai penyedia tiles nyata dengan atribusi; ilustrasi E03/S02 tidak boleh ditampilkan sebagai peta geografis sungguhan.
- Open Graph1200×630 dirakit dari master logo, Manrope headline dan ilustrasi L01. Prompt opsional untuk latar saja:

```text
A very spacious wide editorial composition for WasteWise, with a folded paper carton, one unbranded empty bottle and a small location pin grouped in the right third. The left two-thirds remain nearly empty warm off-white for real typography added later. Forest-green ink and pale sage accents, coherent with the supplied approved WasteWise illustration reference. No words, no UI, no real map, no logo.
```

- Preview posting/hasil ML untuk landing diambil dari staging menggunakan data contoh yang dimiliki/diberi izin, tanpa sesi atau koordinat pribadi; beri label ilustrasi produk.

## 9. Struktur folder dan manifest

```text
assets/wastewise/
  brand/             # SVG master, icon sources, lockups
  landing/           # L01-L05
  auth/              # L06
  onboarding/        # OB01-OB03
  states/            # S01-S04
  guide/             # S05 + 12 material studies
  errors/            # E01-E08
  social/            # Open Graph assembled from approved elements
  sources/           # Editable originals and approved references
  manifest.json      # Asset ownership, provenance and export information
```

Manifest mencatat ID, prompt/version/model bila dihasilkan, pemilik sumber, izin referensi, lisensi/font, tanggal, checksum, ukuran/ratio, alt atau decorative, halaman tujuan, status approved dan varian ekspor. Referensi screenshot bersifat arah visual; tidak mengekstrak atau mengakui ilustrasi milik produk lain sebagai aset WasteWise.

Build menghasilkan `web/public/assets/wastewise/` dan `mobile/assets/wastewise/` dari sumber terpilih. Hindari impor seluruh manifest sebagai require seluruh raster ke bundle awal. Aset native yang harus tersedia offline di-bundle secara eksplisit. File sumber resolusi penuh tidak diunduh oleh setiap client.

## 10. Quality gate dan urutan produksi

1. Setujui logo B01/B02 dan satu ilustrasi hero+onboarding sebagai acuan visual. Bandingkan terhadap reference screenshot, siluet kecil dan palet.
2. Turunkan aset lain dari acuan yang sama. Periksa kesalahan objek/material, transparansi, kontur, warna kaca dan wajah/alamat tidak sengaja.
3. Master vektor logo: SVG bersih, monokrom, putih, favicon16/32 dan icon platform. Generator raster tidak dianggap menghasilkan SVG produksi.
4. Ekspor web WebP/AVIF atau PNG alpha sesuai dukungan; native PNG/WebP yang terbukti pada iOS/Android target. Tetapkan rasio untuk mencegah layout shift.
5. Anggaran awal: hero≤200KB, onboarding/error40–100KB peraset, category guide≤30KB peritem. Pilih kompromi visual setelah melihat hasil kompresi; jangan merusak kontur demi angka.
6. Aset dekoratif web alt kosong/aria-hidden; ilustrasi bermakna mendapat alt singkat. Judul/error tetap tersedia saat gambar gagal, offline atau pembaca layar.
7. Uji asset crop/safe area pada320px dan tablet, layar retina, font besar dan tema terang. Jangan menutupi pesan error/CTA dengan ilustrasi.
8. Catat aset yang disetujui di manifest. Gambar belum dihasilkan pada tahap rencana ini; jangan menggunakan path di atas seolah sudah berisi file.
