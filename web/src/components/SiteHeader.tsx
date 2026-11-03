import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Camera, ChevronDown, Menu } from "lucide-react";
import { useAuth } from "../Auth";
import { Brand, Dialog } from "../ui";

const links = [
  ["/", "Beranda"],
  ["/app", "Komunitas"],
  ["/map", "Peta"],
  ["/guide", "Panduan"],
];
export default function SiteHeader({ compact = false }: { compact?: boolean }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [menu, setMenu] = useState(false);
  const account = useRef<HTMLDetailsElement>(null);
  const create = user ? "/reports/new" : "/login?returnTo=%2Freports%2Fnew";
  useEffect(() => {
    function dismiss(event: PointerEvent) {
      if (account.current && !account.current.contains(event.target as Node))
        account.current.open = false;
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape" && account.current?.open) {
        account.current.open = false;
        account.current.querySelector("summary")?.focus();
      }
    }
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
    };
  }, []);
  const navigation = links.map(([path, label]) => (
    <NavLink key={path} to={path} end onClick={() => setMenu(false)}>
      {label}
    </NavLink>
  ));
  return (
    <header className={`site-header${compact ? " site-header-compact" : ""}`}>
      <div className="site-header-inner">
        <Link to="/" aria-label="WasteWise, beranda">
          <Brand />
        </Link>
        {!compact && <nav aria-label="Navigasi utama">{navigation}</nav>}
        <div className="site-header-actions">
          {!compact && (
            <Link className="button primary header-report" to={create}>
              <Camera size={18} />
              Buat laporan
            </Link>
          )}
          {user ? (
            <details
              ref={account}
              className="account-menu"
              key={location.pathname}
            >
              <summary>
                <span className="avatar" aria-hidden="true">
                  {user.full_name[0]}
                </span>
                <span>Akun</span>
                <ChevronDown size={15} />
              </summary>
              <nav aria-label="Menu akun">
                <strong>{user.full_name}</strong>
                <Link to="/profile">Profil</Link>
                <Link to="/reports">
                  {user.role === "admin" ? "Kelola laporan" : "Laporan saya"}
                </Link>
                {user.role === "admin" && (
                  <Link to="/dashboard">Panel admin</Link>
                )}
                <button onClick={() => void logout()}>Keluar</button>
              </nav>
            </details>
          ) : (
            <Link
              className="button secondary"
              to={`/login?returnTo=${encodeURIComponent(location.pathname + location.search)}`}
            >
              Masuk
            </Link>
          )}
          {!compact && (
            <button
              className="icon-button site-menu-trigger"
              aria-label="Buka menu utama"
              aria-haspopup="dialog"
              aria-expanded={menu}
              onClick={() => setMenu(true)}
            >
              <Menu size={22} />
            </button>
          )}
        </div>
      </div>
      {menu && (
        <Dialog title="Menu utama" onClose={() => setMenu(false)}>
          <nav aria-label="Navigasi utama HP">
            {navigation}
            <Link
              className="button primary"
              to={create}
              onClick={() => setMenu(false)}
            >
              <Camera size={18} />
              Buat laporan
            </Link>
            <Link to="/about" onClick={() => setMenu(false)}>
              Tentang WasteWise
            </Link>
            <Link to="/faq" onClick={() => setMenu(false)}>
              FAQ
            </Link>
          </nav>
        </Dialog>
      )}
    </header>
  );
}
