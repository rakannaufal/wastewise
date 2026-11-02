# Model card: WasteWise MobileNetV2 v1

Model: `wastewise-mobilenetv2-v1`. Architecture: MobileNetV2 ImageNet pretrained backbone, average pooling1280, dropout0,25, linear12. Final training memakai backbone beku; classifier AdamW30epoch. Framework Torch2.15.0. Seed42. Bahasa UI Indonesia; ID tensor mengikuti12 nama folder asli.

## Penggunaan yang dimaksud

Membantu pengguna memperkirakan satu kategori material dari foto satu objek dan membaca panduan umum. Pengguna dapat mengoreksi kategori laporan; server menyimpan prediksi asli terpisah untuk transparansi. Bukan keputusan otomatis keselamatan, pengenalan bahan kimia, deteksi semua objek, atau pengganti aturan fasilitas setempat.

## Data dan evaluasi

15.515 gambar asli Kaggle Garbage Classification (sumber dikonfirmasi pengguna), 68 konflik-label dikeluarkan dan16 exact duplicate disisihkan. Split grup70/15/15, pHash Hamming<=4 transitif, seed42. Validation menentukan checkpoint; test frozen2318 gambar. Test accuracy0.958585, macro F10.940986; kedua gate lulus. Detail per kelas di EVALUATION.md.

## Preprocessing

RGB, resize short side256, center crop224, tensor dan normalisasi mean[0.485, 0.456, 0.406], std[0.229, 0.224, 0.225]. Serving menerapkan sanitasi upload RGB JPEG sisi maksimal2048 sebelum preprocess yang sama. Hasil test menggunakan file dataset langsung; benchmark end-to-end upload mempunyai kompresi tambahan dan perlu holdout lapangan sendiri.

## Risiko dan keterbatasan

Imbalance kelas, latar studio/produk, provenance sesi foto tidak diketahui, kemungkinan duplikat semantik yang lolos pHash, bukan model open-set. Confidence tidak dikalibrasi. Gambar kotor, campuran, crop buruk, low-light, objek asing dan label berbahaya dapat keliru. Instruksi baterai/B3 tetap konservatif; verifikasi manual wajib untuk keputusan penanganan.

## Artefak dan integritas

Checkpoint: `backend-ml/ml/models/wastewise-v1.pth` (lokal/arsip, diabaikan Git). Metadata dan mapping disimpan bersama. SHA256: `dbc357905538c29e82f40119b58d73c4e69405a07a10840543ebda1aee09a88d`. Dataset fingerprint `5a9d11cba6505a7c727a29cb9d374a5e0e7a8c26712cfdf9db448ea8d9f1cc5f`. Loader weights_only, mapping/preprocess validation, strict state_dict. Tidak ada random inference fallback. Missing model: predict503, readiness degraded200 jika DB/storage siap, laporan manual tetap tersedia.

## Lisensi dan distribusi

Hak dataset: Database Open Database, Contents Copyright Original Authors menurut metadata Kaggle. Bobot dasar mengikuti torchvision/upstream. Tidak ada klaim bahwa seluruh foto atau model boleh dilisensikan ulang bebas. Periksa THIRD_PARTY_NOTICES sebelum distribusi publik. Model belum dideploy remote; hasil di atas pengujian lokal2026-11-02.
