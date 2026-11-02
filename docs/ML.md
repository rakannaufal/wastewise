# Pipeline Machine Learning

## Source

- `ml/common.py`: urutan kelas, preprocess, factory MobileNetV2, loader checkpoint.
- `ml/prepare.py`: decode/audit, SHA256, pHash/BK-tree, konflik-label, grouping dan split.
- `ml/train.py`: ekstraksi fitur train/validation, classifier training dan opsi fine tuning.
- `ml/evaluate.py`: membuka test checkpoint beku, menghitung metrik, confusion matrix, kurva dan prediksi per gambar.
- `app/inference.py`: inference CPU terkontrol, berbagi factory dan preprocessing dengan training.

## Model akhir

Backbone MobileNetV2 bobot ImageNet resmi, fitur global average pooling 1280, dropout0,25 dan Linear(1280,12). Backbone akhir tidak di-fine-tune. Classifier dilatih AdamW lr0,002, weight_decay0,01 selama 30 epoch, batch fitur256. CrossEntropy memakai label smoothing0,05 dan bobot akar inverse frekuensi kelas. Seed42 untuk Python, NumPy dan Torch.

Train memakai fitur satu view deterministik dan satu view augmentasi RandomResizedCrop224 scale0,75..1,0, horizontal flip dan ColorJitter ringan. Validation/test hanya Resize256, CenterCrop224, ToTensor dan normalisasi ImageNet mean/std. Augmentasi tidak diterapkan ke validation/test. Cache fitur berada di outputs/features dan tidak masuk Git/arsip source.

Pilihan checkpoint: validation macro F1 terbaik. Test tidak dilihat dalam training. Final checkpoint menyimpan state_dict, classes, class_to_idx, preprocess, architecture/version, seed, dataset/split fingerprint dan torch_version. Metadata JSON mencatat SHA256 bobot.

## Reproduksi

```bash
cd backend-ml
.venv/bin/python -m ml.prepare
.venv/bin/python -m ml.train --epochs 30 --finetune 0 --batch-size 16
.venv/bin/python -m ml.evaluate
```

Training pada MPS, serving CPU. Perbedaan backend/hardware dan urutan konsumsi RNG saat cache digunakan dapat menghasilkan variasi floating point/augmentasi; checkpoint dan prediksi final yang diserahkan dipakukan dengan checksum. Field training_seconds model ini hanya waktu loop classifier sesudah ekstraksi/cache, bukan total waktu unduh/ekstraksi. Proses percobaan fine tuning dihentikan akibat tekanan memori, tidak dipakai sebagai model akhir.

## Serving

`torch.load(..., weights_only=True)`, factory tanpa unduh bobot, validasi mapping/preprocess dan strict load state_dict. Softmax mengembalikan confidence serta seluruh probabilitas dalam persen. Batch satu gambar, torch CPU threads2, mutex membatasi inference bersamaan. Bila checkpoint tidak ada/invalid, model unavailable dan `/predict`503; tidak ada random fallback. Restart API setelah mengganti checkpoint yang telah dievaluasi.

Jangan menyamakan confidence dengan akurasi, kalibrasi, atau keamanan penanganan limbah. Sistem hanya klasifikasi single-label 12 kategori; tidak melakukan deteksi banyak objek, segmentasi atau pengenalan zat berbahaya.
