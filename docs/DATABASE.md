# Database schema dan ERD

Schema PostgreSQL: `app_private`. Migrasi executable: `backend-ml/migrations/versions/`; revisi akhir `c42d19b50ea7`. Upgrade diuji pada restore PostgreSQL17 lokal lalu diterapkan dan diverifikasi pada Supabase. Runtime role memperoleh USAGE dan DML, bukan kepemilikan schema. `public.alembic_version` mencatat revisi. CHECK menolak koordinat parsial dan photo_source NULL pada laporan otomatis; data lama tetap legacy.

```mermaid
erDiagram
    users ||--o{ waste_reports : submits
    users ||--o{ report_drafts : owns
    users o|--o{ report_events : acts
    report_drafts o|--o| waste_reports : source
    waste_reports ||--o{ report_events : records
    report_drafts {
        uuid id PK
        uuid user_id FK
        uuid request_id
        text image_path UK
        text thumbnail_path
        varchar image_hash
        jsonb prediction
        varchar classification_state
        numeric latitude
        numeric longitude
        varchar photo_source
        timestamptz captured_at
        varchar location_source
        timestamptz location_recorded_at
        numeric location_accuracy_m
        timestamptz expires_at
        timestamptz consumed_at
        uuid result_report_id
        uuid finalization_key
        varchar finalization_hash
    }
    report_events {
        uuid id PK
        uuid report_id FK
        uuid actor_id FK
        varchar kind
        jsonb details
        text reason
        timestamptz created_at
    }
    users {
        uuid id PK
        varchar email UK
        varchar password_hash "nullable for Supabase"
        varchar auth_provider
        varchar full_name
        user_role role
        timestamptz created_at
        timestamptz updated_at
    }
    waste_reports {
        uuid id PK
        uuid user_id FK
        waste_category category
        text description
        text image_path UK
        numeric latitude
        numeric longitude
        report_status status
        waste_category ai_predicted_category
        numeric ai_confidence
        text ai_model_version
        uuid source_draft_id FK
        text thumbnail_path
        varchar classification_state
        integer revision
        varchar photo_source
        timestamptz captured_at
        varchar location_source
        timestamptz location_recorded_at
        numeric location_accuracy_m
        timestamptz created_at
        timestamptz updated_at
    }
    blocked_identities {
        uuid id PK
        timestamptz created_at
    }
    storage_cleanup_jobs {
        uuid id PK
        text bucket
        text object_path UK
        varchar status
        integer attempts
        timestamptz next_attempt_at
        timestamptz locked_until
        varchar last_error_code
        timestamptz created_at
        timestamptz updated_at
    }
```

## Enum dan constraints

- user_role: admin, user.
- waste_category: battery, biological, brown-glass, cardboard, clothes, green-glass, metal, paper, plastic, shoes, trash, white-glass.
- report_status: Pending, In Progress, Completed, Rejected.
- Email unik dan lowercase/trim. Nama 3..255 karakter setelah trim. Mode lokal: password bcrypt cost12. Mode Supabase: password_hash wajib NULL, auth_provider=supabase; ID sama dengan subject provider. Constraint menjaga pasangan provider/credential. blocked_identities menyimpan ID yang dinonaktifkan tanpa FK ke profil yang sudah dihapus.
- Report user_id FK dengan ON DELETE CASCADE. Deskripsi trim 10..5000, latitude -90..90, longitude -180..180. Numeric koordinat berpresisi 8 digit desimal.
- AI category/confidence/version harus semuanya NULL atau semuanya terisi. Confidence 0..100.
- image_path unik, tidak menyimpan permanent public URL.
- Cleanup unik pada pasangan bucket/object_path; attempts >=0; status pending/processing/completed. Tidak ada FK ke laporan yang dihapus.
- ID dan timestamp dikelola ORM; raw SQL yang menambah row harus memasok nilai wajib. Timestamp UTC bertipe timestamptz; updated_at dikelola ORM pada update aplikasi.

## Index dan transaksi

Laporan: `(user_id, created_at, id)`, `(status, created_at)`, `(category, created_at)`. Urutan pagination dibuat stabil dengan created_at DESC, id DESC. Join pemilik eager untuk menghindari N+1. Search deskripsi menggunakan ILIKE escaped; perlu index trigram jika data besar dan EXPLAIN membuktikan kebutuhan.

