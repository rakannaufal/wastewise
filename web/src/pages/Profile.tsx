import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BookOpen,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  ScanLine,
} from "lucide-react";
import { useAuth } from "../Auth";
export default function Profile() {
  const { user, logout, deleteAccount } = useAuth();
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [deleteError, setDeleteError] = useState("");

  async function submitDelete(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDeleting(true);
    setDeleteError("");
    try {
      await deleteAccount(password);
      navigate("/", { replace: true });
    } catch (error) {
      setDeleteError((error as Error).message);
    } finally {
      setDeleting(false);
    }
  }

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
        Laporan baru bersifat privat. Foto, deskripsi, dan lokasi presisi hanya
        tampil kepada publik jika kamu memilih untuk membagikannya. Lokasi
        berasal dari pelapor dan tidak diverifikasi. Laporan Ditolak tidak
        ditampilkan.
      </p>
      <button className="button secondary" onClick={() => void logout()}>
        <LogOut size={18} />
        Keluar
      </button>
      <section className="account-delete" aria-labelledby="account-delete-title">
        <h2 id="account-delete-title">Hapus akun</h2>
        <p>
          Akun, laporan, draft, posting, komentar, dan suka akan dihapus. Foto
          masuk antrean penghapusan; tautan yang sudah terbit dapat berlaku
          sampai 15 menit dan salinan unduhan tidak dapat ditarik.
        </p>
        {!showDelete ? (
          <button
            className="button danger"
            type="button"
            onClick={() => setShowDelete(true)}
          >
            Hapus akun permanen
          </button>
        ) : (
          <form className="account-delete-form" onSubmit={submitDelete}>
            <label>
              Kata sandi saat ini
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>
            <label>
              Ketik HAPUS AKUN untuk melanjutkan
              <input
                autoComplete="off"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                required
              />
            </label>
            {deleteError && (
              <p className="account-delete-error" role="alert">
                {deleteError}
              </p>
            )}
            <div className="account-delete-actions">
              <button
                className="button secondary"
                type="button"
                disabled={deleting}
                onClick={() => {
                  setShowDelete(false);
                  setPassword("");
                  setConfirmation("");
                  setDeleteError("");
                }}
              >
                Batalkan
              </button>
              <button
                className="button danger"
                type="submit"
                disabled={
                  deleting || !password || confirmation !== "HAPUS AKUN"
                }
              >
                {deleting ? "Menghapus akun…" : "Hapus permanen"}
              </button>
            </div>
          </form>
        )}
      </section>
    </section>
  );
}
