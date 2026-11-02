SPEC.md - Smart Waste Management System
Master Blueprint & Technical Specification Document
----------------------------------------
1. ARSITEKTUR MONOREPO, ALUR INTEGRASI SUPABASE & KONFIGURASI DEPLOY VERCEL
1.1 Directory Tree Structure
smart-waste-management/
├── .git/
├── .gitignore
├── README.md
├── web/
│ ├── .env
│ ├── .env.example
│ ├── .gitignore
│ ├── index.html
│ ├── package.json
│ ├── tsconfig.json
│ ├── tsconfig.node.json
│ ├── vite.config.ts
│ ├── vercel.json
│ ├── tailwind.config.js
│ ├── postcss.config.js
│ ├── public/
│ │ └── favicon.ico
│ └── src/
│ ├── main.tsx
│ ├── App.tsx
│ ├── index.css
│ ├── vite-env.d.ts
│ ├── api/
│ │ ├── axios.ts
│ │ ├── auth.api.ts
│ │ ├── reports.api.ts
│ │ ├── users.api.ts
│ │ └── stats.api.ts
│ ├── components/
│ │ ├── layout/
│ │ │ ├── Sidebar.tsx
│ │ │ ├── Header.tsx
│ │ │ └── Layout.tsx
│ │ ├── common/
│ │ │ ├── Button.tsx
│ │ │ ├── Input.tsx
│ │ │ ├── Modal.tsx
│ │ │ ├── Table.tsx
│ │ │ ├── Pagination.tsx
│ │ │ ├── SkeletonLoader.tsx
│ │ │ ├── StatusBadge.tsx
│ │ │ └── CategoryBadge.tsx
│ │ ├── dashboard/
│ │ │ ├── StatCard.tsx
│ │ │ ├── CategoryChart.tsx
│ │ │ └── StatusChart.tsx
│ │ ├── reports/
│ │ │ ├── ReportTable.tsx
│ │ │ ├── ReportFilter.tsx
│ │ │ ├── ReportDetailModal.tsx
│ │ │ ├── CreateReportModal.tsx
│ │ │ └── UpdateStatusModal.tsx
│ │ └── users/
│ │ ├── UserTable.tsx
│ │ ├── EditUserModal.tsx
│ │ └── DeleteUserModal.tsx
│ ├── contexts/
│ │ └── AuthContext.tsx
│ ├── hooks/
│ │ ├── useAuth.ts
│ │ └── useDebounce.ts
│ ├── pages/
│ │ ├── LoginPage.tsx
│ │ ├── DashboardPage.tsx
│ │ ├── ReportsPage.tsx
│ │ └── UsersPage.tsx
│ ├── types/
│ │ ├── auth.types.ts
│ │ ├── report.types.ts
│ │ ├── user.types.ts
│ │ └── api.types.ts
│ └── utils/
│ ├── constants.ts
│ └── formatters.ts
│
├── mobile/
│ ├── .env
│ ├── .env.example
│ ├── .gitignore
│ ├── app.json
│ ├── package.json
│ ├── tsconfig.json
│ ├── babel.config.js
│ ├── metro.config.js
│ ├── App.tsx
│ ├── app/
│ │ ├── _layout.tsx
│ │ ├── index.tsx
│ │ ├── (auth)/
│ │ │ ├── _layout.tsx
│ │ │ ├── login.tsx
│ │ │ └── register.tsx
│ │ └── (tabs)/
│ │ ├── _layout.tsx
│ │ ├── home.tsx
│ │ ├── create-report.tsx
│ │ ├── history.tsx
│ │ └── profile.tsx
│ ├── components/
│ │ ├── common/
│ │ │ ├── Button.tsx
│ │ │ ├── Input.tsx
│ │ │ ├── Card.tsx
│ │ │ ├── StatusBadge.tsx
│ │ │ └── LoadingOverlay.tsx
│ │ ├── reports/
│ │ │ ├── ReportCard.tsx
│ │ │ ├── ImagePicker.tsx
│ │ │ ├── LocationDisplay.tsx
│ │ │ └── AIDetectionResult.tsx
│ │ └── layout/
│ │ └── SafeAreaContainer.tsx
│ ├── api/
│ │ ├── client.ts
│ │ ├── auth.api.ts
│ │ ├── reports.api.ts
│ │ └── prediction.api.ts
│ ├── contexts/
│ │ └── AuthContext.tsx
│ ├── hooks/
│ │ ├── useAuth.ts
│ │ ├── useLocation.ts
│ │ └── useImagePicker.ts
│ ├── types/
│ │ ├── auth.types.ts
│ │ ├── report.types.ts
│ │ └── navigation.types.ts
│ ├── utils/
│ │ ├── constants.ts
│ │ └── formatters.ts
│ └── assets/
│ ├── images/
│ └── fonts/
│
└── backend-ml/
 ├── .env
 ├── .env.example
 ├── .gitignore
 ├── requirements.txt
 ├── main.py
 ├── app/
 │ ├── __init__.py
 │ ├── config.py
 │ ├── database.py
 │ ├── models.py
 │ ├── schemas.py
 │ ├── auth.py
 │ ├── dependencies.py
 │ ├── supabase_client.py
 │ ├── ml_predictor.py
 │ └── routers/
 │ ├── __init__.py
 │ ├── auth.py
 │ ├── reports.py
 │ ├── users.py
 │ ├── stats.py
 │ └── prediction.py
 ├── ml/
 │ ├── __init__.py
 │ ├── train.py
 │ ├── model.py
 │ ├── dataset.py
 │ ├── utils.py
 │ └── models/
 │ └── waste_classifier_best.pth
 ├── outputs/
 │ ├── confusion_matrix.png
 │ ├── training_history.png
 │ └── classification_report.txt
 └── dataset/
 ├── train/
 │ ├── Organic Waste/
 │ ├── Plastic Waste/
 │ └── Paper Waste/
 ├── val/
 │ ├── Organic Waste/
 │ ├── Plastic Waste/
 │ └── Paper Waste/
 └── test/
 ├── Organic Waste/
 ├── Plastic Waste/
 └── Paper Waste/
1.2 Environment Variables Configuration
/WEB/.ENV
VITE_API_URL=https://your-fastapi-backend.onrender.com
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
/WEB/.ENV.EXAMPLE
VITE_API_URL=
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
/MOBILE/.ENV
API_URL=https://your-fastapi-backend.onrender.com
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
/MOBILE/.ENV.EXAMPLE
API_URL=
SUPABASE_URL=
SUPABASE_ANON_KEY=
/BACKEND-ML/.ENV
DATABASE_URL=postgresql://postgres:your-password@db.your-project.supabase.co:5432/postgres
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
SUPABASE_STORAGE_BUCKET=waste-images
JWT_SECRET_KEY=your-jwt-secret-key-min-32-characters
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=10080
ML_MODEL_PATH=ml/models/waste_classifier_best.pth
/BACKEND-ML/.ENV.EXAMPLE
DATABASE_URL=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=waste-images
JWT_SECRET_KEY=
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=10080
ML_MODEL_PATH=ml/models/waste_classifier_best.pth
1.3 Vercel Configuration (/web/vercel.json)
{
 "version": 2,
 "buildCommand": "npm run build",
 "outputDirectory": "dist",
 "framework": "vite",
 "rewrites": [
 {
 "source": "/(.*)",
 "destination": "/index.html"
 }
 ],
 "headers": [
 {
 "source": "/assets/(.*)",
 "headers": [
 {
 "key": "Cache-Control",
 "value": "public, max-age=31536000, immutable"
 }
 ]
 }
 ],
 "env": {
 "VITE_API_URL": "@vite_api_url",
 "VITE_SUPABASE_URL": "@vite_supabase_url",
 "VITE_SUPABASE_ANON_KEY": "@vite_supabase_anon_key"
 }
}
1.4 Integration Strategy
Frontend Web (Vercel) → FastAPI Backend:
 * Web application melakukan HTTP requests ke FastAPI menggunakan VITE_API_URL
 * Semua request menggunakan Axios instance dengan JWT Bearer Token di header Authorization: Bearer {token}
 * CORS dikonfigurasi di FastAPI untuk menerima request dari domain Vercel
Mobile App (Expo) → FastAPI Backend:
 * Mobile application melakukan HTTP requests ke FastAPI menggunakan API_URL dari environment
 * Menggunakan fetch API atau Axios dengan JWT Bearer Token
 * Token disimpan secara lokal menggunakan AsyncStorage dari @react-native-async-storage/async-storage
FastAPI Backend → Supabase:
 * Database: FastAPI terhubung ke PostgreSQL Supabase menggunakan SQLAlchemy dengan DATABASE_URL
 * Storage: FastAPI menggunakan Supabase Python Client (supabase-py) dengan SUPABASE_SERVICE_ROLE_KEY untuk mengunggah gambar ke bucket waste-images
 * Alur upload gambar:
 1. Client (Web/Mobile) mengirim image file ke FastAPI endpoint POST /api/v1/reports sebagai multipart/form-data
 2. FastAPI menerima file, menggunakan Supabase Client untuk upload ke bucket waste-images dengan nama file unik (UUID + timestamp)
 3. Supabase Storage mengembalikan public URL dari gambar yang diunggah
 4. FastAPI menyimpan public URL tersebut ke kolom image_url di tabel waste_reports di PostgreSQL
ML Prediction Flow:
 * Client mengirim gambar ke POST /api/v1/predict
 * FastAPI memuat gambar, melakukan preprocessing, dan menjalankan inferensi menggunakan model PyTorch MobileNetV2
 * FastAPI mengembalikan predicted_category, confidence, dan probabilities untuk ketiga kelas
