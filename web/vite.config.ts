import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "VITE_");
  const configuredApiUrl = env.VITE_API_URL?.trim();
  if (mode === "production" && !configuredApiUrl) {
    throw new Error("VITE_API_URL must be set to the production API origin before building.");
  }

  const apiUrl = new URL(configuredApiUrl || "http://localhost:8000");
  const hostname = apiUrl.hostname.toLowerCase();
  const isIpLiteral = hostname.startsWith("[") || /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname);
  const productionHostIsLocal =
    isIpLiteral ||
    !hostname.includes(".") ||
    hostname === "localhost" ||
    hostname.endsWith(".") ||
    [".local", ".localhost", ".internal", ".test"].some((suffix) =>
      hostname.endsWith(suffix),
    );
  if (
    apiUrl.username ||
    apiUrl.password ||
    apiUrl.pathname !== "/" ||
    apiUrl.search ||
    apiUrl.hash ||
    configuredApiUrl?.includes("?") ||
    configuredApiUrl?.includes("#") ||
    (mode === "production" && (apiUrl.protocol !== "https:" || productionHostIsLocal))
  ) {
    throw new Error("VITE_API_URL must be a public origin; production requires HTTPS.");
  }

  const connectSources = [
    "'self'",
    apiUrl.origin,
    "https://*.supabase.co",
    "https://tile.openstreetmap.org",
    ...(mode === "development" ? ["ws://localhost:*", "ws://127.0.0.1:*"] : []),
  ];
  const contentSecurityPolicy = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "script-src 'self'",
    "worker-src 'self' blob:",
    `connect-src ${connectSources.join(" ")}`,
    `img-src 'self' data: blob: ${apiUrl.origin} https://*.supabase.co https://tile.openstreetmap.org`,
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    ...(mode === "production" ? ["upgrade-insecure-requests"] : []),
  ].join("; ");

  return {
    server: {
      proxy: {
        "/api": {
          target: apiUrl.origin,
          changeOrigin: true,
        },
      },
    },
    plugins: [
      react(),
      tailwindcss(),
      {
        name: "wastewise-content-security-policy",
        transformIndexHtml(html: string) {
          return html.replace(
            "</head>",
            `<meta http-equiv="Content-Security-Policy" content="${contentSecurityPolicy}"></head>`,
          );
        },
      },
    ],
  };
});
