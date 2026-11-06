import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import { AppState, Platform } from "react-native";
import { api, onExpire, setToken } from "./api";
import type { User } from "./api";
import { clearDraft } from "./draft";
import { supabaseClient } from "./supabase";
import type { AuthConfig } from "./supabase";
import { authMessage, validPassword } from "../../shared/auth-errors";

type Session = {
  user: User | null;
  loading: boolean;
  error: string;
  config: AuthConfig | null;
  retry: () => void;
  login: (email: string, password: string) => Promise<void>;
  registerAccount: (
    email: string,
    password: string,
    fullName: string,
  ) => Promise<boolean>;
  updatePublicName: (visible: boolean) => Promise<void>;
  resendConfirmation: (email: string) => Promise<void>;
  deleteAccount: (password: string) => Promise<void>;
  logout: () => Promise<void>;
};
const Context = createContext<Session | null>(null);
const KEY = "wastewise.access-token";
export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [config, setConfig] = useState<AuthConfig | null>(null);
  const [attempt, setAttempt] = useState(0);
  const supabase = useRef<SupabaseClient | null>(null);
  useEffect(() => {
    let active = true;
    let revision = 0;
    let unsubscribe: (() => void) | undefined;
    async function apply(token?: string) {
      const current = ++revision;
      setToken(token || "");
      if (!token) {
        if (active) {
          setUser(null);
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
    onExpire(() => {
      if (active) setUser(null);
    });
    async function initialize() {
      setLoading(true);
      setError("");
      try {
        const value = await api<AuthConfig>("/api/v1/auth/config");
        if (!active) return;
        setConfig(value);
        if (value.provider === "supabase") {
          const sb = supabaseClient(value);
          supabase.current = sb;
          const {
            data: { subscription },
          } = sb.auth.onAuthStateChange((_event, session) => {
            setTimeout(() => {
              if (active) void apply(session?.access_token);
            }, 0);
          });
          const lifecycle =
            Platform.OS !== "web"
              ? AppState.addEventListener("change", (state) => {
                  if (state === "active") sb.auth.startAutoRefresh();
                  else sb.auth.stopAutoRefresh();
                })
              : null;
          if (Platform.OS !== "web" && AppState.currentState === "active")
            sb.auth.startAutoRefresh();
          unsubscribe = () => {
            subscription.unsubscribe();
            lifecycle?.remove();
          };
          const { data, error: failure } = await sb.auth.getSession();
          if (failure) throw new Error(authMessage(failure));
          await apply(data.session?.access_token);
        } else {
          const token =
            Platform.OS === "web" ? null : await SecureStore.getItemAsync(KEY);
          await apply(token || undefined);
        }
      } catch (e) {
        if (active) {
          setError((e as Error).message);
          setLoading(false);
        }
      }
    }
    void initialize();
    return () => {
      active = false;
      revision++;
      unsubscribe?.();
    };
  }, [attempt]);
  async function login(email: string, password: string) {
    setError("");
    if (config?.provider === "supabase") {
      const sb = supabase.current;
      if (!sb) throw new Error("Koneksi autentikasi belum siap.");
      const { data, error: failure } = await sb.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (failure) throw new Error(authMessage(failure));
      setToken(data.session.access_token);
      setUser(await api<User>("/api/v1/auth/me"));
      return;
    }
    const value = await api<{ access_token: string; user: User }>(
      "/api/v1/auth/login",
      { method: "POST", body: JSON.stringify({ email, password }) },
    );
    if (Platform.OS !== "web")
      await SecureStore.setItemAsync(KEY, value.access_token);
    setToken(value.access_token);
    setUser(value.user);
  }
  async function registerAccount(
    email: string,
    password: string,
    fullName: string,
  ) {
    if (!validPassword(password))
      throw new Error(
        "Gunakan minimal 8 karakter: huruf besar, kecil, angka, simbol. Maksimal 72 byte.",
      );
    if (fullName.trim().length < 3)
      throw new Error("Nama lengkap minimal 3 karakter.");
    if (config?.provider === "supabase") {
      const sb = supabase.current;
      if (!sb) throw new Error("Koneksi autentikasi belum siap.");
      const { data, error: failure } = await sb.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: { full_name: fullName.trim() },
          emailRedirectTo: config.web_url,
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
      body: JSON.stringify({ email, password, full_name: fullName }),
    });
    await login(email, password);
    return false;
  }
  async function resendConfirmation(email: string) {
    if (!supabase.current || !config)
      throw new Error("Pengiriman konfirmasi belum tersedia.");
    const { error: failure } = await supabase.current.auth.resend({
      type: "signup",
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: config.web_url },
    });
    if (failure) throw new Error(authMessage(failure));
  }
  async function deleteAccount(password: string) {
    await api<null>("/api/v1/auth/me", {
      method: "DELETE",
      body: JSON.stringify({ confirmation: "HAPUS AKUN", password }),
    });
    await logout();
  }
  async function updatePublicName(visible: boolean) {
    const profile = await api<User>("/api/v1/auth/me/public-name", {
      method: "PATCH",
      body: JSON.stringify({ public_name_visible: visible }),
    });
    setUser(profile);
  }
  async function logout() {
    clearDraft();
    try {
      if (supabase.current) {
        const { error: failure } = await supabase.current.auth.signOut({
          scope: "local",
        });
        if (failure)
          setError(
            "Sesi perangkat ditutup. Pencabutan sesi di server belum terkonfirmasi.",
          );
      }
    } catch {
      setError("Sesi perangkat ditutup. Pencabutan sesi di server belum terkonfirmasi.");
    } finally {
      if (Platform.OS !== "web") {
        try {
          await SecureStore.deleteItemAsync(KEY);
        } catch {
          setError("Sesi lokal tidak dapat dihapus dari perangkat. Hapus data aplikasi.");
        }
      }
      setToken("");
      setUser(null);
    }
  }
  return (
    <Context.Provider
      value={{
        user,
        loading,
        error,
        config,
        retry: () => setAttempt((value) => value + 1),
        login,
        registerAccount,
        updatePublicName,
        resendConfirmation,
        deleteAccount,
        logout,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useSession() {
  const value = useContext(Context);
  if (!value) throw new Error("Session provider missing");
  return value;
}