----------------------------------------
2. SKEMA DATABASE POSTGRESQL (SUPABASE) & STORAGE POLICY
2.1 SQL DDL Schema
Jalankan query SQL berikut di Supabase SQL Editor secara berurutan:
-- Buat ENUM types
CREATE TYPE user_role AS ENUM ('admin', 'user');
CREATE TYPE waste_category AS ENUM ('Organic Waste', 'Plastic Waste', 'Paper Waste');
CREATE TYPE report_status AS ENUM ('Pending', 'In Progress', 'Completed', 'Rejected');
-- Tabel users
CREATE TABLE users (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 email VARCHAR(255) UNIQUE NOT NULL,
 password_hash VARCHAR(255) NOT NULL,
 full_name VARCHAR(255) NOT NULL,
 role user_role NOT NULL DEFAULT 'user',
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Tabel waste_reports
CREATE TABLE waste_reports (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 category waste_category NOT NULL,
 description TEXT NOT NULL,
 image_url TEXT NOT NULL,
 latitude DECIMAL(10, 8) NOT NULL,
 longitude DECIMAL(11, 8) NOT NULL,
 status report_status NOT NULL DEFAULT 'Pending',
 ai_confidence DECIMAL(5, 2),
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Index untuk performa query
CREATE INDEX idx_waste_reports_user_id ON waste_reports(user_id);
CREATE INDEX idx_waste_reports_category ON waste_reports(category);
CREATE INDEX idx_waste_reports_status ON waste_reports(status);
CREATE INDEX idx_waste_reports_created_at ON waste_reports(created_at DESC);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
-- Trigger untuk auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
 NEW.updated_at = NOW();
 RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_waste_reports_updated_at
BEFORE UPDATE ON waste_reports
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
-- Insert default admin user (password: Admin123!)
-- Password hash dibuat dengan bcrypt rounds=12
INSERT INTO users (email, password_hash, full_name, role) 
VALUES (
 'admin@wastemanagement.com',
 '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5NU8b0wXQdG7u',
 'System Administrator',
 'admin'
);
2.2 ENUM Value Specifications (WAJIB KONSISTEN)
User Role:
 * 'admin' - Administrator dengan akses penuh ke semua fitur termasuk user management
 * 'user' - User biasa yang hanya bisa membuat dan melihat laporan miliknya sendiri
Waste Category:
 * 'Organic Waste' - Sampah organik (contoh: sisa makanan, daun, ranting)
 * 'Plastic Waste' - Sampah plastik (contoh: botol plastik, kantong plastik, kemasan)
 * 'Paper Waste' - Sampah kertas (contoh: kertas bekas, karton, koran)
Report Status:
 * 'Pending' - Laporan baru dibuat, menunggu review
 * 'In Progress' - Laporan sedang ditangani oleh petugas
 * 'Completed' - Laporan sudah selesai ditangani
 * 'Rejected' - Laporan ditolak (tidak valid atau duplikat)
2.3 Supabase Storage Configuration
Bucket Name: waste-images
Bucket Settings:
 * Public bucket: true (untuk memungkinkan akses public URL)
 * File size limit: 5 MB
 * Allowed MIME types: image/jpeg, image/png, image/webp
Storage Policy SQL (Jalankan di Supabase Dashboard > Storage > Policies):
-- Policy untuk upload (hanya authenticated users)
CREATE POLICY "Authenticated users can upload waste images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'waste-images');
-- Policy untuk read public access
CREATE POLICY "Public read access for waste images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'waste-images');
-- Policy untuk delete (hanya owner atau admin)
CREATE POLICY "Users can delete their own waste images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'waste-images');
2.4 Image Upload Flow
 1. Client → FastAPI: Client mengirim multipart/form-data request ke POST /api/v1/reports dengan field:
 * image: File (JPEG/PNG/WebP, max 5MB)
 * category: String (enum value)
 * description: String
 * latitude: Float
 * longitude: Float
 * ai_confidence: Float (optional, dari hasil ML prediction sebelumnya)
 2. FastAPI Processing:
 # Pseudocode flow
 file = request.file("image")
 unique_filename = f"{uuid4()}_{int(time.time())}.{file.extension}"
 # Upload ke Supabase Storage menggunakan supabase_client
 supabase.storage.from_("waste-images").upload(
 path=unique_filename,
 file=file.file,
 file_options={"content-type": file.content_type}
 )
 # Get public URL
 public_url = supabase.storage.from_("waste-images").get_public_url(unique_filename)
 # Save to database
 new_report = WasteReport(
 user_id=current_user.id,
 category=data.category,
 description=data.description,
 image_url=public_url,
 latitude=data.latitude,
 longitude=data.longitude,
 ai_confidence=data.ai_confidence,
 status="Pending"
 )
 db.add(new_report)
 db.commit()
 3. Response: FastAPI mengembalikan object report lengkap dengan image_url yang sudah bisa diakses secara publik
----------------------------------------
3. KONTRAK REST API TERPUSAT (FASTAPI)
3.1 Base URL
Production: https://your-fastapi-backend.onrender.com
Development: http://localhost:8000
3.2 Authentication Endpoints
POST /API/V1/AUTH/REGISTER
Description: Register user baru
Request Body:
{
 "email": "user@example.com",
 "password": "SecurePassword123!",
 "full_name": "John Doe",
 "role": "user"
}
Validation Rules:
 * email: Valid email format, unique
 * password: Minimum 8 characters, must contain uppercase, lowercase, number, special character
 * full_name: Minimum 3 characters
 * role: Optional, default "user", enum ["admin", "user"]
Success Response (201):
{
 "success": true,
 "message": "User registered successfully",
 "data": {
 "id": "550e8400-e29b-41d4-a716-446655440000",
 "email": "user@example.com",
 "full_name": "John Doe",
 "role": "user",
 "created_at": "2025-11-02T10:30:00Z"
 }
}
Error Response (400):
{
 "success": false,
 "message": "Email already registered",
 "data": null
}
----------------------------------------
POST /API/V1/AUTH/LOGIN
Description: Login dan mendapatkan JWT access token
Request Body:
{
 "email": "user@example.com",
 "password": "SecurePassword123!"
}
Success Response (200):
{
 "success": true,
 "message": "Login successful",
 "data": {
 "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
 "token_type": "bearer",
 "expires_in": 604800,
 "user": {
 "id": "550e8400-e29b-41d4-a716-446655440000",
 "email": "user@example.com",
 "full_name": "John Doe",
 "role": "user"
 }
 }
}
Error Response (401):
{
 "success": false,
 "message": "Invalid email or password",
 "data": null
}
----------------------------------------
GET /API/V1/AUTH/ME
Description: Get current authenticated user info
Headers:
Authorization: Bearer {access_token}
Success Response (200):
{
 "success": true,
 "message": "User retrieved successfully",
 "data": {
 "id": "550e8400-e29b-41d4-a716-446655440000",
 "email": "user@example.com",
 "full_name": "John Doe",
 "role": "user",
 "created_at": "2025-10-01T08:00:00Z",
 "updated_at": "2025-11-02T10:30:00Z"
 }
}
Error Response (401):
{
 "success": false,
 "message": "Invalid or expired token",
 "data": null
}
----------------------------------------
3.3 Reports Endpoints
GET /API/V1/REPORTS
Description: Get list of waste reports dengan filtering dan pagination
Headers:
Authorization: Bearer {access_token}
Query Parameters:
 * page: Integer, default 1
 * per_page: Integer, default 10, max 100
 * search: String, optional (search di description atau location)
 * status: String, optional, enum ["Pending", "In Progress", "Completed", "Rejected"]
 * category: String, optional, enum ["Organic Waste", "Plastic Waste", "Paper Waste"]
 * user_id: UUID, optional (admin only, filter by specific user)
Authorization Logic:
 * user role: Hanya bisa melihat laporan miliknya sendiri (WHERE user_id = current_user.id)
 * admin role: Bisa melihat semua laporan
Success Response (200):
{
 "success": true,
 "message": "Reports retrieved successfully",
 "data": {
 "reports": [
 {
 "id": "660e8400-e29b-41d4-a716-446655440001",
 "user_id": "550e8400-e29b-41d4-a716-446655440000",
 "user_name": "John Doe",
 "category": "Plastic Waste",
 "description": "Plastic bottles found near the park entrance",
 "image_url": "https://your-project.supabase.co/storage/v1/object/public/waste-images/uuid_timestamp.jpg",
 "latitude": -6.200000,
 "longitude": 106.816666,
 "status": "Pending",
 "ai_confidence": 92.50,
 "created_at": "2025-11-02T09:15:00Z",
 "updated_at": "2025-11-02T09:15:00Z"
 }
 ],
 "pagination": {
 "current_page": 1,
 "per_page": 10,
 "total_items": 45,
 "total_pages": 5
 }
 }
}
----------------------------------------
POST /API/V1/REPORTS
Description: Create new waste report
Headers:
Authorization: Bearer {access_token}
Content-Type: multipart/form-data
Request Body (multipart/form-data):
 * image: File (required, JPEG/PNG/WebP, max 5MB)
 * category: String (required, enum: "Organic Waste" | "Plastic Waste" | "Paper Waste")
 * description: String (required, min 10 characters)
 * latitude: Float (required, -90 to 90)
 * longitude: Float (required, -180 to 180)
 * ai_confidence: Float (optional, 0 to 100, hasil dari ML prediction)
Success Response (201):
{
 "success": true,
 "message": "Report created successfully",
 "data": {
 "id": "770e8400-e29b-41d4-a716-446655440002",
 "user_id": "550e8400-e29b-41d4-a716-446655440000",
 "user_name": "John Doe",
 "category": "Plastic Waste",
 "description": "Plastic bottles found near the park entrance",
 "image_url": "https://your-project.supabase.co/storage/v1/object/public/waste-images/uuid_timestamp.jpg",
 "latitude": -6.200000,
 "longitude": 106.816666,
 "status": "Pending",
 "ai_confidence": 92.50,
 "created_at": "2025-11-02T10:45:00Z",
 "updated_at": "2025-11-02T10:45:00Z"
 }
}
Error Response (400):
{
 "success": false,
 "message": "Invalid image format. Only JPEG, PNG, and WebP are allowed",
 "data": null
}
----------------------------------------
GET /API/V1/REPORTS/{ID}
Description: Get detail single waste report
Headers:
Authorization: Bearer {access_token}
Authorization Logic:
 * user role: Hanya bisa melihat laporan miliknya sendiri
 * admin role: Bisa melihat semua laporan
Success Response (200):
{
 "success": true,
 "message": "Report retrieved successfully",
 "data": {
 "id": "660e8400-e29b-41d4-a716-446655440001",
 "user_id": "550e8400-e29b-41d4-a716-446655440000",
 "user_name": "John Doe",
 "user_email": "user@example.com",
 "category": "Plastic Waste",
 "description": "Plastic bottles found near the park entrance",
 "image_url": "https://your-project.supabase.co/storage/v1/object/public/waste-images/uuid_timestamp.jpg",
 "latitude": -6.200000,
 "longitude": 106.816666,
 "status": "Pending",
 "ai_confidence": 92.50,
 "created_at": "2025-11-02T09:15:00Z",
 "updated_at": "2025-11-02T09:15:00Z"
 }
}
Error Response (404):
{
 "success": false,
 "message": "Report not found",
 "data": null
}
Error Response (403):
{
 "success": false,
 "message": "You don't have permission to access this report",
 "data": null
}
----------------------------------------
PATCH /API/V1/REPORTS/{ID}/STATUS
Description: Update status laporan (admin only)
Headers:
Authorization: Bearer {access_token}
Content-Type: application/json
Authorization: Admin role only
Request Body:
{
 "status": "In Progress"
}
Validation:
 * status: Required, enum ["Pending", "In Progress", "Completed", "Rejected"]
Success Response (200):
{
 "success": true,
 "message": "Report status updated successfully",
 "data": {
 "id": "660e8400-e29b-41d4-a716-446655440001",
 "status": "In Progress",
 "updated_at": "2025-11-02T11:00:00Z"
 }
}
Error Response (403):
{
 "success": false,
 "message": "Only admin can update report status",
 "data": null
}
----------------------------------------
DELETE /API/V1/REPORTS/{ID}
Description: Delete waste report
Headers:
Authorization: Bearer {access_token}
Authorization Logic:
 * user role: Hanya bisa menghapus laporan miliknya sendiri
 * admin role: Bisa menghapus semua laporan
Success Response (200):
{
 "success": true,
 "message": "Report deleted successfully",
 "data": null
}
Error Response (403):
{
 "success": false,
 "message": "You don't have permission to delete this report",
 "data": null
}
----------------------------------------
3.4 Dashboard Statistics Endpoint
GET /API/V1/STATS/SUMMARY
Description: Get dashboard statistics summary
Headers:
Authorization: Bearer {access_token}
Authorization Logic:
 * user role: Statistik hanya untuk laporan miliknya sendiri
 * admin role: Statistik untuk semua laporan
Success Response (200):
{
 "success": true,
 "message": "Statistics retrieved successfully",
 "data": {
 "total_reports": 156,
 "by_category": {
 "Organic Waste": 52,
 "Plastic Waste": 68,
 "Paper Waste": 36
 },
 "by_status": {
 "Pending": 28,
 "In Progress": 45,
 "Completed": 75,
 "Rejected": 8
 },
 "recent_reports": [
 {
 "id": "770e8400-e29b-41d4-a716-446655440002",
 "category": "Plastic Waste",
 "status": "Pending",
 "created_at": "2025-11-02T10:45:00Z"
 }
 ]
 }
}
----------------------------------------
3.5 Users Management Endpoints (Admin Only)
GET /API/V1/USERS
Description: Get list of all users (admin only)
Headers:
Authorization: Bearer {access_token}
Query Parameters:
 * page: Integer, default 1
 * per_page: Integer, default 10, max 100
 * search: String, optional (search di email atau full_name)
 * role: String, optional, enum ["admin", "user"]
Authorization: Admin role only
Success Response (200):
{
 "success": true,
 "message": "Users retrieved successfully",
 "data": {
 "users": [
 {
 "id": "550e8400-e29b-41d4-a716-446655440000",
 "email": "user@example.com",
 "full_name": "John Doe",
 "role": "user",
 "report_count": 12,
 "created_at": "2025-10-01T08:00:00Z",
 "updated_at": "2025-11-02T10:30:00Z"
 }
 ],
 "pagination": {
 "current_page": 1,
 "per_page": 10,
 "total_items": 34,
 "total_pages": 4
 }
 }
}
----------------------------------------
PATCH /API/V1/USERS/{ID}
Description: Update user role atau full name (admin only)
Headers:
Authorization: Bearer {access_token}
Content-Type: application/json
Authorization: Admin role only
Request Body:
{
 "full_name": "John Updated Doe",
 "role": "admin"
}
Validation:
 * full_name: Optional, min 3 characters
 * role: Optional, enum ["admin", "user"]
 * At least one field must be provided
Success Response (200):
{
 "success": true,
 "message": "User updated successfully",
 "data": {
 "id": "550e8400-e29b-41d4-a716-446655440000",
 "email": "user@example.com",
 "full_name": "John Updated Doe",
 "role": "admin",
 "updated_at": "2025-11-02T11:15:00Z"
 }
}
Error Response (403):
{
 "success": false,
 "message": "Only admin can update users",
 "data": null
}
----------------------------------------
DELETE /API/V1/USERS/{ID}
Description: Delete user (admin only)
Headers:
Authorization: Bearer {access_token}
Authorization: Admin role only
Business Logic:
 * Tidak bisa menghapus diri sendiri (current admin user)
 * Saat user dihapus, semua laporan miliknya akan ikut terhapus (CASCADE)
Success Response (200):
{
 "success": true,
 "message": "User deleted successfully",
 "data": null
}
Error Response (400):
{
 "success": false,
 "message": "You cannot delete your own account",
 "data": null
}
----------------------------------------
3.6 AI Prediction Endpoint
POST /API/V1/PREDICT
Description: Predict waste category dari gambar menggunakan ML model
Headers:
Content-Type: multipart/form-data
Authentication: Not required (public endpoint untuk kemudahan mobile app)
Request Body (multipart/form-data):
 * image: File (required, JPEG/PNG/WebP, max 5MB)
Success Response (200):
{
 "success": true,
 "message": "Prediction successful",
 "data": {
 "predicted_category": "Plastic Waste",
 "confidence": 92.50,
 "probabilities": {
 "Organic Waste": 3.25,
 "Plastic Waste": 92.50,
 "Paper Waste": 4.25
 }
 }
}
Error Response (400):
{
 "success": false,
 "message": "Invalid image format or corrupted image",
 "data": null
}
Error Response (500):
{
 "success": false,
 "message": "Model inference failed. Please try again",
 "data": null
}
----------------------------------------
3.7 Error Response Standard
Semua error response mengikuti format:
{
 "success": false,
 "message": "Human-readable error message",
 "data": null
}
HTTP Status Codes:
 * 200: Success
 * 201: Created
 * 400: Bad Request (validation error, invalid input)
 * 401: Unauthorized (invalid/expired token, wrong credentials)
 * 403: Forbidden (insufficient permissions)
 * 404: Not Found
 * 500: Internal Server Error
----------------------------------------
4. SPESIFIKASI PIPELINE MACHINE LEARNING (MOBILENETV2 TRANSFER LEARNING)
4.1 Dataset Structure & Requirements
Minimum Dataset Size: 150 gambar total (50 per kategori)
Recommended Dataset Size: 300+ gambar (100+ per kategori)
Directory Structure:
backend-ml/dataset/
├── train/ # 70% dari total dataset
│ ├── Organic Waste/
│ ├── Plastic Waste/
│ └── Paper Waste/
├── val/ # 15% dari total dataset
│ ├── Organic Waste/
│ ├── Plastic Waste/
│ └── Paper Waste/
└── test/ # 15% dari total dataset
 ├── Organic Waste/
 ├── Plastic Waste/
 └── Paper Waste/
Image Specifications:
 * Format: JPEG, PNG
 * Minimum resolution: 224x224 pixels
 * Maximum file size: 5MB
 * Color: RGB (3 channels)
4.2 Training Script Architecture (backend-ml/ml/train.py)
Main Components:
 1. Import Dependencies:
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader
from torchvision import datasets, transforms, models
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import confusion_matrix, classification_report
import os
from datetime import datetime
 2. Configuration Class:
class TrainingConfig:
 # Dataset paths
 DATASET_ROOT = 'dataset'
 TRAIN_DIR = 'dataset/train'
 VAL_DIR = 'dataset/val'
 TEST_DIR = 'dataset/test'
 # Model parameters
 MODEL_NAME = 'mobilenet_v2'
 NUM_CLASSES = 3
 IMAGE_SIZE = 224
 # Training hyperparameters
 BATCH_SIZE = 32
 LEARNING_RATE = 0.001
 NUM_EPOCHS = 30
 EARLY_STOPPING_PATIENCE = 5
 # Output paths
 MODEL_SAVE_PATH = 'ml/models/waste_classifier_best.pth'
 OUTPUTS_DIR = 'outputs'
 CONFUSION_MATRIX_PATH = 'outputs/confusion_matrix.png'
 TRAINING_HISTORY_PATH = 'outputs/training_history.png'
 CLASSIFICATION_REPORT_PATH = 'outputs/classification_report.txt'
 # Device configuration
 DEVICE = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
 # Class names (must match folder names and database enum)
 CLASS_NAMES = ['Organic Waste', 'Paper Waste', 'Plastic Waste']
 3. Data Augmentation Transforms:
def get_transforms():
 train_transforms = transforms.Compose([
 transforms.Resize((256, 256)),
 transforms.RandomCrop((224, 224)),
 transforms.RandomHorizontalFlip(p=0.5),
 transforms.RandomRotation(degrees=15),
 transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2),
 transforms.ToTensor(),
 transforms.Normalize(mean=[0.485, 0.456, 0.406], 
 std=[0.229, 0.224, 0.225])
 ])
 val_test_transforms = transforms.Compose([
 transforms.Resize((224, 224)),
 transforms.ToTensor(),
 transforms.Normalize(mean=[0.485, 0.456, 0.406], 
 std=[0.229, 0.224, 0.225])
 ])
 return train_transforms, val_test_transforms
 4. Model Architecture:
def create_model(num_classes=3):
 # Load pretrained MobileNetV2
 model = models.mobilenet_v2(pretrained=True)
 # Freeze all base layers
 for param in model.parameters():
 param.requires_grad = False
 # Replace classifier with custom head
 num_features = model.classifier[1].in_features
 model.classifier = nn.Sequential(
 nn.Dropout(p=0.2),
 nn.Linear(num_features, 512),
 nn.ReLU(),
 nn.Dropout(p=0.3),
 nn.Linear(512, num_classes)
 )
 return model
 5. Training Loop:
def train_epoch(model, dataloader, criterion, optimizer, device):
 model.train()
 running_loss = 0.0
 correct = 0
 total = 0
 for inputs, labels in dataloader:
 inputs, labels = inputs.to(device), labels.to(device)
 optimizer.zero_grad()
 outputs = model(inputs)
 loss = criterion(outputs, labels)
 loss.backward()
 optimizer.step()
 running_loss += loss.item() * inputs.size(0)
 _, predicted = torch.max(outputs, 1)
 total += labels.size(0)
 correct += (predicted == labels).sum().item()
 epoch_loss = running_loss / total
 epoch_acc = correct / total
 return epoch_loss, epoch_acc
 6. Validation Loop:
def validate_epoch(model, dataloader, criterion, device):
 model.eval()
 running_loss = 0.0
 correct = 0
 total = 0
 with torch.no_grad():
 for inputs, labels in dataloader:
 inputs, labels = inputs.to(device), labels.to(device)
 outputs = model(inputs)
 loss = criterion(outputs, labels)
 running_loss += loss.item() * inputs.size(0)
 _, predicted = torch.max(outputs, 1)
 total += labels.size(0)
 correct += (predicted == labels).sum().item()
 epoch_loss = running_loss / total
 epoch_acc = correct / total
 return epoch_loss, epoch_acc
 7. Testing & Evaluation:
def test_model(model, dataloader, device, class_names):
 model.eval()
 all_preds = []
 all_labels = []
 with torch.no_grad():
 for inputs, labels in dataloader:
 inputs = inputs.to(device)
 outputs = model(inputs)
 _, predicted = torch.max(outputs, 1)
 all_preds.extend(predicted.cpu().numpy())
 all_labels.extend(labels.numpy())
 # Calculate accuracy
 accuracy = np.mean(np.array(all_preds) == np.array(all_labels))
 # Generate confusion matrix
 cm = confusion_matrix(all_labels, all_preds)
 # Generate classification report
 report = classification_report(all_labels, all_preds, 
 target_names=class_names, 
 digits=4)
 return accuracy, cm, report, all_preds, all_labels
 8. Visualization Functions:
def plot_confusion_matrix(cm, class_names, save_path):
 plt.figure(figsize=(10, 8))
 sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', 
 xticklabels=class_names, yticklabels=class_names,
 cbar_kws={'label': 'Count'})
 plt.title('Confusion Matrix - Waste Classification', fontsize=16, pad=20)
 plt.ylabel('True Label', fontsize=12)
 plt.xlabel('Predicted Label', fontsize=12)
 plt.tight_layout()
 plt.savefig(save_path, dpi=300, bbox_inches='tight')
 plt.close()
 print(f"Confusion matrix saved to {save_path}")
