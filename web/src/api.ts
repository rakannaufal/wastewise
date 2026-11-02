import { fetchPayload } from "../../shared/request";
const API = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(
  /\/$/,
  "",
);
let accessToken = "";
export function setToken(token: string) {
  accessToken = token;
}
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const { response, payload } = await fetchPayload(API + path, {
    ...options,
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(options.body && !(options.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...options.headers,
    },
  });
  if (!response.ok) {
    if (response.status === 401)
      window.dispatchEvent(new Event("session-expired"));
    const errors = payload?.data?.errors
      ?.map(
        (error: { field: string; message: string }) =>
          `${error.field}: ${error.message}`,
      )
      .join("; ");
    throw new ApiError(
      errors || payload?.message || "Permintaan gagal. Coba kembali.",
      response.status,
    );
  }
  if (!payload || !("data" in payload))
    throw new ApiError(
      "Respons server tidak valid. Coba kembali.",
      response.status,
    );
  return payload.data as T;
}
