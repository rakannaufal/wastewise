import { chromium, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";

// Credentials arrive through stdin, never command arguments, fixtures or traces.
const credentials = JSON.parse(readFileSync(0, "utf8"));
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage();
  await page.goto("http://127.0.0.1:5173/");
  await page.getByLabel("Email", { exact: true }).fill(credentials.email);
  await page.getByLabel("Kata sandi", { exact: true }).fill(credentials.password);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Langkah baik, Supabase." })).toBeVisible({ timeout: 30_000 });
  await page.reload();
  await expect(page.getByRole("heading", { name: "Langkah baik, Supabase." })).toBeVisible({ timeout: 30_000 });
  await page.screenshot({ path: path.resolve("docs/evidence/supabase-web-session.png"), fullPage: true });
  await page.getByRole("button", { name: "Keluar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Selamat datang kembali" })).toBeVisible({ timeout: 30_000 });
  await page.reload();
  await expect(page.getByRole("heading", { name: "Selamat datang kembali" })).toBeVisible({ timeout: 30_000 });
  console.log("Live browser login, reload session and logout passed");
} finally {
  await browser.close();
}
