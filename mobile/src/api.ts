import { fetchPayload } from "../../shared/request";
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
  const { response, payload } = await fetchPayload(API + path, {
      ...options,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.body && !(options.body instanceof FormData)
          ? { "Content-Type": "application/json" }
          : {}),
        ...options.headers,
      },
    });
  if (!response.ok) {
    if (response.status === 401) expire?.();
    const errors = payload?.data?.errors?.map((error: { field: string; message: string }) => `${error.field}: ${error.message}`).join("; ");
    throw new Error(errors || payload?.message || "Permintaan gagal");
  }
  if (!payload || !("data" in payload)) throw new Error("Respons server tidak valid. Coba kembali.");
  return payload.data as T;
}
export type { User, Report, Prediction } from "../../shared/contracts";