def plot_training_history(history, save_path):
 fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(15, 5))
 # Plot loss
 ax1.plot(history['train_loss'], label='Train Loss', marker='o')
 ax1.plot(history['val_loss'], label='Validation Loss', marker='s')
 ax1.set_title('Model Loss Over Epochs', fontsize=14)
 ax1.set_xlabel('Epoch', fontsize=12)
 ax1.set_ylabel('Loss', fontsize=12)
 ax1.legend()
 ax1.grid(True, alpha=0.3)
 # Plot accuracy
 ax2.plot(history['train_acc'], label='Train Accuracy', marker='o')
 ax2.plot(history['val_acc'], label='Validation Accuracy', marker='s')
 ax2.set_title('Model Accuracy Over Epochs', fontsize=14)
 ax2.set_xlabel('Epoch', fontsize=12)
 ax2.set_ylabel('Accuracy', fontsize=12)
 ax2.legend()
 ax2.grid(True, alpha=0.3)
 plt.tight_layout()
 plt.savefig(save_path, dpi=300, bbox_inches='tight')
 plt.close()
 print(f"Training history saved to {save_path}")
 9. Main Training Function:
def main():
 # Create output directories
 os.makedirs(TrainingConfig.OUTPUTS_DIR, exist_ok=True)
 os.makedirs(os.path.dirname(TrainingConfig.MODEL_SAVE_PATH), exist_ok=True)
 # Get transforms
 train_transforms, val_test_transforms = get_transforms()
 # Load datasets
 train_dataset = datasets.ImageFolder(TrainingConfig.TRAIN_DIR, 
 transform=train_transforms)
 val_dataset = datasets.ImageFolder(TrainingConfig.VAL_DIR, 
 transform=val_test_transforms)
 test_dataset = datasets.ImageFolder(TrainingConfig.TEST_DIR, 
 transform=val_test_transforms)
 # Create dataloaders
 train_loader = DataLoader(train_dataset, batch_size=TrainingConfig.BATCH_SIZE, 
 shuffle=True, num_workers=4)
 val_loader = DataLoader(val_dataset, batch_size=TrainingConfig.BATCH_SIZE, 
 shuffle=False, num_workers=4)
 test_loader = DataLoader(test_dataset, batch_size=TrainingConfig.BATCH_SIZE, 
 shuffle=False, num_workers=4)
 # Print dataset info
 print(f"Training samples: {len(train_dataset)}")
 print(f"Validation samples: {len(val_dataset)}")
 print(f"Test samples: {len(test_dataset)}")
 print(f"Classes: {TrainingConfig.CLASS_NAMES}")
 # Create model
 model = create_model(TrainingConfig.NUM_CLASSES)
 model = model.to(TrainingConfig.DEVICE)
 # Loss and optimizer
 criterion = nn.CrossEntropyLoss()
 optimizer = optim.Adam(model.classifier.parameters(), 
 lr=TrainingConfig.LEARNING_RATE)
 scheduler = optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode='min', 
 factor=0.5, patience=3)
 # Training loop with early stopping
 best_val_acc = 0.0
 patience_counter = 0
 history = {
 'train_loss': [], 'train_acc': [],
 'val_loss': [], 'val_acc': []
 }
 for epoch in range(TrainingConfig.NUM_EPOCHS):
 print(f"\nEpoch {epoch+1}/{TrainingConfig.NUM_EPOCHS}")
 print("-" * 50)
 train_loss, train_acc = train_epoch(model, train_loader, criterion, 
 optimizer, TrainingConfig.DEVICE)
 val_loss, val_acc = validate_epoch(model, val_loader, criterion, 
 TrainingConfig.DEVICE)
 history['train_loss'].append(train_loss)
 history['train_acc'].append(train_acc)
 history['val_loss'].append(val_loss)
 history['val_acc'].append(val_acc)
 print(f"Train Loss: {train_loss:.4f} | Train Acc: {train_acc:.4f}")
 print(f"Val Loss: {val_loss:.4f} | Val Acc: {val_acc:.4f}")
 scheduler.step(val_loss)
 # Save best model
 if val_acc > best_val_acc:
 best_val_acc = val_acc
 torch.save(model.state_dict(), TrainingConfig.MODEL_SAVE_PATH)
 print(f"✓ Best model saved with val_acc: {val_acc:.4f}")
 patience_counter = 0
 else:
 patience_counter += 1
 # Early stopping
 if patience_counter >= TrainingConfig.EARLY_STOPPING_PATIENCE:
 print(f"\nEarly stopping triggered at epoch {epoch+1}")
 break
 # Load best model for testing
 model.load_state_dict(torch.load(TrainingConfig.MODEL_SAVE_PATH))
 # Test model
 print("\n" + "="*50)
 print("TESTING PHASE")
 print("="*50)
 test_acc, cm, report, _, _ = test_model(model, test_loader, 
 TrainingConfig.DEVICE, 
 TrainingConfig.CLASS_NAMES)
 print(f"\nTest Accuracy: {test_acc*100:.2f}%")
 print("\nClassification Report:")
 print(report)
 # Save classification report
 with open(TrainingConfig.CLASSIFICATION_REPORT_PATH, 'w') as f:
 f.write(f"Test Accuracy: {test_acc*100:.2f}%\n\n")
 f.write("Classification Report:\n")
 f.write(report)
 print(f"Classification report saved to {TrainingConfig.CLASSIFICATION_REPORT_PATH}")
 # Plot and save visualizations
 plot_confusion_matrix(cm, TrainingConfig.CLASS_NAMES, 
 TrainingConfig.CONFUSION_MATRIX_PATH)
 plot_training_history(history, TrainingConfig.TRAINING_HISTORY_PATH)
 # Final validation
 if test_acc >= 0.85:
 print(f"\n✓ SUCCESS: Model achieved {test_acc*100:.2f}% accuracy (target: >85%)")
 else:
 print(f"\n✗ WARNING: Model accuracy {test_acc*100:.2f}% is below target 85%")
 print("Consider: More data, longer training, or hyperparameter tuning")
