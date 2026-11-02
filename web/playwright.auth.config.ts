import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./auth-e2e",
  outputDir: "./auth-test-results",
  workers: 1,
  timeout: 30_000,
  use: {
    baseURL: "http://127.0.0.1:5173",
    channel: "chrome",
    headless: true,
    trace: "retain-on-failure",
  },
  reporter: [
    ["list"],
    ["json", { outputFile: "../.local/auth-browser-tests.json" }],
  ],
});
