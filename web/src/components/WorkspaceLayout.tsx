import { useState } from "react";
import type { ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import {
  BookOpen,
  Camera,
  ClipboardList,
  House,
  LayoutDashboard,
  MapPin,
  Menu,
  UserRound,
  Users,
} from "lucide-react";
import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";
import { Dialog } from "../ui";

const userLinks = [
  { path: "/app", label: "Komunitas", icon: House },
  { path: "/map", label: "Peta", icon: MapPin },
  { path: "/reports", label: "Laporan", icon: ClipboardList },
  { path: "/guide", label: "Panduan", icon: BookOpen },
];
const adminLinks = [
  { path: "/dashboard", label: "Ringkasan", icon: LayoutDashboard },
  { path: "/reports", label: "Laporan", icon: ClipboardList },
  { path: "/users", label: "Pengguna", icon: Users },
  { path: "/moderation", label: "Moderasi", icon: ClipboardList },
];
export default function WorkspaceLayout({
  admin,
  offline,
  children,
}: {
  admin: boolean;
  offline: boolean;
  children: ReactNode;
}) {
  const [drawer, setDrawer] = useState(false);
  const adminNav = (
    <>
      <p className="nav-caption">PENGELOLAAN</p>
      <nav aria-label="Navigasi admin">
        {adminLinks.map(({ path, label, icon: Icon }) => (
          <NavLink key={path} to={path} onClick={() => setDrawer(false)}>
            <Icon size={20} />
            {label}
          </NavLink>
        ))}
      </nav>
      <Link
        className="button secondary admin-community"
        to="/app"
        onClick={() => setDrawer(false)}
      >
        <House size={18} />
        Lihat komunitas
      </Link>
    </>
  );
  return (
    <div className={admin ? "app-shell" : "user-shell"}>
      <a href="#main" className="skip-link">
        Lewati ke konten
      </a>
      <SiteHeader />
      {admin && (
        <>
          <aside className="sidebar">{adminNav}</aside>
          {drawer && (
            <Dialog title="Navigasi admin" onClose={() => setDrawer(false)}>
              <div className="mobile-nav">{adminNav}</div>
            </Dialog>
          )}
        </>
      )}
      <div className={admin ? "workspace" : "user-workspace"}>
        {admin && (
          <header className="topbar">
            <button
              className="icon-button mobile-menu"
              aria-label="Buka navigasi"
              onClick={() => setDrawer(true)}
            >
              <Menu />
            </button>
            <span>Panel admin</span>
            <Link to="/app">Lihat komunitas</Link>
          </header>
        )}
        {offline && (
          <div className="offline" role="status">
            Sedang offline. Perubahan memerlukan koneksi internet.
          </div>
        )}
        <main id="main" className={admin ? "main-content" : "user-content"}>
          {children}
        </main>
      </div>
      <SiteFooter />
      {!admin && (
        <nav className="user-bottom-nav" aria-label="Navigasi bawah">
          {userLinks.slice(0, 2).map(({ path, label, icon: Icon }) => (
            <NavLink key={path} to={path}>
              <Icon size={22} />
              <span>{label}</span>
            </NavLink>
          ))}
          <NavLink to="/reports/new" className="capture-link">
            <span>
              <Camera size={27} />
            </span>
            Foto
          </NavLink>
          <NavLink to="/reports" end>
            <ClipboardList size={22} />
            <span>Laporan</span>
          </NavLink>
          <NavLink to="/profile">
            <UserRound size={22} />
            <span>Profil</span>
          </NavLink>
        </nav>
      )}
    </div>
  );
}