if __name__ == '__main__':
 main()
4.3 Model Loading for Inference (backend-ml/app/ml_predictor.py)
import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image
import io
import os
class WasteClassifier:
 def __init__(self, model_path, device='cpu'):
 self.device = torch.device(device)
 self.class_names = ['Organic Waste', 'Paper Waste', 'Plastic Waste']
 self.model = self._load_model(model_path)
 self.transform = self._get_transform()
 def _load_model(self, model_path):
 model = models.mobilenet_v2(pretrained=False)
 num_features = model.classifier[1].in_features
 model.classifier = nn.Sequential(
 nn.Dropout(p=0.2),
 nn.Linear(num_features, 512),
 nn.ReLU(),
 nn.Dropout(p=0.3),
 nn.Linear(512, 3)
 )
 model.load_state_dict(torch.load(model_path, map_location=self.device))
 model.to(self.device)
 model.eval()
 return model
 def _get_transform(self):
 return transforms.Compose([
 transforms.Resize((224, 224)),
 transforms.ToTensor(),
 transforms.Normalize(mean=[0.485, 0.456, 0.406], 
 std=[0.229, 0.224, 0.225])
 ])
 def predict(self, image_bytes):
 image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
 image_tensor = self.transform(image).unsqueeze(0).to(self.device)
 with torch.no_grad():
 outputs = self.model(image_tensor)
 probabilities = torch.nn.functional.softmax(outputs, dim=1)
 confidence, predicted = torch.max(probabilities, 1)
 predicted_class = self.class_names[predicted.item()]
 confidence_score = confidence.item() * 100
 probs_dict = {
 self.class_names[i]: probabilities[0][i].item() * 100 
 for i in range(len(self.class_names))
 }
 return {
 'predicted_category': predicted_class,
 'confidence': round(confidence_score, 2),
 'probabilities': {k: round(v, 2) for k, v in probs_dict.items()}
 }
