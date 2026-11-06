import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  ScanLine,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "../Auth";
import { ApiError } from "../api";
import "./workspace-pages.css";
export default function Profile() {
  const { user, logout, deleteAccount, updatePublicName } = useAuth();
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [updatingPublicName, setUpdatingPublicName] = useState(false);
  const [publicNameError, setPublicNameError] = useState("");
  const [publicNameMessage, setPublicNameMessage] = useState("");

  async function changePublicNameVisibility(visible: boolean) {
    setUpdatingPublicName(true);
    setPublicNameError("");
    setPublicNameMessage("");
    try {
      await updatePublicName(visible);
      setPublicNameMessage(
        visible ? "Nama akun kini terlihat pada postinganmu." : "Nama akun disembunyikan dari postinganmu.",
      );
    } catch (error) {
      setPublicNameError(
        error instanceof ApiError && error.status === 404
          ? "Layanan pengaturan nama komunitas tidak ditemukan. Muat ulang API WasteWise, lalu coba lagi."
          : error instanceof Error
            ? error.message
            : "Pengaturan nama komunitas gagal disimpan. Coba lagi.",
      );
    } finally {
      setUpdatingPublicName(false);
    }
  }

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

  const links = [
    {
      to: "/dashboard",
      title: user?.role === "admin" ? "Panel admin" : "Ringkasan",
      description: "Lihat ikhtisar aktivitas laporan.",
      icon: LayoutDashboard,
    },
    {
      to: "/reports",
      title: user?.role === "admin" ? "Kelola laporan" : "Laporan saya",
      description: "Periksa foto dan status penanganan.",
      icon: ClipboardList,
    },
    {
      to: "/classify",
      title: "Klasifikasi foto",
      description: "Perkirakan kategori dari sebuah foto.",
      icon: ScanLine,
    },
    {
      to: "/guide",
      title: "Panduan memilah",
      description: "Cari cara menangani tiap material.",
      icon: BookOpen,
    },
  ];

  return (
    <section className="ww-profile-page" aria-labelledby="profile-title">
      <header className="ww-page-intro">
        <div>
          <h1 id="profile-title">Profil</h1>
          <p>Kelola akun, akses cepat, dan pilihan privasimu.</p>
        </div>
      </header>
      <div className="ww-profile-layout">
        <div className="ww-profile-main">
          <section className="ww-identity-panel" aria-label="Informasi akun">
            <span className="ww-profile-avatar" aria-hidden="true">
              {user?.full_name.trim().charAt(0).toUpperCase() || "W"}
            </span>
            <div className="ww-identity-copy">
              <h2>{user?.full_name}</h2>
              <p>{user?.email}</p>
              <span className="ww-role-label">
                {user?.role === "admin" ? "Pengelola" : "Pengguna WasteWise"}
              </span>
            </div>
            <button
              className="ww-button ww-button-secondary ww-logout"
              type="button"
              onClick={() => void logout()}
            >
              <LogOut size={17} />
              Keluar
            </button>
          </section>

          <section className="ww-profile-shortcuts" aria-labelledby="profile-links-title">
            <div className="ww-section-heading">
              <div>
                <h2 id="profile-links-title">Akses cepat</h2>
                <p>Bagian WasteWise yang sering kamu gunakan.</p>
              </div>
            </div>
            <nav className="ww-profile-links" aria-label="Akses cepat akun">
              {links.map(({ to, title, description, icon: Icon }) => (
                <Link to={to} key={to}>
                  <Icon size={20} aria-hidden="true" />
                  <span>
                    <strong>{title}</strong>
                    <small>{description}</small>
                  </span>
                  <ArrowRight size={17} aria-hidden="true" />
                </Link>
              ))}
              <Link to="/onboarding">
                <BookOpen size={20} aria-hidden="true" />
                <span>
                  <strong>Cara memakai WasteWise</strong>
                  <small>Pelajari alur laporan dari awal.</small>
                </span>
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
            </nav>
          </section>
        </div>
        <aside className="ww-profile-settings">
          <section className="ww-privacy-note" aria-labelledby="privacy-title">
            <ShieldCheck size={21} aria-hidden="true" />
            <div>
              <h2 id="privacy-title">Privasi laporan</h2>
              <p>
                Laporan baru bersifat privat. Foto, deskripsi, dan lokasi
                presisi hanya terlihat publik jika kamu membagikannya. Lokasi
                berasal dari pelapor dan belum diverifikasi; laporan yang
                ditolak tidak ditampilkan di komunitas.
              </p>
            </div>
          </section>
          <section
            className="ww-public-name-panel"
            aria-labelledby="public-name-title"
          >
            <div>
              <h2 id="public-name-title">Nama di komunitas</h2>
              <p id="public-name-description">
                Pilihan ini berlaku untuk posting yang sudah dan akan kamu
                bagikan. Email tetap privat; komentar tetap tampil sebagai
                “Warga”.
              </p>
            </div>
            <label className="ww-public-name-toggle">
              <input
                type="checkbox"
                role="switch"
                aria-describedby="public-name-description"
                checked={user?.public_name_visible ?? false}
                disabled={updatingPublicName}
                onChange={(event) =>
                  void changePublicNameVisibility(event.target.checked)
                }
              />
              <span>Tampilkan nama akun pada postingan komunitas</span>
            </label>
            {publicNameError && (
              <p className="ww-form-error" role="alert">
                {publicNameError}
              </p>
            )}
            {publicNameMessage && (
              <p className="ww-form-success" role="status">
                {publicNameMessage}
              </p>
            )}
          </section>
          <section className="ww-delete-panel" aria-labelledby="account-delete-title">
            <h2 id="account-delete-title">Hapus akun</h2>
            <p>
              Akun, laporan, draft, posting, komentar, dan suka akan dihapus.
              Foto masuk antrean penghapusan; tautan yang sudah terbit dapat
              berlaku sampai 15 menit dan salinan unduhan tidak dapat ditarik.
            </p>
            {!showDelete ? (
              <button
                className="ww-button ww-button-danger"
                type="button"
                onClick={() => setShowDelete(true)}
              >
                Hapus akun permanen
              </button>
            ) : (
              <form className="ww-delete-form" onSubmit={submitDelete}>
                <label htmlFor="account-current-password">
                  Kata sandi saat ini
                  <input
                    id="account-current-password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
                </label>
                <label htmlFor="account-delete-confirmation">
                  Ketik HAPUS AKUN untuk melanjutkan
                  <input
                    id="account-delete-confirmation"
                    autoComplete="off"
                    value={confirmation}
                    onChange={(event) => setConfirmation(event.target.value)}
                    required
                  />
                </label>
                {deleteError && (
                  <p className="ww-form-error" role="alert">
                    {deleteError}
                  </p>
                )}
                <div className="ww-delete-actions">
                  <button
                    className="ww-button ww-button-secondary"
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
                    className="ww-button ww-button-danger"
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
        </aside>
      </div>
    </section>
  );
}
