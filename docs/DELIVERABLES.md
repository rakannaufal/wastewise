# Indeks enam deliverable

| Nomor | Hasil nyata | Verifikasi |
| --- | --- | --- |
| 1 | API.md, OpenAPI JSON, Swagger/ReDoc, router dan response schemas | Integrasi PostgreSQL dan alur browser |
| 2 | ERD, schema.sql hasil migrasi, seluruh revisi Alembic | Upgrade pada DB lokal dan DB test |
| 3 | React web, Expo mobile, FastAPI, source training/eval/serving, checkpoint .pth dan metadata | Build/typecheck/lint, API test, checkpoint dipakai inference |
| 4 | 15.515 JPG asli lokal, manifest train/val/test, audit/source metadata, atribusi | Decode, SHA256, pHash grouping, split leakage test |
| 5 | metrics.json, predictions.jsonl, confusion_matrix.png, training_curves.png, EVALUATION.md | Evaluasi test2.318 gambar dari checkpoint beku |
| 6 | README, SETUP, TESTING, .env.example, lockfiles, CI | Perintah lokal dan hasil tercatat PROGRESS |

`python3 scripts/package_release.py` membuat dua arsip lokal: source/model/docs dan dataset supplied user. manifest.json mencatat bytes/SHA256. Secret, DB lokal, akun QA, node_modules, venv, cache fitur dan build sementara dikecualikan.

Checkpoint model resmi masuk Git; dataset dan arsip ZIP tidak masuk Git. Keberadaannya di workspace/arsip adalah deliverable lokal, bukan bukti unggahan GitHub. Hak gambar mengikuti sumber/pemilik asli; jangan menganggap arsip dataset sebagai izin publikasi ulang bebas.

Lihat PROGRESS untuk batas verifikasi terakhir: Supabase remote telah diuji; email delivery, deployment publik dan instalasi perangkat masih terbuka.

Perbaikan mobile-first: [WORKFLOW_IMPLEMENTATION.md](WORKFLOW_IMPLEMENTATION.md) memuat kamera/galeri, ML/GPS otomatis, draft/idempotensi, edit, review/status/history, dashboard operasional dan batas performa. Schema cloud8a4d7c209e51; kebijakan review validation dan smoke kompresi disertakan. Model test tetap95,86%; tidak ada retraining baru. Bukti terbaru: `docs/evidence/workflow-*` dan `supabase-smoke.json`.
