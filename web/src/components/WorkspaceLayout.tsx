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
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";
import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";
import { Brand, Dialog } from "../ui";

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
  { path: "/moderation", label: "Moderasi", icon: ShieldCheck },
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
    <div className="admin-sidebar-nav">
      <p className="nav-caption">PENGELOLAAN</p>
      <nav className="admin-navigation" aria-label="Navigasi admin">
        {adminLinks.map(({ path, label, icon: Icon }) => (
          <NavLink key={path} to={path} onClick={() => setDrawer(false)}>
            <Icon size={19} aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </nav>
      <Link
        className="admin-community-link"
        to="/app"
        onClick={() => setDrawer(false)}
      >
        <House size={18} aria-hidden="true" />
        Lihat komunitas
      </Link>
    </div>
  );
  return (
    <div className={admin ? "app-shell admin-shell" : "user-shell"}>
      <a href="#main" className="skip-link">
        Lewati ke konten
      </a>
      {admin && (
        <>
          <aside className="sidebar admin-sidebar">
            <Link
              className="admin-sidebar-brand"
              to="/dashboard"
              aria-label="WasteWise, panel admin"
            >
              <Brand />
            </Link>
            {adminNav}
          </aside>
          {drawer && (
            <Dialog title="Navigasi admin" onClose={() => setDrawer(false)}>
              <div className="mobile-nav admin-mobile-nav">{adminNav}</div>
            </Dialog>
          )}
        </>
      )}
      {!admin && <SiteHeader />}
      <div className={admin ? "workspace admin-workspace" : "user-workspace"}>
        {offline && (
          <div className="offline" role="status">
            Sedang offline. Perubahan memerlukan koneksi internet.
          </div>
        )}
        <main
          id="main"
          className={admin ? "main-content admin-main-content" : "user-content"}
        >
          {admin && (
            <div className="admin-mobile-controls">
              <button
                type="button"
                className="admin-menu-button"
                aria-label="Buka navigasi admin"
                aria-haspopup="dialog"
                aria-expanded={drawer}
                onClick={() => setDrawer(true)}
              >
                <Menu size={18} aria-hidden="true" />
                <span>Menu admin</span>
              </button>
            </div>
          )}
          {admin ? (
            <div className="admin-content-frame">{children}</div>
          ) : (
            children
          )}
        </main>
      </div>
      {!admin && <SiteFooter />}
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