Cleanup: `(status, next_attempt_at)` dan `FOR UPDATE SKIP LOCKED`. Advisory lock `81744320` menserialisasi seluruh perubahan keanggotaan admin; hitung jumlah admin di dalam transaksi sebelum demote/delete. Tes dua demotion bersamaan memastikan hanya satu yang berhasil.

## Migrasi dan backup

```bash
cd backend-ml
DATABASE_URL='<owner PostgreSQL URL>' .venv/bin/alembic upgrade head
.venv/bin/alembic current
```

Jalankan migrasi dengan role pemilik terpisah dari runtime. Jangan mengekspos `app_private` melalui Supabase Data API. File `docs/schema.sql` adalah ekspor schema hasil migrasi untuk dibaca; sumber perubahan tetap Alembic. Downgrade menghapus tabel/enum dan hanya boleh dijalankan dengan persetujuan eksplisit pada lingkungan yang sesuai.

Backup: `pg_dump --format=custom` dengan kredensial dari secret manager; simpan terenkripsi di luar repo. Restore ke database staging kosong, bandingkan count dan constraints, periksa signed URL/storage objects. Backup/restore remote belum diuji; dump schema lokal bukan backup data pengguna.


## Invariant workflow otomatis

Draft: unique(user_id,request_id), unique(user_id,finalization_key), expiry index. CHECK menjaga pasangan koordinat, sumber kamera dengan captured_at, serta prediction SQL NULL hanya untuk analysis_failed. Laporan baru harus classified/needs_review/reviewed dengan AI dan sumber foto/lokasi lengkap; data lama diberi legacy/legacy_unknown. Source draft unik dan FK ON DELETE SET NULL; aplikasi tidak menghapus draft yang masih menjadi provenance laporan aktif. result_report_id sengaja bukan FK agar jejak idempotensi dapat merujuk hasil yang telah dihapus; retry kemudian404.

Revision>=1. Mutasi mengunci row dan memeriksa revision. Event report FK cascade, actor FK set null. Index event(report_id,created_at), draft(expires_at). Event/history dan mutasi dicommit bersama. Request idempotensi memakai advisory transaction lock scoped akun/key; fingerprint payload berbeda409. Worker expiry memakai SKIP LOCKED dan memeriksa referensi aktif sebelum menghapus.

Migrasi telah diterapkan di Supabase setelah backup privat app_private, restore lokal dan dry-run pada salinan data. Dump/schema tanpa data berada di schema.sql; cadangan data tidak masuk Git. Uji restore seluruh platform remote termasuk Auth/Storage belum dilakukan. Lihat WORKFLOW_IMPLEMENTATION.md.

## Community extension

Revision `b31c80a21ef4` adds six tables; no legacy report is migrated into a community post. A restored application-schema backup was used to rehearse the migration before guarded Supabase execution. Runtime retains DML only.

```mermaid
erDiagram
    users ||--o{ community_posts : publishes
    waste_reports ||--o| community_posts : source
    regions o|--o{ regions : parent
    regions o|--o{ community_posts : resolves
    community_posts ||--o{ post_likes : receives
    users ||--o{ post_likes : likes
    community_posts ||--o{ post_comments : contains
    users ||--o{ post_comments : writes
    community_posts ||--o{ content_flags : flagged
    community_posts ||--o{ community_audits : moderated
    community_posts {
        uuid id PK
        uuid report_id FK,UK
        uuid user_id FK
        text caption
        varchar state
        text source_image_path
        text image_path
        text thumbnail_path
        varchar region_code FK
        text location_label
        varchar location_state
        varchar privacy_version
        integer revision
        integer attempts
        timestamptz next_attempt_at
    }
    regions {
        varchar code PK
        varchar parent_code FK
        integer level
        varchar name
        text source
        jsonb geometry
    }
```

Likes use composite(post_id,user_id) PK. Comments use unique(user_id,request_id), state CHECK and1..1000 trimmed body length. Posts use unique report_id, state CHECK and10..5000 caption length. Cascades remove social associations when a report/account is deleted; derived images are queued first. Moderator actors/flagger identities become NULL on account deletion. Region parent/name, post state/created_at/id, post region, comment post/created_at/id indexes support the bounded query paths. JSON geometry stores explicitly documented lat/lon rings and bbox; no PostGIS extension is required. Region data is reference data, never a model feature.

Revisi c42d19b50ea7 menambahkan indeks ekspresi bbox pada regions; resolver GPS tidak perlu membaca seluruh poligon saat mencari kandidat. Uji lokal5sampel:16,59ms cold lalu1,92–2,23ms warm untuk titik Gambir; bukan latency jaringan atau p95.
