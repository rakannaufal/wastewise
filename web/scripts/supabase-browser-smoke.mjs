/* global document, innerWidth */
import { chromium, expect as baseExpect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

// Disposable credentials stay in stdin and process memory; never trace auth forms.
const credentials = JSON.parse(readFileSync(0, "utf8"));
const expect = baseExpect.configure({ timeout: 30000 });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const checks = [];
const evidence = path.resolve("docs/evidence");
async function login(page, account) {
  await page.goto("http://127.0.0.1:5173/");
  await page.getByLabel("Email", { exact: true }).fill(account.email);
  await page.getByLabel("Kata sandi", { exact: true }).fill(account.password);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
}
try {
  const ownerContext = await browser.newContext({
    geolocation: { latitude: -6.2, longitude: 106.8, accuracy: 10 },
    permissions: ["geolocation"],
    viewport: { width: 390, height: 844 },
  });
  const mobile = await ownerContext.newPage();
  await mobile.goto("http://127.0.0.1:8081/");
  await mobile
    .getByLabel("Email", { exact: true })
    .fill(credentials.owner.email);
  await mobile
    .getByLabel("Kata sandi", { exact: true })
    .fill(credentials.owner.password);
  await mobile.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(mobile.getByText("TOTAL LAPORAN", { exact: true })).toBeVisible({
    timeout: 30000,
  });
  await mobile
    .getByRole("button", { name: "Buat laporan", exact: true })
    .click();
  const chooser = mobile.waitForEvent("filechooser");
  await mobile
    .getByRole("button", { name: "Pilih gambar dari galeri", exact: true })
    .click();
  await (
    await chooser
  ).setFiles(path.resolve("web/public/materials/plastic.jpg"));
  await expect(
    mobile.getByText("KATEGORI OTOMATIS", { exact: true }),
  ).toBeVisible({ timeout: 45000 });
  await mobile
    .getByRole("button", {
      name: "Foto diambil di sini: konfirmasi & ambil GPS",
      exact: true,
    })
    .click();
  await expect(
    mobile.getByText("GPS saat unggah, dikonfirmasi pelapor", { exact: true }),
  ).toBeVisible({ timeout: 30000 });
  const description = `Alur lintas aplikasi WasteWise ${Date.now()}`;
  await mobile.getByLabel("Deskripsi kondisi sampah").fill(description);
  await mobile.screenshot({
    path: `${evidence}/workflow-expo-composer.png`,
    fullPage: true,
  });
  await mobile
    .getByRole("button", { name: "Kirim laporan", exact: true })
    .click();
  await expect(mobile).toHaveURL(/\/report\/[0-9a-f-]+$/, { timeout: 30000 });
  const reportId = mobile.url().split("/").pop();
  await expect(mobile.getByText(description, { exact: true })).toBeVisible();
  checks.push(
    "Expo web gallery automatic ML, explicit GPS confirmation and report submission (GPS mocked)",
  );

  const adminContext = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const admin = await adminContext.newPage();
  await login(admin, credentials.admin);
  await expect(
    admin.getByRole("heading", { name: "Penanganan laporan", exact: true }),
  ).toBeVisible({ timeout: 30000 });
  await admin.reload();
  await expect(
    admin.getByRole("heading", { name: "Penanganan laporan", exact: true }),
  ).toBeVisible({ timeout: 30000 });
  await expect(
    admin.getByRole("button", { name: new RegExp(description) }).first(),
  ).toBeVisible({ timeout: 30000 });
  const accessibility = await new AxeBuilder({ page: admin })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  writeFileSync(
    `${evidence}/workflow-admin-accessibility.json`,
    JSON.stringify(accessibility.violations, null, 2),
  );
  expect(accessibility.violations).toEqual([]);
  await admin.screenshot({
    path: `${evidence}/workflow-admin-desktop.png`,
    fullPage: true,
  });
  for (const width of [320, 360, 390, 768, 1024, 1440]) {
    await admin.setViewportSize({ width, height: 900 });
    expect(
      await admin.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await admin.setViewportSize({ width: 390, height: 844 });
  await admin.screenshot({
    path: `${evidence}/workflow-admin-mobile.png`,
    fullPage: true,
  });
  await admin.setViewportSize({ width: 1440, height: 1000 });
  await admin.locator(".admin-metric").first().click();
  expect(admin.url()).toContain("date_from=");
  await admin.getByLabel("Cari deskripsi laporan").fill(description);
  await admin.getByRole("button", { name: "Cari", exact: true }).click();
  await admin.getByRole("button", { name: new RegExp(description) }).click();
  await expect(admin).toHaveURL(new RegExp(`/reports/${reportId}$`));
  await admin.getByLabel("Kategori setelah diperiksa").selectOption("plastic");
  await admin
    .getByLabel("Alasan pemeriksaan")
    .fill("Diperiksa melalui foto oleh pengelola QA");
  await admin
    .getByRole("button", { name: "Simpan review", exact: true })
    .click();
  await expect(
    admin.getByText("Ditinjau admin", { exact: true }),
  ).toBeVisible();
  await admin.getByLabel("Status berikutnya").selectOption("In Progress");
  await admin
    .getByRole("button", { name: "Simpan status", exact: true })
    .click();
  await expect(admin.locator(".status-inprogress")).toBeVisible();
  await admin.getByLabel("Status berikutnya").selectOption("Completed");
  await admin
    .getByRole("button", { name: "Simpan status", exact: true })
    .click();
  await expect(admin.locator(".status-completed")).toBeVisible();
  await mobile
    .getByRole("button", { name: "Perbarui data", exact: true })
    .click();
  await expect(
    mobile.getByText("Kategori sudah ditinjau admin", { exact: true }),
  ).toBeVisible();
  await expect(mobile.getByText(/^Selesai ·/)).toBeVisible();
  await mobile.screenshot({
    path: `${evidence}/workflow-expo-completed.png`,
    fullPage: true,
  });
  checks.push(
    "mobile report visible in real web admin; review, status history and completed status return to Expo web",
    "admin dashboard drill-down, six viewport widths and zero automated accessibility violations",
  );
  await admin.getByRole("button", { name: "Keluar", exact: true }).click();
  await expect(
    admin.getByRole("heading", { name: "Selamat datang kembali" }),
  ).toBeVisible();
  checks.push("real provider session reload and logout");
  console.log(JSON.stringify({ checks }));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
