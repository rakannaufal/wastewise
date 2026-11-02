# Dataset Garbage Classification

Sumber dikonfirmasi langsung pengguna: [Mostafa Abla, Kaggle](https://www.kaggle.com/datasets/mostafaabla/garbage-classification). Metadata API Kaggle diambil 2026-11-02 dan disimpan di `backend-ml/dataset/source-metadata.json`. LicenseName: **Database: Open Database, Contents: © Original Authors**. Ini bukan CC0; hak isi gambar tetap pada pemilik asli. Baca THIRD_PARTY_NOTICES sebelum distribusi publik.

Folder lokal berisi **15.515 JPG**, 12 kategori, tanpa gambar gagal decode. Angka ini hasil audit file pengguna, bukan salinan asumsi jumlah pada halaman Kaggle. Dataset asli dipertahankan di `garbage_classification/`. File sumber tidak ditulis ulang.

| ID kategori | Nama UI | Asli | Train | Validation | Test |
| --- | --- | --- | --- | --- | --- |
| battery | Baterai | 945 | 659 | 142 | 141 |
| biological | Organik | 985 | 689 | 148 | 148 |
| brown-glass | Kaca cokelat | 607 | 418 | 90 | 90 |
| cardboard | Karton | 891 | 622 | 134 | 134 |
| clothes | Pakaian | 5325 | 3726 | 799 | 799 |
| green-glass | Kaca hijau | 629 | 422 | 91 | 91 |
| metal | Logam | 769 | 534 | 115 | 115 |
| paper | Kertas | 1050 | 734 | 158 | 158 |
| plastic | Plastik | 865 | 599 | 129 | 129 |
| shoes | Sepatu | 1977 | 1383 | 297 | 297 |
| trash | Residu | 697 | 472 | 102 | 101 |
| white-glass | Kaca bening | 775 | 535 | 115 | 115 |
| **Total** | | **15515** | **10793** | **2320** | **2318** |

## Audit dan split

SHA256 file asli dan pHash64 dihitung setelah decode/orientasi/RGB. BK-tree mencari jarak Hamming <=4, kemudian union-find membentuk komponen transitif. Kelompok lintas label (68 gambar) dikeluarkan agar label ambigu tidak merusak evaluasi. Duplikat SHA persis (16 gambar tambahan) disisihkan; varian serupa dengan hash berbeda boleh tetap ada tetapi seluruh kelompok berada di split sama.

Alokasi per kategori menargetkan70/15/15 seed42 dengan grup utuh; pembulatan menghasilkan train10793, validation2320, test2318. Augmentasi hanya train. Tidak ada hash exact atau group ID yang melintasi split, dibuktikan tes integritas manifest. Ini bukan pembuktian bebas kemiripan semantik atau independensi subjek di seluruh dataset.

Setiap row JSONL berisi path relatif ke garbage_classification, category, SHA256, pHash, width, height, group. Tidak perlu menyalin gambar menjadi tiga folder. `ml.train.Images` membaca manifest dan file asli; archive dataset menyertakan keduanya.

Dataset fingerprint SHA256: `5a9d11cba6505a7c727a29cb9d374a5e0e7a8c26712cfdf9db448ea8d9f1cc5f`.

Train: `8976a9c98b37a2d8778a870c65188c930870a39021fd84564935c6d629966908`.

Validation: `d5681ff950614b90ac0e05ee4cdeb1be933503a26b4869f78a5e7d47043801c4`.

Test: `b2042dc8c146c703d679f47d370787e59de3d65018d3e5950ceef8cb6b864aa7`.

## Keterbatasan

Pakaian dan sepatu mendominasi jumlah gambar. Satu label per foto; objek campuran, limbah kotor, pencahayaan lapangan dan bahan di luar12 kategori tidak direpresentasikan secara lengkap. pHash dapat melewatkan kemiripan akibat crop/rotasi besar; provenance tiap pengambilan gambar tidak tersedia. Sumber Kaggle dikonfirmasi pengguna, tetapi kesetaraan seluruh bytes dengan unduhan versi publik belum dibuktikan.

Contoh foto UI berasal dari dataset dengan mapping file di `web/public/materials/SOURCES.json`. Arsip lokal adalah salinan handoff dataset pengguna, bukan lisensi ulang terhadap seluruh isi gambar.
