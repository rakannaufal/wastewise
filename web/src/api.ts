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
  let response: Response;
  try {
    response = await fetch(API + path, {
      ...options,
      headers: {
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...(options.body && !(options.body instanceof FormData)
          ? { "Content-Type": "application/json" }
          : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new ApiError("Tidak dapat terhubung. Periksa koneksi dan server.", 0);
  }
  const payload = await response.json().catch(() => null);
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
  return payload.data as T;
}
