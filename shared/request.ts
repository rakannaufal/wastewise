/** Bound requests and preserve caller cancellation on browsers and React Native. */
export async function fetchPayload(url: string, options: RequestInit) {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  if (options.signal?.aborted) cancel();
  options.signal?.addEventListener("abort", cancel, { once: true });
  const timer = setTimeout(cancel, 60000);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => null);
    return { response, payload };
  } catch (error) {
    if (options.signal?.aborted) throw error;
    throw new Error(
      controller.signal.aborted
        ? "Server belum merespons dalam 60 detik. Draft tetap tersedia; coba lagi."
        : "Tidak dapat terhubung. Periksa koneksi internet, lalu coba lagi.",
    );
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", cancel);
  }
}
