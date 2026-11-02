import type { SupabaseClient } from "@supabase/supabase-js";

export type AuthConfig = {
  provider: "local" | "supabase";
  supabase_url: string | null;
  supabase_publishable_key: string | null;
  web_url: string;
};
let client: SupabaseClient | null = null;
export async function supabaseClient(config: AuthConfig) {
  if (!config.supabase_url || !config.supabase_publishable_key)
    throw new Error("Konfigurasi Supabase belum lengkap.");
  const { createClient } = await import("@supabase/supabase-js");
  client ??= createClient(
    config.supabase_url,
    config.supabase_publishable_key,
    {
      auth: {
        storageKey: "wastewise.auth",
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: "pkce",
      },
    },
  );
  return client;
}
