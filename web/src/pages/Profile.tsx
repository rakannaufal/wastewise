import { Link } from "react-router-dom";
import {
  BookOpen,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  ScanLine,
} from "lucide-react";
import { useAuth } from "../Auth";
export default function Profile() {
  const { user, logout } = useAuth();
  return (
    <section className="account-page">
      <div className="page-heading">
        <div>
          <h1>Profil</h1>
          <p>Akun dan aktivitas WasteWise kamu.</p>
        </div>
      </div>
      <div className="account-summary">
        <span className="avatar">{user?.full_name[0]}</span>
        <div>
          <h2>{user?.full_name}</h2>
          <p>{user?.email}</p>
          <small>{user?.role === "admin" ? "Pengelola" : "Pengguna"}</small>
        </div>
      </div>
      <nav className="account-pages" aria-label="Menu akun">
        <Link to="/dashboard">
          <LayoutDashboard size={20} />
          {user?.role === "admin" ? "Panel admin" : "Ringkasan"}
        </Link>
        <Link to="/reports">
          <ClipboardList size={20} />
          {user?.role === "admin" ? "Kelola laporan" : "Laporan saya"}
        </Link>
        <Link to="/classify">
          <ScanLine size={20} />
          Klasifikasi foto
        </Link>
        <Link to="/guide">
          <BookOpen size={20} />
          Panduan memilah
        </Link>
        <Link to="/onboarding">Cara memakai WasteWise</Link>
      </nav>
      <p className="account-privacy">
        Laporan baru otomatis menampilkan foto, deskripsi opsional, dan GPS
        presisi kepada publik, termasuk pengunjung tanpa akun. Laporan Ditolak
        tidak ditampilkan.
      </p>
      <button className="button secondary" onClick={() => void logout()}>
        <LogOut size={18} />
        Keluar
      </button>
    </section>
  );
}
