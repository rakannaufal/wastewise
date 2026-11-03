import { lazy, Suspense, useEffect, useState } from "react";
import {
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import {
  BookOpen,
  House,
  MapPin,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  ScanLine,
  Users as UsersIcon,
  X,
} from "lucide-react";
import { useAuth } from "./Auth";
import { Brand, Dialog, Loading } from "./ui";
import Login from "./pages/Login";
import { Landing, Onboarding, ErrorPage } from "./pages/Public";
const Moderation = lazy(() => import("./pages/Moderation"));
const Community = lazy(() => import("./pages/Community"));
const PostDetail = lazy(() =>
  import("./pages/Community").then((m) => ({ default: m.PostDetail })),
);
const WasteMap = lazy(() => import("./pages/Map"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Reports = lazy(() => import("./pages/Reports"));
const NewReport = lazy(() => import("./pages/NewReport"));
const ReportDetail = lazy(() => import("./pages/ReportDetail"));
const Classify = lazy(() => import("./pages/Classify"));
const Guide = lazy(() => import("./pages/Guide"));
const Users = lazy(() => import("./pages/Users"));
const navigation = [
  { path: "/app", label: "Beranda", icon: House },
  { path: "/map", label: "Peta", icon: MapPin },
  { path: "/dashboard", label: "Ringkasan", icon: LayoutDashboard },
  { path: "/reports", label: "Laporan", icon: ClipboardList },
  { path: "/classify", label: "Klasifikasi", icon: ScanLine },
  { path: "/guide", label: "Panduan memilah", icon: BookOpen },
];
export default function App() {
  const { user, logout, loading, recovery } = useAuth();
  const [drawer, setDrawer] = useState(false);
  const [offline, setOffline] = useState(!navigator.onLine);
  const location = useLocation();
  useEffect(() => {
    const change = () => setOffline(!navigator.onLine);
    window.addEventListener("online", change);
    window.addEventListener("offline", change);
    return () => {
      window.removeEventListener("online", change);
      window.removeEventListener("offline", change);
    };
  }, []);
  if (loading) return <Loading />;
  if (recovery || location.pathname === "/auth/reset-password")
    return <Login />;
  if (location.pathname === "/") return <Landing />;
  if (location.pathname === "/onboarding") return <Onboarding />;
  if (location.pathname.startsWith("/errors/"))
    return (
      <Routes>
        <Route path="/errors/:code" element={<ErrorPage />} />
      </Routes>
    );
  if (!user || location.pathname === "/login")
    return user ? <PublicRedirect /> : <Login />;
  const nav = (
    <>
      <Brand />
      <p className="nav-caption">RUANG KERJAMU</p>
      <nav aria-label="Navigasi utama">
        {[
          ...navigation,
          ...(user.role === "admin"
            ? [
                { path: "/users", label: "Pengguna", icon: UsersIcon },
                { path: "/moderation", label: "Moderasi", icon: ClipboardList },
              ]
            : []),
        ].map(({ path, label, icon: Icon }) => (
          <NavLink
            to={path}
            end={path === "/"}
            key={path}
            onClick={() => setDrawer(false)}
          >
            <Icon size={20} />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-note">
        <span className="eyebrow">Kebiasaan baik</span>
        <p>
          Pilah dari sumbernya.
          <br />
          Mulai dari sekitarmu.
        </p>
        <Link to="/guide" onClick={() => setDrawer(false)}>
          Pelajari caranya ↗
        </Link>
      </div>
      <div className="profile">
        <span className="avatar">{user.full_name[0].toUpperCase()}</span>
        <div>
          <strong>{user.full_name}</strong>
          <small>{user.role === "admin" ? "Pengelola" : "Pengguna"}</small>
        </div>
        <button className="icon-button" aria-label="Keluar" onClick={logout}>
          <LogOut size={18} />
        </button>
      </div>
    </>
  );
  return (
    <div className="app-shell">
      <a href="#main" className="skip-link">
        Lewati ke konten
      </a>
      <aside className="sidebar">{nav}</aside>
      {drawer && (
        <Dialog title="Navigasi" onClose={() => setDrawer(false)}>
          <div className="mobile-nav">{nav}</div>
        </Dialog>
      )}
      <div className="workspace">
        <header className="topbar">
          <button
            className="icon-button mobile-menu"
            aria-label="Buka navigasi"
            onClick={() => setDrawer(true)}
          >
            {drawer ? <X /> : <Menu />}
          </button>
          <div className="breadcrumb">
            Ruang kerja <span>/</span>{" "}
            {navigation.find((item) =>
              item.path === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(item.path),
            )?.label || "Detail"}
          </div>
          <span className="workspace-label">Pilah dengan tepat.</span>
        </header>
        {offline && (
          <div className="offline" role="status">
            Sedang offline. Perubahan memerlukan koneksi internet.
          </div>
        )}
        <main id="main" className="main-content">
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route path="/app" element={<Community />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/map" element={<WasteMap />} />
              <Route path="/community/:id" element={<PostDetail />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/reports/new" element={<NewReport />} />
              <Route path="/reports/:id" element={<ReportDetail />} />
              <Route path="/classify" element={<Classify />} />
              <Route path="/guide" element={<Guide />} />
              <Route path="/users" element={<Users />} />
              <Route path="/moderation" element={<Moderation />} />
              <Route path="*" element={<ErrorPage code="404" />} />
            </Routes>
          </Suspense>
          <footer className="workspace-footer">
            <span>WasteWise</span>
            <span>Material dikenali. Langkah berarti.</span>
          </footer>
        </main>
      </div>
    </div>
  );
}

function PublicRedirect() {
  return (
    <Routes>
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  );
}
