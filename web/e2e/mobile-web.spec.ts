import { test, expect } from "@playwright/test";
import { randomBytes } from "node:crypto";
import path from "node:path";

test("Expo web shares real authentication, prediction and reporting", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("http://127.0.0.1:8081/");
  await page.getByRole("button", { name: "Belum punya akun? Daftar" }).click();
  await page
    .getByLabel("Nama lengkap", { exact: true })
    .fill("Penguji WasteWise");
  await page
    .getByLabel("Email", { exact: true })
    .fill(`qa-${Date.now()}@example.com`);
  await page
    .getByLabel("Kata sandi", { exact: true })
    .fill(`WasteWise1!${randomBytes(12).toString("hex")}`);
  await page.getByRole("button", { name: "Buat akun", exact: true }).click();
  await expect(page.getByText("TOTAL LAPORAN", { exact: true })).toBeVisible();
  await page.screenshot({
    path: path.resolve("../docs/evidence/expo-web-home.png"),
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Klasifikasi foto", exact: true })
    .click();
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Galeri", exact: true }).click();
  await (await chooser).setFiles(path.resolve("public/materials/plastic.jpg"));
  await page
    .getByRole("button", { name: "Kenali material", exact: true })
    .click();
  await expect(page.getByText("PERKIRAAN KATEGORI")).toBeVisible({
    timeout: 30000,
  });
  await page.screenshot({
    path: path.resolve("../docs/evidence/expo-web-classification.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Lanjutkan menjadi laporan" }).click();
  expect(page.url()).not.toContain("image");
  expect(page.url()).not.toContain("uri");
  await expect(
    page.getByRole("img", { name: "Foto laporan yang dipilih" }),
  ).toBeVisible();
  await page.getByRole("radio", { name: "Plastik", exact: true }).click();
  await page
    .getByLabel("Deskripsi", { exact: true })
    .fill("Laporan uji otomatis Expo: botol plastik dekat taman.");
  await page.getByLabel(/Latitude/).fill("-6.2");
  await page.getByLabel(/Longitude/).fill("106.8");
  await page
    .getByRole("button", { name: "Simpan laporan", exact: true })
    .click();
  await expect(page).toHaveURL(/\/report\/[0-9a-f-]+$/);
  await expect(
    page.getByText("Laporan uji otomatis Expo: botol plastik dekat taman."),
  ).toBeVisible();
  await page.screenshot({
    path: path.resolve("../docs/evidence/expo-web-report.png"),
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Kembali ke laporan", exact: true })
    .click();
  await page.getByRole("radio", { name: "Selesai", exact: true }).click();
  await expect(page.getByText("Belum ada laporan yang cocok.")).toBeVisible();
  await page.getByRole("radio", { name: "Menunggu", exact: true }).click();
  await page
    .getByRole("button", { name: "Laporan Plastik", exact: true })
    .click();
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Hapus laporan", exact: true })
    .click();
  await expect(page.getByText("Belum ada laporan yang cocok.")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.getByRole("tab", { name: /Profil/ }).click();
  await expect(page.getByText("Profil akun", { exact: true })).toBeVisible();
  await expect(page.getByText("Pelapor", { exact: true })).toBeVisible();
  await page.screenshot({
    path: path.resolve("../docs/evidence/expo-web-profile.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Buka laporan", exact: true }).click();
  await expect(
    page.getByText("Laporan sampah", { exact: true }).filter({ visible: true }),
  ).toBeVisible();
  await page.getByRole("tab", { name: /Profil/ }).click();
  await page
    .getByRole("button", { name: "Panduan memilah", exact: true })
    .click();
  await expect(
    page
      .getByText(
        "Beda bahan, beda penanganan. Ikuti aturan fasilitas setempat.",
        { exact: true },
      )
      .filter({ visible: true }),
  ).toBeVisible();
  await page.getByRole("tab", { name: /Profil/ }).click();
  await page
    .getByRole("button", { name: "Keluar dari akun", exact: true })
    .click();
  await expect(
    page
      .getByText("Selamat datang kembali.", { exact: true })
      .filter({ visible: true }),
  ).toBeVisible();
});
