export const API = (
  process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000"
).replace(/\/$/, "");
let token = "";
export function setToken(value: string) {
  token = value;
}
let expire: (() => void) | undefined;
export function onExpire(callback: () => void) {
  expire = callback;
}
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(API + path, {
      ...options,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.body && !(options.body instanceof FormData)
          ? { "Content-Type": "application/json" }
          : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new Error("Tidak terhubung. Periksa jaringan dan alamat server.");
  }
  const payload = await response.json();
  if (!response.ok) {
    if (response.status === 401) expire?.();
    throw new Error(payload.message || "Permintaan gagal");
  }
  return payload.data;
}
export type User = {
  id: string;
  full_name: string;
  email: string;
  role: "admin" | "user";
};
export type Report = {
  id: string;
  user_name: string;
  category: string;
  description: string;
  status: string;
  image_url: string;
  latitude: number;
  longitude: number;
  created_at: string;
  ai_predicted_category: string | null;
  ai_confidence: number | null;
};
export type Prediction = {
  category: string;
  confidence: number;
  probabilities: Record<string, number>;
  model_version: string;
};