4.4 Expected Output Files
Setelah training selesai, script harus menghasilkan:
 1. Model File: ml/models/waste_classifier_best.pth (PyTorch state dict)
 2. Confusion Matrix: outputs/confusion_matrix.png
 * Heatmap 3x3 dengan label kelas
 * Nilai absolut di setiap cell
 * Colorbar untuk skala
 3. Training History: outputs/training_history.png
 * 2 subplot: Loss curves dan Accuracy curves
 * Train dan Validation lines untuk perbandingan
 4. Classification Report: outputs/classification_report.txt
 * Test Accuracy percentage
 * Precision, Recall, F1-Score per kelas
 * Macro/Weighted averages
4.5 Performance Target
Mandatory Requirement:
 * Test Accuracy: >85% (minimum threshold)
 * Balanced performance across all 3 classes (tidak boleh ada kelas dengan F1-Score <0.75)
Training Time Estimate:
 * Dengan MobileNetV2 transfer learning: ~10-20 minutes pada CPU
 * Dengan GPU: ~5-10 minutes
----------------------------------------
5. DESIGN SYSTEM & ANTI-AI SLOP UI/UX GUIDELINES
5.1 Color Palette (Eco-Modern Theme)
Primary Colors:
 * Primary Green: #059669 (emerald-600) - Buttons, links, active states
 * Primary Dark: #047857 (emerald-700) - Hover states
 * Primary Light: #D1FAE5 (emerald-100) - Background accents
Neutral Colors:
 * Background Primary: #FFFFFF (white) - Main content background
 * Background Secondary: #F8FAFC (slate-50) - Sidebar, cards
 * Background Tertiary: #F1F5F9 (slate-100) - Hover backgrounds
 * Border Color: #E2E8F0 (slate-200) - Dividers, borders
 * Text Primary: #0F172A (slate-900) - Headings, primary text
 * Text Secondary: #475569 (slate-600) - Body text, descriptions
 * Text Tertiary: #94A3B8 (slate-400) - Placeholder, disabled text
Status Badge Colors (with Background and Text):
 * Pending: Background #FEF3C7 (amber-100), Text #92400E (amber-800)
 * In Progress: Background #DBEAFE (blue-100), Text #1E40AF (blue-800)
 * Completed: Background #D1FAE5 (emerald-100), Text #065F46 (emerald-800)
 * Rejected: Background #FEE2E2 (red-100), Text #991B1B (red-800)
Category Badge Colors:
 * Organic Waste: Background #DCFCE7 (green-100), Text #166534 (green-800)
 * Plastic Waste: Background #DBEAFE (blue-100), Text #1E40AF (blue-800)
 * Paper Waste: Background #FEF3C7 (amber-100), Text #92400E (amber-800)
Semantic Colors:
 * Success: #10B981 (green-500)
 * Error: #EF4444 (red-500)
 * Warning: #F59E0B (amber-500)
 * Info: #3B82F6 (blue-500)
FORBIDDEN COLORS (NEVER USE):
 * Neon gradients (purple-blue, pink-purple)
 * Pure black #000000
 * Bright cyan, magenta, or neon colors
5.2 Typography
Font Family:
 * Primary: Inter (Google Fonts) - Clean, modern sans-serif
 * Fallback: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif
Font Sizes & Weights:
 * Heading 1: text-3xl (30px), font-bold (700) - Page titles
 * Heading 2: text-2xl (24px), font-semibold (600) - Section headers
 * Heading 3: text-xl (20px), font-semibold (600) - Card headers
 * Body Large: text-base (16px), font-normal (400) - Primary text
 * Body Regular: text-sm (14px), font-normal (400) - Secondary text
 * Caption: text-xs (12px), font-medium (500) - Labels, badges
5.3 Spacing System (Tailwind CSS)
Padding/Margin Scale:
 * XS: p-1 (4px)
 * SM: p-2 (8px)
 * MD: p-4 (16px)
 * LG: p-6 (24px)
 * XL: p-8 (32px)
 * 2XL: p-12 (48px)
Component Spacing Guidelines:
 * Card padding: p-6
 * Button padding: px-4 py-2 (horizontal 16px, vertical 8px)
 * Input padding: px-3 py-2
 * Section spacing: mb-8 between major sections
5.4 Website Layout Components (React + Tailwind)
5.4.1 SIDEBAR COMPONENT (SIDEBAR.TSX)
Structure:
 * Fixed position: fixed left-0 top-0 h-screen w-64
 * Background: bg-slate-50
 * Border: border-r border-slate-200
Elements:
 1. Logo Section:
 * Height: h-16
 * Padding: px-6
 * Border bottom: border-b border-slate-200
 * Logo text: text-xl font-bold text-emerald-600
 * Icon: Lucide Recycle size 28
 2. Navigation Items:
 * Height: h-12
 * Padding: px-6
 * Flex layout: flex items-center gap-3
 * Active state: bg-emerald-50 text-emerald-700 border-r-4 border-emerald-600
 * Inactive state: text-slate-600 hover:bg-slate-100
 * Icon size: 20
 * Font: text-sm font-medium
 3. Navigation Menu:
 * Dashboard: Icon LayoutDashboard
 * Reports: Icon ClipboardList
 * Users (Admin only): Icon Users
 * Logout: Icon LogOut (at bottom, mt-auto)
Example Code Structure:
<aside className="fixed left-0 top-0 h-screen w-64 bg-slate-50 border-r border-slate-200 flex flex-col">
 {/* Logo */}
 <div className="h-16 px-6 border-b border-slate-200 flex items-center gap-2">
 <Recycle className="text-emerald-600" size={28} />
 <span className="text-xl font-bold text-emerald-600">EcoWaste</span>
 </div>
 {/* Navigation */}
 <nav className="flex-1 py-4">
 <NavItem icon={LayoutDashboard} label="Dashboard" active />
 <NavItem icon={ClipboardList} label="Reports" />
 {isAdmin && <NavItem icon={Users} label="Users" />}
 </nav>
 {/* Logout */}
 <div className="p-4 border-t border-slate-200">
 <NavItem icon={LogOut} label="Logout" onClick={handleLogout} />
 </div>
</aside>
5.4.2 HEADER COMPONENT (HEADER.TSX)
Structure:
 * Fixed position: fixed top-0 left-64 right-0
 * Height: h-16
 * Background: bg-white
 * Border: border-b border-slate-200
 * Z-index: z-10
Elements:
 1. Left Section:
 * Page title: text-2xl font-semibold text-slate-900
 2. Right Section:
 * User info: Flex container gap-3
 * Avatar: Circle w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center
 * User name: text-sm font-medium text-slate-900
 * User role: text-xs text-slate-500
Example Code:
<header className="fixed top-0 left-64 right-0 h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between z-10">
 <h1 className="text-2xl font-semibold text-slate-900">{pageTitle}</h1>
 <div className="flex items-center gap-3">
 <div className="text-right">
 <p className="text-sm font-medium text-slate-900">{user.full_name}</p>
 <p className="text-xs text-slate-500 capitalize">{user.role}</p>
 </div>
 <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-semibold">
 {user.full_name.charAt(0).toUpperCase()}
 </div>
 </div>
</header>
5.4.3 DASHBOARD STATISTICS CARDS (STATCARD.TSX)
Grid Layout:
 * Container: grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8
Card Structure:
 * Background: bg-white
 * Border: border border-slate-200
 * Rounded: rounded-lg
 * Padding: p-6
 * Shadow: shadow-sm hover:shadow-md transition-shadow
Card Elements:
 1. Icon Container:
 * Size: w-12 h-12
 * Rounded: rounded-lg
 * Background varies by card type:
 * Total Reports: bg-emerald-100 text-emerald-600
 * Organic Waste: bg-green-100 text-green-600
 * Plastic Waste: bg-blue-100 text-blue-600
 * Paper Waste: bg-amber-100 text-amber-600
 2. Value:
 * Font: text-3xl font-bold text-slate-900
 3. Label:
 * Font: text-sm text-slate-600 mt-2
Example Code:
<div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
 <div className="flex items-center justify-between mb-4">
 <div className="w-12 h-12 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
 <FileText size={24} />
 </div>
 </div>
 <p className="text-3xl font-bold text-slate-900">{value}</p>
 <p className="text-sm text-slate-600 mt-2">{label}</p>
</div>
5.4.4 REPORTS TABLE COMPONENT (REPORTTABLE.TSX)
Container:
 * Background: bg-white
 * Border: border border-slate-200
 * Rounded: rounded-lg
 * Overflow: overflow-hidden
Table Structure:
<div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
 <table className="w-full">
 <thead className="bg-slate-50 border-b border-slate-200">
 <tr>
 <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
 Image
 </th>
 <th>Category</th>
 <th>Description</th>
 <th>Location</th>
 <th>Status</th>
 <th>Date</th>
 <th>Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-200">
 {/* Table rows */}
 </tbody>
 </table>
