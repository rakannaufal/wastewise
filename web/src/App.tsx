import { lazy, Suspense, useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "./Auth";
import { Loading } from "./ui";
import WorkspaceLayout from "./components/WorkspaceLayout";
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
const Profile = lazy(() => import("./pages/Profile"));
export default function App() {
  const { user, loading, recovery } = useAuth();
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
    return user ? <Navigate to="/app" replace /> : <Login />;
  const isAdmin = user.role === "admin";
  const adminSurface =
    isAdmin &&
    (new Set(["/dashboard", "/users", "/moderation", "/reports"]).has(
      location.pathname,
    ) ||
      (location.pathname.startsWith("/reports/") &&
        location.pathname !== "/reports/new"));
  return (
    <WorkspaceLayout
      key={adminSurface ? "admin" : "user"}
      admin={adminSurface}
      offline={offline}
    >
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
          <Route path="/profile" element={<Profile />} />
          <Route
            path="/users"
            element={isAdmin ? <Users /> : <ErrorPage code="403" />}
          />
          <Route
            path="/moderation"
            element={isAdmin ? <Moderation /> : <ErrorPage code="403" />}
          />
          <Route path="*" element={<ErrorPage code="404" />} />
        </Routes>
      </Suspense>
    </WorkspaceLayout>
  );
}
