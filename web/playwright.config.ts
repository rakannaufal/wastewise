import { defineConfig } from "@playwright/test";
export default defineConfig({
  globalSetup: "./e2e/setup.ts",
  globalTeardown: "./e2e/teardown.ts",
  testDir: "./e2e",
  timeout: 120_000,
  expect: { timeout: 15000 },
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: process.env.E2E_WEB_URL || "http://127.0.0.1:5173",
    channel: "chrome",
    headless: true,
    viewport: { width: 1440, height: 1000 },
    trace: "retain-on-failure",
  },
  reporter: [
    ["list"],
    ["json", { outputFile: "../.local/browser-tests.json" }],
  ],
});
