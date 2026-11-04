import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import type { User } from "./types";
import { api, setToken } from "./api";
import { supabaseClient } from "./supabase";
import type { AuthConfig } from "./supabase";
import { authMessage, validPassword } from "../../shared/auth-errors";

type Session = {
  user: User | null;
  loading: boolean;
  error: string;
  provider: "local" | "supabase";
  recovery: boolean;
  retry: () => void;
  login: (email: string, password: string) => Promise<void>;
  registerAccount: (
    email: string,
    password: string,
    name: string,
  ) => Promise<boolean>;
  resendConfirmation: (email: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  deleteAccount: (password: string) => Promise<void>;
  logout: () => Promise<void>;
};
const Context = createContext<Session | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [provider, setProvider] = useState<"local" | "supabase">("local");
  const [recovery, setRecovery] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const supabase = useRef<SupabaseClient | null>(null);
  const client = useQueryClient();

  useEffect(() => {
    let active = true;
    let revision = 0;
    let unsubscribe: (() => void) | undefined;
    async function apply(token: string | undefined) {
      const current = ++revision;
      setToken(token || "");
      if (!token) {
        if (active) {
          setUser(null);
          client.clear();
          setLoading(false);
        }
        return;
      }
      try {
        const profile = await api<User>("/api/v1/auth/me");
        if (active && current === revision) {
          setUser(profile);
          setError("");
        }
      } catch (e) {
        if (active && current === revision) {
          setUser(null);
          setError((e as Error).message);
        }
      } finally {
        if (active && current === revision) setLoading(false);
      }
    }
    async function initialize() {
      setLoading(true);
      setError("");
      try {
        const config = await api<AuthConfig>("/api/v1/auth/config");
        if (!active) return;
        setProvider(config.provider);
        if (config.provider === "local") {
          setLoading(false);
          return;
        }
        const sb = await supabaseClient(config);
        if (!active) return;
        supabase.current = sb;
        const {
          data: { subscription },
        } = sb.auth.onAuthStateChange((event, session) => {
          if (!active) return;
          if (event === "PASSWORD_RECOVERY") setRecovery(true);
          // Keep the Supabase callback synchronous; provider refresh uses its own lock.
          setTimeout(() => {
            if (active) void apply(session?.access_token);
          }, 0);
        });
        unsubscribe = () => subscription.unsubscribe();
        const { data, error: sessionError } = await sb.auth.getSession();
        if (sessionError) throw new Error(authMessage(sessionError));
        await apply(data.session?.access_token);
      } catch (e) {
        if (active) {
          setError((e as Error).message);
          setLoading(false);
        }
      }
    }
    void initialize();
    const expired = () => {
      setUser(null);
      client.clear();
    };
    window.addEventListener("session-expired", expired);
    return () => {
      active = false;
      revision++;
      unsubscribe?.();
      window.removeEventListener("session-expired", expired);
    };
  }, [attempt, client]);

  async function login(email: string, password: string) {
    setError("");
    if (provider === "supabase") {
      const sb = supabase.current;
      if (!sb) throw new Error("Koneksi autentikasi belum siap. Coba kembali.");
      const { data, error: failure } = await sb.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (failure) throw new Error(authMessage(failure));
      setToken(data.session.access_token);
      setUser(await api<User>("/api/v1/auth/me"));
      return;
    }
    const data = await api<{ access_token: string; user: User }>(
      "/api/v1/auth/login",
      { method: "POST", body: JSON.stringify({ email, password }) },
    );
    setToken(data.access_token);
    setUser(data.user);
  }
  async function registerAccount(
    email: string,
    password: string,
    name: string,
  ) {
    if (!validPassword(password))
      throw new Error(
        "Gunakan minimal 8 karakter: huruf besar, kecil, angka, simbol. Maksimal 72 byte.",
      );
    if (name.trim().length < 3)
      throw new Error("Nama lengkap minimal 3 karakter.");
    if (provider === "supabase") {
      const sb = supabase.current;
      if (!sb) throw new Error("Koneksi autentikasi belum siap.");
      const { data, error: failure } = await sb.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: { full_name: name.trim() },
          emailRedirectTo: window.location.origin,
        },
      });
      if (failure) throw new Error(authMessage(failure));
      if (!data.session) return true;
      setToken(data.session.access_token);
      setUser(await api<User>("/api/v1/auth/me"));
      return false;
    }
    await api("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, full_name: name }),
    });
    await login(email, password);
    return false;
  }
  async function resendConfirmation(email: string) {
    if (!supabase.current)
      throw new Error("Pengiriman konfirmasi belum tersedia.");
    const { error: failure } = await supabase.current.auth.resend({
      type: "signup",
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: window.location.origin },
    });
    if (failure) throw new Error(authMessage(failure));
  }
  async function resetPassword(email: string) {
    if (!supabase.current)
      throw new Error("Pemulihan email memerlukan Supabase Auth.");
    const { error: failure } =
      await supabase.current.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        { redirectTo: `${window.location.origin}/auth/reset-password` },
      );
    if (failure) throw new Error(authMessage(failure));
  }
  async function updatePassword(password: string) {
    if (!validPassword(password))
      throw new Error(
        "Gunakan minimal 8 karakter: huruf besar, kecil, angka, simbol. Maksimal 72 byte.",
      );
    if (!supabase.current || !recovery)
      throw new Error("Buka tautan pemulihan email terlebih dahulu.");
    const { error: failure } = await supabase.current.auth.updateUser({
      password,
    });
    if (failure) throw new Error(authMessage(failure));
    setRecovery(false);
    await logout();
    window.history.replaceState({}, "", "/");
  }
  async function deleteAccount(password: string) {
    await api<null>("/api/v1/auth/me", {
      method: "DELETE",
      body: JSON.stringify({ confirmation: "HAPUS AKUN", password }),
    });
    await logout();
  }
  async function logout() {
    for (const key of Object.keys(sessionStorage)) if (key.startsWith("wastewise.draft.")) sessionStorage.removeItem(key);
    try {
      if (supabase.current) {
        const { error: failure } = await supabase.current.auth.signOut({
          scope: "local",
        });
        if (failure)
          setError(
            "Sesi perangkat ditutup. Periksa koneksi sebelum masuk kembali.",
          );
      }
    } catch {
      setError("Sesi perangkat ditutup. Pencabutan di server belum terkonfirmasi.");
    } finally {
      setToken("");
      setUser(null);
      setRecovery(false);
      client.clear();
    }
  }
  return (
    <Context.Provider
      value={{
        user,
        loading,
        error,
        provider,
        recovery,
        retry: () => setAttempt((value) => value + 1),
        login,
        registerAccount,
        resendConfirmation,
        resetPassword,
        updatePassword,
        deleteAccount,
        logout,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useAuth() {
  const value = useContext(Context);
  if (!value) throw new Error("Auth provider missing");
  return value;
}