</div>
Table Row Elements:
 1. Image Thumbnail:
 * Size: w-16 h-16
 * Rounded: rounded-lg
 * Object fit: object-cover
 * Cursor: cursor-pointer (click untuk preview)
 2. Category Badge:
 * Padding: px-3 py-1
 * Rounded: rounded-full
 * Font: text-xs font-medium
 * Colors sesuai kategori (lihat section 5.1)
 3. Status Badge:
 * Padding: px-3 py-1
 * Rounded: rounded-full
 * Font: text-xs font-medium
 * Colors sesuai status (lihat section 5.1)
 4. Actions:
 * Icon buttons: w-8 h-8 rounded hover:bg-slate-100
 * Icons: Eye (view), Edit (update status - admin only), Trash2 (delete)
5.4.5 REPORT DETAIL MODAL (REPORTDETAILMODAL.TSX)
Modal Overlay:
 * Position: fixed inset-0
 * Background: bg-black bg-opacity-50
 * Z-index: z-50
Modal Content:
 * Max width: max-w-2xl
 * Margin: mx-auto mt-20
 * Background: bg-white
 * Rounded: rounded-lg
 * Shadow: shadow-xl
Modal Sections:
 1. Header:
 * Padding: px-6 py-4
 * Border: border-b border-slate-200
 * Title: text-xl font-semibold text-slate-900
 * Close button: w-8 h-8 rounded hover:bg-slate-100
 2. Body:
 * Padding: p-6
 * Grid: grid grid-cols-2 gap-4 untuk info fields
 3. Image Display:
 * Full width: w-full
 * Max height: max-h-96
 * Rounded: rounded-lg
 * Object fit: object-cover
 4. Location Link:
 * Link ke Google Maps: https://www.google.com/maps?q={latitude},{longitude}
 * Style: text-emerald-600 hover:text-emerald-700 underline flex items-center gap-1
 * Icon: Lucide MapPin
Example Modal Structure:
<div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
 <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
 {/* Header */}
 <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center sticky top-0 bg-white">
 <h2 className="text-xl font-semibold text-slate-900">Report Details</h2>
 <button onClick={onClose} className="w-8 h-8 rounded hover:bg-slate-100 flex items-center justify-center">
 <X size={20} />
 </button>
 </div>
 {/* Body */}
 <div className="p-6">
 {/* Image */}
 <img src={report.image_url} className="w-full max-h-96 object-cover rounded-lg mb-6" />
 {/* Info Grid */}
 <div className="grid grid-cols-2 gap-4 mb-4">
 <InfoField label="Category" value={<CategoryBadge category={report.category} />} />
 <InfoField label="Status" value={<StatusBadge status={report.status} />} />
 <InfoField label="Reporter" value={report.user_name} />
 <InfoField label="Date" value={formatDate(report.created_at)} />
 </div>
 {/* Description */}
 <div className="mb-4">
 <p className="text-sm font-medium text-slate-600 mb-1">Description</p>
 <p className="text-sm text-slate-900">{report.description}</p>
 </div>
 {/* Location */}
 <div>
 <p className="text-sm font-medium text-slate-600 mb-1">Location</p>
 <a 
 href={`https://www.google.com/maps?q=${report.latitude},${report.longitude}`}
 target="_blank"
 className="text-emerald-600 hover:text-emerald-700 underline flex items-center gap-1 text-sm"
 >
 <MapPin size={16} />
 View on Google Maps ({report.latitude}, {report.longitude})
 </a>
 </div>
 </div>
 </div>
</div>
5.4.6 FILTER & SEARCH COMPONENT (REPORTFILTER.TSX)
Container:
 * Flex layout: flex flex-wrap items-center gap-4 mb-6
Elements:
 1. Search Input:
 * Width: flex-1 min-w-64
 * Padding: px-4 py-2
 * Border: border border-slate-200 rounded-lg
 * Icon: Lucide Search positioned absolute left
 2. Category Filter:
 * Select dropdown
 * Padding: px-4 py-2
 * Border: border border-slate-200 rounded-lg
 * Options: ["All Categories", "Organic Waste", "Plastic Waste", "Paper Waste"]
 3. Status Filter:
 * Select dropdown
 * Same styling as category
 * Options: ["All Statuses", "Pending", "In Progress", "Completed", "Rejected"]
 4. Reset Button:
 * Padding: px-4 py-2
 * Border: border border-slate-200 rounded-lg
 * Text: text-slate-600
 * Hover: hover:bg-slate-50
5.4.7 PAGINATION COMPONENT (PAGINATION.TSX)
Container:
 * Flex: flex justify-between items-center mt-6
Left Section:
 * Text: text-sm text-slate-600
 * Content: "Showing {start} to {end} of {total} results"
Right Section:
 * Button group with: Previous, page numbers, Next
 * Active page: bg-emerald-600 text-white
 * Inactive page: bg-white text-slate-700 border border-slate-200 hover:bg-slate-50
 * Disabled: opacity-50 cursor-not-allowed
5.4.8 CHARTS (RECHARTS)
Category Distribution Chart (Pie Chart):
 * Colors: Use category badge colors
 * Size: width={400} height={300}
 * Legend position: bottom
 * Label: Show percentage
Status Distribution Chart (Bar Chart):
 * Colors: Use status badge colors
 * Size: width={600} height={300}
 * X-axis: Status labels
 * Y-axis: Count
 * Grid: strokeDasharray="3 3"
5.4.9 SKELETON LOADER (SKELETONLOADER.TSX)
Usage: Show while data is loading
Structure:
<div className="animate-pulse">
 <div className="h-8 bg-slate-200 rounded w-1/4 mb-4"></div>
 <div className="space-y-3">
 <div className="h-4 bg-slate-200 rounded"></div>
 <div className="h-4 bg-slate-200 rounded w-5/6"></div>
 <div className="h-4 bg-slate-200 rounded w-4/6"></div>
 </div>
</div>
For Table:
 * Show 5-10 skeleton rows
 * Each cell: h-12 bg-slate-200 rounded
5.5 Mobile App Layout (React Native Expo)
5.5.1 COLOR MAPPING (REACT NATIVE STYLESHEET)
export const Colors = {
 primary: '#059669',
 primaryDark: '#047857',
 primaryLight: '#D1FAE5',
 background: '#FFFFFF',
 backgroundSecondary: '#F8FAFC',
 backgroundTertiary: '#F1F5F9',
 border: '#E2E8F0',
 textPrimary: '#0F172A',
 textSecondary: '#475569',
 textTertiary: '#94A3B8',
 statusPending: { bg: '#FEF3C7', text: '#92400E' },
 statusInProgress: { bg: '#DBEAFE', text: '#1E40AF' },
 statusCompleted: { bg: '#D1FAE5', text: '#065F46' },
 statusRejected: { bg: '#FEE2E2', text: '#991B1B' },
 categoryOrganic: { bg: '#DCFCE7', text: '#166534' },
 categoryPlastic: { bg: '#DBEAFE', text: '#1E40AF' },
 categoryPaper: { bg: '#FEF3C7', text: '#92400E' },
 success: '#10B981',
 error: '#EF4444',
 warning: '#F59E0B',
 info: '#3B82F6',
};
5.5.2 LOGIN/REGISTER SCREEN
Layout:
 * SafeAreaView with backgroundColor: Colors.background
 * Centered content with KeyboardAvoidingView
 * Logo area at top (1/3 of screen)
Logo Section:
 * Container: Center aligned, padding 32
 * Icon: Recycle icon (SVG or image) size 80x80
 * App name: fontSize 28, fontWeight 'bold', color primary
 * Tagline: fontSize 14, color textSecondary, marginTop 8
Form Section:
 * Padding horizontal: 24
 * Input container: marginBottom 16
Input Style:
 * Height: 48
 * Padding horizontal: 16
 * Border: 1px solid Colors.border
 * Border radius: 8
 * Background: Colors.background
 * Font size: 14
Button Style:
 * Height: 48
 * Background: Colors.primary
 * Border radius: 8
 * Center aligned text
 * Font size: 16, font weight 600, color white
 * Active opacity: 0.8
Link Text:
 * Font size: 14
 * Color: Colors.primary
 * Text align: center
 * Margin top: 16
5.5.3 BOTTOM TAB NAVIGATION
Tab Bar Style:
 * Height: 60
 * Background: Colors.background
 * Border top: 1px solid Colors.border
 * Padding bottom: Platform-specific safe area
Tab Icons:
 * Size: 24
 * Active color: Colors.primary
 * Inactive color: Colors.textTertiary
Tab Labels:
 * Font size: 12
 * Font weight: 500
 * Active color: Colors.primary
 * Inactive color: Colors.textSecondary
Tab Items:
 1. Home: Icon home (Ionicons)
 2. Create Report: Icon add-circle (Ionicons)
 3. History: Icon time (Ionicons)
 4. Profile: Icon person (Ionicons)
5.5.4 HOME SCREEN (DASHBOARD)
Header Section:
 * Padding: 24
 * Background: Colors.primary (gradient optional)
 * Greeting text: fontSize 16, color white, fontWeight 500
 * User name: fontSize 24, color white, fontWeight bold
 * Margin bottom: 16
Stats Cards:
 * Container: Horizontal scroll view, padding 24
 * Card: Width 160, margin right 12, padding 16
 * Background: Colors.background
 * Border radius: 12
 * Shadow: elevation 2
Card Content:
 * Icon container: width 40, height 40, borderRadius 8, background varies
 * Value: fontSize 24, fontWeight bold, color textPrimary
 * Label: fontSize 12, color textSecondary, marginTop 4
Recent Reports Section:
 * Title: fontSize 18, fontWeight 600, padding horizontal 24, marginBottom 12
 * FlatList with report cards
5.5.5 REPORT CARD COMPONENT
Container:
 * Margin: horizontal 24, bottom 12
 * Padding: 16
 * Background: Colors.background
 * Border: 1px solid Colors.border
 * Border radius: 12
 * Shadow: elevation 2
