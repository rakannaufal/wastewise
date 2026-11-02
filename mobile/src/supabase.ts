import "react-native-url-polyfill/auto";
import { createClient, processLock } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export type AuthConfig = {
  provider: "local" | "supabase";
  supabase_url: string | null;
  supabase_publishable_key: string | null;
  web_url: string;
};
// Supabase sessions can exceed SecureStore's older platform value limits.
const secureStorage = {
  async getItem(key: string) {
    const count = Number(await SecureStore.getItemAsync(`${key}.count`));
    if (!count || count > 64) return null;
    const chunks = await Promise.all(
      Array.from({ length: count }, (_, i) =>
        SecureStore.getItemAsync(`${key}.${i}`),
      ),
    );
    return chunks.every((value) => value !== null) ? chunks.join("") : null;
  },
  async setItem(key: string, value: string) {
    await secureStorage.removeItem(key);
    const chunks = value.match(/.{1,1000}/gs) || [];
    await Promise.all(
      chunks.map((chunk, i) => SecureStore.setItemAsync(`${key}.${i}`, chunk)),
    );
    await SecureStore.setItemAsync(`${key}.count`, String(chunks.length));
  },
  async removeItem(key: string) {
    const count = Math.min(
      Number(await SecureStore.getItemAsync(`${key}.count`)) || 0,
      64,
    );
    await SecureStore.deleteItemAsync(`${key}.count`);
    await Promise.all(
      Array.from({ length: count }, (_, i) =>
        SecureStore.deleteItemAsync(`${key}.${i}`),
      ),
    );
  },
};
let client: SupabaseClient | null = null;
export function supabaseClient(config: AuthConfig) {
  if (!config.supabase_url || !config.supabase_publishable_key)
    throw new Error("Konfigurasi Supabase belum lengkap.");
  client ??= createClient(
    config.supabase_url,
    config.supabase_publishable_key,
    {
      auth: {
        ...(Platform.OS !== "web" ? { storage: secureStorage } : {}),
        storageKey: "wastewise.auth",
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: Platform.OS === "web",
        flowType: "pkce",
        lock: processLock,
      },
    },
  );
  return client;
}
