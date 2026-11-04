import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import path from "node:path";
import { checkDraftDeletion } from "./helpers";

test("photo automatically becomes an owned report; edit, resume, search, delete", async ({
  page,
  context,
}) => {
  const email = `qa-${Date.now()}@example.com`;
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({
    latitude: -6.2,
    longitude: 106.8,
    accuracy: 10,
  });
  await page.goto("/login");
  await page.getByRole("button", { name: "Daftar sekarang" }).click();
  await page.getByLabel("Nama lengkap").fill("Penguji WasteWise");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page
    .getByLabel("Kata sandi", { exact: true })
    .fill("WasteWise1!temporary");
  await page.getByRole("button", { name: "Buat akun", exact: true }).click();
  await page.waitForURL("**/app");
  await page.locator(".account-menu > summary").click();
  await page.getByRole("link", { name: "Profil", exact: true }).click();
  await page.getByRole("link", { name: /^(Ringkasan|Panel admin)$/ }).click();
  await expect(
    page.getByRole("heading", { name: "Langkah baik, Penguji." }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Klasifikasi foto", exact: true })
    .click();
  await page
    .locator("input[type=file]")
    .setInputFiles(path.resolve("public/materials/plastic.jpg"));
  await expect(page.getByText(/confidence model/)).toBeVisible({
    timeout: 30000,
  });
  await checkDraftDeletion(page);
  await page
    .locator("input[type=file]")
    .setInputFiles(path.resolve("public/materials/plastic.jpg"));
  await expect(page.getByText(/confidence model/)).toBeVisible();
  expect(await page.getByLabel("Latitude", { exact: true }).count()).toBe(0);
  expect(await page.getByRole("combobox").count()).toBe(0);
  await page.getByLabel("Foto ini diambil di lokasi saya saat ini.").check();
  await page
    .getByRole("button", { name: "Konfirmasi dan ambil GPS otomatis" })
    .click();
  await expect(
    page.getByText(/GPS saat unggah, dikonfirmasi pelapor/),
  ).toBeVisible();
  await page
    .getByLabel("Deskripsi (opsional)", { exact: true })
    .fill("Laporan uji otomatis dari foto galeri di taman.");
  await page.reload();
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page
    .getByLabel("Kata sandi", { exact: true })
    .fill("WasteWise1!temporary");
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(
    page.getByLabel("Deskripsi (opsional)", { exact: true }),
  ).toHaveValue("Laporan uji otomatis dari foto galeri di taman.");
  await page
    .getByLabel("Bagikan foto, deskripsi, dan lokasi presisi ke komunitas publik.")
    .check();
  await page
    .getByRole("button", { name: "Kirim laporan", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Catatan laporan" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Edit deskripsi / ganti foto" }).click();
  await page
    .getByLabel("Deskripsi (opsional)", { exact: true })
    .fill("Deskripsi laporan telah diperbaiki oleh pemilik.");
  await page
    .getByRole("button", { name: "Simpan perubahan", exact: true })
    .click();
  await expect(
    page.getByText("Deskripsi laporan telah diperbaiki oleh pemilik."),
  ).toBeVisible();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  for (const width of [320, 360, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page
    .getByRole("button", { name: "Hapus laporan", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Hapus laporan", exact: true })
    .click();
  await expect(
    page.getByText("Belum ada laporan", { exact: true }),
  ).toBeVisible();
});