Layout:
 * Flex direction: row
 * Gap: 12
Image Thumbnail:
 * Width: 80
 * Height: 80
 * Border radius: 8
 * Background: Colors.backgroundSecondary
Content Section:
 * Flex: 1
Category Badge:
 * Padding: horizontal 8, vertical 4
 * Border radius: 12
 * Font size: 11
 * Font weight: 600
 * Self: flex-start
 * Margin bottom: 4
Description:
 * Font size: 14
 * Color: textPrimary
 * Number of lines: 2
 * Margin bottom: 4
Meta Row:
 * Flex direction: row
 * Justify content: space-between
 * Align items: center
Status Badge:
 * Same style as category badge
Date Text:
 * Font size: 12
 * Color: textTertiary
5.5.6 CREATE REPORT SCREEN
Container:
 * Padding: 24
 * Background: Colors.background
Image Upload Section:
 * Border: 2px dashed Colors.border
 * Border radius: 12
 * Padding: 32
 * Center aligned
 * Margin bottom: 24
 * Background: Colors.backgroundSecondary
When No Image:
 * Icon: Camera size 48, color textTertiary
 * Text: "Tap to take photo or choose from gallery"
 * Font size: 14, color textSecondary
When Image Selected:
 * Image: width full, height 240, border radius 12, marginBottom 12
 * Change button: fontSize 14, color primary, textDecorationLine underline
AI Detection Button:
 * Height: 48
 * Background: Colors.info (blue)
 * Border radius: 8
 * Flex direction: row, center aligned
 * Icon: Sparkles size 20, color white
 * Text: "Detect Waste Type with AI", color white, fontWeight 600
 * Margin vertical: 16
Loading State:
 * ActivityIndicator: color Colors.primary, size large
 * Text: "Analyzing image...", fontSize 14, color textSecondary, marginTop 12
AI Result Card:
 * Padding: 16
 * Background: Colors.primaryLight
 * Border radius: 8
 * Margin vertical: 12
Result Content:
 * Title: "AI Detection Result", fontSize 14, fontWeight 600, color primary
 * Category: fontSize 18, fontWeight bold, color textPrimary, marginTop 4
 * Confidence bar: height 8, borderRadius 4, background textTertiary, marginTop 8
 * Filled confidence: position absolute, height 8, borderRadius 4, background primary
Input Label:
 * Font size: 14
 * Font weight: 600
 * Color: textPrimary
 * Margin bottom: 8
Text Input:
 * Height: 48 (single line) or 96 (multiline)
 * Padding: 12
 * Border: 1px solid Colors.border
 * Border radius: 8
 * Font size: 14
 * Margin bottom: 16
Category Picker:
 * Height: 48
 * Border: 1px solid Colors.border
 * Border radius: 8
 * Padding horizontal: 12
Location Display:
 * Flex direction: row
 * Align items: center
 * Padding: 12
 * Background: Colors.backgroundSecondary
 * Border radius: 8
 * Margin bottom: 16
Submit Button:
 * Height: 48
 * Background: Colors.primary
 * Border radius: 8
 * Font size: 16, fontWeight 600, color white
 * Margin top: 24
Button Disabled State:
 * Opacity: 0.5
5.5.7 HISTORY SCREEN
Header:
 * Padding: 24, paddingTop 48
 * Background: Colors.background
 * Border bottom: 1px solid Colors.border
Title:
 * Font size: 24
 * Font weight: bold
 * Color: textPrimary
Filter Pills:
 * Horizontal scroll view, padding vertical 16
 * Pill: padding horizontal 16, vertical 8, marginRight 8, borderRadius 20
 * Active: background primary, color white
 * Inactive: background backgroundSecondary, color textSecondary
Report List:
 * FlatList with ReportCard components
 * Item separator: height 12
 * Content container padding: 24
 * Empty state: center aligned, icon + text
5.5.8 PROFILE SCREEN
Header Section:
 * Padding: 24, paddingTop 48
 * Background: Colors.primary
 * Center aligned
Avatar:
 * Width: 80, height: 80
 * Border radius: 40
 * Background: white
 * Center aligned text
 * Font size: 32, fontWeight bold, color primary
User Info:
 * Name: fontSize 20, fontWeight bold, color white, marginTop 12
 * Email: fontSize 14, color white, opacity 0.9, marginTop 4
Menu Section:
 * Padding: 24
 * Background: Colors.background
Menu Item:
 * Flex direction: row
 * Align items: center
 * Justify content: space-between
 * Padding vertical: 16
 * Border bottom: 1px solid Colors.border
Menu Icon:
 * Width: 40, height: 40
 * Border radius: 8
 * Background: backgroundSecondary
 * Center aligned icon
Menu Text:
 * Font size: 16
 * Color: textPrimary
 * Margin left: 12
Logout Button:
 * Margin top: 24
 * Padding: 16
 * Background: Colors.error
 * Border radius: 8
 * Center aligned
 * Font size: 16, fontWeight 600, color white
5.5.9 LOADING OVERLAY
Container:
 * Position: absolute
 * Top: 0, left: 0, right: 0, bottom: 0
 * Background: rgba(0, 0, 0, 0.5)
 * Center aligned
 * Z-index: 999
Content:
 * Background: white
 * Padding: 24
 * Border radius: 12
 * Center aligned
Spinner:
 * ActivityIndicator: size large, color primary
Text:
 * Font size: 14
 * Color: textSecondary
 * Margin top: 12
5.6 Animation Guidelines
Web (React):
 * Transitions: transition-all duration-200 ease-in-out
 * Hover states: Scale 1.02 untuk buttons
 * Modal entrance: Fade in + scale from 0.95
 * Skeleton loading: Pulse animation
Mobile (React Native):
 * Use Animated API untuk smooth transitions
 * Button press: Scale down to 0.95
 * Modal slide up: translateY animation
 * Loading states: Fade opacity 0.5 to 1
5.7 Accessibility Requirements
Web:
 * Semantic HTML (<button>, <nav>, <main>, <header>)
 * ARIA labels untuk icon buttons
 * Focus states: focus:ring-2 focus:ring-emerald-500
 * Keyboard navigation support
 * Alt text untuk semua images
 * Contrast ratio minimal 4.5:1
Mobile:
 * accessibilityLabel untuk semua touchable elements
 * accessibilityRole untuk semantic meaning
 * Minimum touch target: 44x44 points
 * High contrast mode support
 * Screen reader compatible
----------------------------------------
6. EMPAT (4) PROMPT EKSEKUSI MANDIRI UNTUK GPT-6.1 SOL
6.6.1 Prompt Eksekusi 1: Setup Supabase SQL & Script ML Training
Kamu adalah Expert Python ML Engineer dan Database Architect. Tugasmu adalah membuat 2 deliverable:
1. **SQL Setup Script** yang siap dijalankan di Supabase SQL Editor untuk membuat database schema lengkap Smart Waste Management System, termasuk:
 - ENUM types: user_role, waste_category, report_status
 - Tabel users dengan semua kolom sesuai spec
 - Tabel waste_reports dengan foreign key ke users
 - Semua indexes untuk performa query
 - Triggers untuk auto-update updated_at
 - Insert default admin user dengan password hash bcrypt
2. **Complete Training Script** `backend-ml/ml/train.py` yang melakukan:
 - Load dataset dari folder train/val/test dengan struktur 3 kategori: "Organic Waste", "Plastic Waste", "Paper Waste"
 - Implementasi Data Augmentation lengkap (RandomCrop, Flip, Rotation, ColorJitter)
 - Load MobileNetV2 pretrained, freeze base layers, tambahkan custom classification head
 - Training loop dengan early stopping (patience=5), learning rate scheduler
 - Simpan best model berdasarkan validation accuracy
 - Testing phase dengan evaluasi lengkap
 - Generate dan save 3 output files: confusion_matrix.png, training_history.png, classification_report.txt
 - Print accuracy dan warning jika <85%
TIDAK BOLEH ada placeholder atau "...". Tulis semua kode lengkap dan siap run tanpa edit manual. Gunakan exact enum values dan color palette dari SPEC.md section 2 dan 5.
----------------------------------------
6.6.2 Prompt Eksekusi 2: Unified FastAPI Backend + ML Inference + Supabase Integration
Kamu adalah Expert Backend Engineer dengan spesialisasi FastAPI, PostgreSQL, dan ML Serving. Tugasmu adalah membuat complete FastAPI backend di folder `backend-ml/` dengan struktur:
**File yang HARUS dibuat (tanpa placeholder):**
1. `requirements.txt` - Semua dependencies dengan pinned versions:
 - fastapi, uvicorn, sqlalchemy, psycopg2-binary, python-jose, passlib, bcrypt, python-multipart
 - torch, torchvision, Pillow
 - supabase, python-dotenv
2. `app/config.py` - Load semua environment variables dari .env menggunakan pydantic BaseSettings
3. `app/database.py` - SQLAlchemy engine setup dengan connection ke Supabase PostgreSQL
4. `app/models.py` - SQLAlchemy ORM models untuk User dan WasteReport dengan exact field names dan types sesuai SQL schema di SPEC.md section 2
5. `app/schemas.py` - Pydantic schemas untuk semua request/response:
 - UserRegister, UserLogin, UserResponse
 - ReportCreate, ReportUpdate, ReportResponse
 - PredictionResponse, StatsResponse
 - Gunakan exact enum values dari SPEC.md
6. `app/auth.py` - JWT authentication functions:
 - create_access_token() menggunakan python-jose
 - verify_password() dan get_password_hash() dengan bcrypt
 - get_current_user() dependency
7. `app/dependencies.py` - Dependency functions untuk role checking (require_admin)
8. `app/supabase_client.py` - Supabase client initialization dan upload_image() function
9. `app/ml_predictor.py` - WasteClassifier class yang load PyTorch model dan predict() method sesuai SPEC.md section 4.3
10. `app/routers/auth.py` - Auth endpoints: /register, /login, /me
11. `app/routers/reports.py` - Reports CRUD endpoints dengan filtering, pagination, authorization logic
12. `app/routers/users.py` - Users management endpoints (admin only)
13. `app/routers/stats.py` - Dashboard statistics endpoint
14. `app/routers/prediction.py` - ML prediction endpoint /predict
15. `main.py` - FastAPI app initialization, CORS middleware, include all routers
**Requirements:**
- Implementasi FULL business logic sesuai SPEC.md section 3 (authorization rules, validation, error handling)
- Semua response menggunakan format standar: {success, message, data}
- Proper HTTP status codes
- CORS configuration untuk accept Vercel dan localhost
- Gunakan async/await untuk database operations
- Image upload ke Supabase Storage dan simpan public URL ke database
- ML model inference dengan proper error handling
Tulis SEMUA file lengkap tanpa "# ... rest of the code" atau "# implement the rest". Kode harus production-ready dan bisa langsung di-run dengan `uvicorn main:app --reload`.
----------------------------------------
6.6.3 Prompt Eksekusi 3: React Vite Web Dashboard + Konfigurasi Vercel
Kamu adalah Expert Frontend Engineer dengan spesialisasi React, TypeScript, dan Tailwind CSS. Tugasmu adalah membuat complete web application di folder `web/` menggunakan React + Vite + TypeScript + Tailwind CSS dengan fitur:
**File Structure (SEMUA harus dibuat):**
1. Config files:
 - `package.json` dengan semua dependencies (react, react-dom, react-router-dom, axios, lucide-react, recharts, tailwindcss)
 - `vite.config.ts` dengan proper proxy untuk development
 - `tailwind.config.js` dengan custom colors dari SPEC.md section 5.1
 - `vercel.json` dengan SPA routing config
 - `tsconfig.json` untuk TypeScript
2. `src/api/axios.ts` - Axios instance dengan baseURL dari env, request interceptor untuk JWT token
3. `src/api/*.api.ts` - API client functions untuk semua endpoints (auth, reports, users, stats)
4. `src/contexts/AuthContext.tsx` - Context provider dengan login, logout, register functions, current user state
5. `src/components/layout/` - Layout components (Sidebar, Header, Layout) dengan exact styling dari SPEC.md section 5.4
6. `src/components/common/` - Reusable components (Button, Input, Modal, Table, Pagination, SkeletonLoader, StatusBadge, CategoryBadge) dengan proper Tailwind classes
7. `src/components/dashboard/` - Dashboard specific components (StatCard, CategoryChart, StatusChart menggunakan Recharts)
8. `src/components/reports/` - Reports components (ReportTable, ReportFilter, ReportDetailModal dengan Google Maps link, CreateReportModal, UpdateStatusModal)
9. `src/components/users/` - Users components (UserTable, EditUserModal, DeleteUserModal)
10. `src/pages/` - Page components:
 - LoginPage - Form dengan validation
 - DashboardPage - Stats cards + charts
 - ReportsPage - Table dengan filter, search, pagination, CRUD actions
 - UsersPage - User management (admin only)
11. `src/types/*.types.ts` - TypeScript interfaces untuk User, Report, API responses
12. `src/utils/constants.ts` - Constants (API_URL, enum values, badge colors)
13. `src/App.tsx` - Router setup dengan ProtectedRoute component untuk authorization
14. `src/main.tsx` - React entry point
15. `src/index.css` - Tailwind imports + custom global styles
**Styling Requirements:**
- Gunakan EXACT color palette dari SPEC.md section 5.1 (no purple gradients!)
- Follow layout specifications dari section 5.4 (sidebar width 256px, header height 64px, dll)
- Implement responsive design dengan Tailwind breakpoints
- StatusBadge dan CategoryBadge dengan proper colors sesuai spec
- Recharts dengan eco-modern theme
- Loading states dengan skeleton loaders
- Modal dengan backdrop blur
- Google Maps link format: https://www.google.com/maps?q={lat},{lng}
**Functional Requirements:**
- Role-based rendering (admin melihat Users menu, user tidak)
- Client-side filtering dan pagination
- Image preview modal dengan full image
- Form validation dengan error messages
- Toast notifications untuk success/error
- Logout dengan clear token
- Axios interceptor untuk handle 401 (redirect ke login)
Tulis SEMUA components lengkap dengan proper TypeScript types, proper error handling, dan exact Tailwind classes. TIDAK BOLEH ada "// Add more fields" atau "// Implement handler". Kode harus bisa di-build dengan `npm run build` dan deploy ke Vercel tanpa error.
----------------------------------------
6.6.4 Prompt Eksekusi 4: React Native Expo Mobile App
Kamu adalah Expert Mobile Developer dengan spesialisasi React Native dan Expo. Tugasmu adalah membuat complete mobile application di folder `mobile/` menggunakan React Native + Expo + TypeScript dengan fitur:
**File Structure (SEMUA harus dibuat):**
1. Config files:
 - `package.json` dengan dependencies (expo, expo-router, expo-image-picker, expo-location, axios, @react-native-async-storage/async-storage)
 - `app.json` dengan permissions untuk camera, photo library, location; expo-router config
 - `tsconfig.json` untuk TypeScript
 - `babel.config.js` untuk Expo
2. `app/_layout.tsx` - Root layout dengan AuthContext provider
3. `app/index.tsx` - Initial route dengan redirect logic (logged in → tabs, logged out → auth/login)
4. `app/(auth)/_layout.tsx` - Auth stack layout
5. `app/(auth)/login.tsx` - Login screen dengan form validation, exact styling dari SPEC.md section 5.5.2
6. `app/(auth)/register.tsx` - Register screen dengan form
7. `app/(tabs)/_layout.tsx` - Bottom tabs navigation dengan 4 tabs (Home, Create Report, History, Profile)
8. `app/(tabs)/home.tsx` - Dashboard screen dengan stats cards dan recent reports list
9. `app/(tabs)/create-report.tsx` - Create report screen dengan:
 - Image picker (camera + gallery) menggunakan expo-image-picker
 - GPS location auto-fill menggunakan expo-location
 - AI Detection button yang kirim gambar ke /api/v1/predict
 - Loading state dengan animation
 - AI result display dengan confidence bar
 - Form fields (description, category dropdown)
 - Submit button
10. `app/(tabs)/history.tsx` - Report history screen dengan filter pills dan FlatList
11. `app/(tabs)/profile.tsx` - Profile screen dengan user info, menu items, logout
12. `components/common/` - Reusable components (Button, Input, Card, StatusBadge, LoadingOverlay) dengan exact styling dari SPEC.md section 5.5
13. `components/reports/` - Report specific components (ReportCard, ImagePicker, LocationDisplay, AIDetectionResult)
14. `api/client.ts` - Axios instance untuk API calls dengan JWT token dari AsyncStorage
15. `api/*.api.ts` - API functions (auth, reports, prediction)
16. `contexts/AuthContext.tsx` - Auth context dengan AsyncStorage untuk token persistence
17. `hooks/useAuth.ts`, `hooks/useLocation.ts`, `hooks/useImagePicker.ts` - Custom hooks
18. `types/*.types.ts` - TypeScript interfaces
19. `utils/constants.ts` - Constants dengan Colors object sesuai SPEC.md section 5.5.1
**Styling Requirements:**
- Gunakan StyleSheet.create untuk semua styles
- Colors exact match dengan web (emerald green #059669, slate neutrals)
- StatusBadge dan CategoryBadge dengan proper background + text colors
- Typography sizes dan weights sesuai SPEC.md
- SafeAreaView untuk semua screens
- KeyboardAvoidingView untuk form screens
- Proper spacing (padding 24 untuk containers, 16 untuk cards)
**Functional Requirements:**
- AsyncStorage untuk persist JWT token
- Auto-redirect jika token expired
- Image picker dengan both camera dan gallery options
- Request camera dan location permissions
- GPS location auto-fill saat create report
- AI Detection flow:
 1. User pilih gambar
 2. Klik "Detect with AI" button
 3. Show loading spinner
 4. Call /api/v1/predict
 5. Display result dengan confidence bar dan predicted category
 6. Auto-fill category dropdown
- Form validation dengan error messages
- Pull-to-refresh untuk history
- Proper error handling dengan Alert
- Bottom tabs dengan active/inactive states
**AI Detection UI Details:**
- Button: Background blue (#3B82F6), icon sparkles
- Loading: ActivityIndicator with "Analyzing image..." text
- Result card: Background emerald-light (#D1FAE5), show predicted category and confidence
- Confidence bar: Height 8, border radius 4, animated width based on percentage
Tulis SEMUA screens dan components lengkap dengan proper TypeScript, permissions handling, dan exact styling. TIDAK BOLEH ada "// TODO" atau "// Implement". Kode harus bisa di-run dengan `npx expo start` tanpa error. Test di iOS dan Android simulator.
----------------------------------------
PENUTUP
Dokumen SPEC.md ini adalah Single Source of Truth untuk pembangunan Smart Waste Management System. Setiap bagian telah dirancang dengan detail maksimal untuk menghilangkan ambiguitas dan memastikan GPT-6.1 Sol dapat mengeksekusi implementasi tanpa menebak-nebak.
Key Points untuk Eksekusi:
 1. Gunakan 4 prompt di section 6 secara sequential (1 → 2 → 3 → 4)
 2. Verifikasi setiap output sebelum lanjut ke prompt berikutnya
 3. Test database schema di Supabase SQL Editor setelah prompt 1
 4. Train ML model dan verifikasi accuracy >85% setelah prompt 1
 5. Test FastAPI backend dengan Swagger docs (/docs) setelah prompt 2
 6. Deploy web ke Vercel dan test semua fitur setelah prompt 3
 7. Test mobile app di Expo Go setelah prompt 4
Timeline Rekomendasi:
 * Day 1: Database setup + ML training (Prompt 1)
 * Day 2: FastAPI backend development (Prompt 2)
 * Day 3: Web frontend development (Prompt 3)
 * Day 4: Mobile app development (Prompt 4)
 * Day 5: Integration testing, bug fixes, deployment
Good luck dengan implementasinya! 🚀