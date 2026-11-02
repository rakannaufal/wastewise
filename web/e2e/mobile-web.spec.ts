import { test, expect } from "@playwright/test";
import path from "node:path";
import { checkDraftDeletion, mobileURL } from "./helpers";

test("Expo gallery, automatic ML/GPS, report and editable history", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({
    latitude: -6.2,
    longitude: 106.8,
    accuracy: 10,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(mobileURL);
  await page.getByRole("button", { name: "Belum punya akun? Daftar" }).click();
  await page
    .getByLabel("Nama lengkap", { exact: true })
    .fill("Penguji WasteWise");
  await page
    .getByLabel("Email", { exact: true })
    .fill(`qa-${Date.now()}@example.com`);
  await page
    .getByLabel("Kata sandi", { exact: true })
    .fill("WasteWise1!temporary");
  await page.getByRole("button", { name: "Buat akun", exact: true }).click();
  await expect(page.getByText("TOTAL LAPORAN", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Buat laporan", exact: true }).click();
  const chooser = page.waitForEvent("filechooser");
  await page
    .getByRole("button", { name: "Pilih gambar dari galeri", exact: true })
    .click();
  await (await chooser).setFiles(path.resolve("public/materials/plastic.jpg"));
  await expect(
    page.getByText("KATEGORI OTOMATIS", { exact: true }),
  ).toBeVisible({ timeout: 30000 });
  await checkDraftDeletion(page, true);
  const again = page.waitForEvent("filechooser");
  await page
    .getByRole("button", { name: "Pilih gambar dari galeri", exact: true })
    .click();
  await (await again).setFiles(path.resolve("public/materials/plastic.jpg"));
  await expect(
    page.getByText("KATEGORI OTOMATIS", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Foto diambil di sini: konfirmasi & ambil GPS",
      exact: true,
    })
    .click();
  await expect(
    page.getByText("GPS saat unggah, dikonfirmasi pelapor", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Deskripsi kondisi sampah")
    .fill("Laporan dari Expo galeri dengan lokasi terkonfirmasi.");
  await page
    .getByRole("button", { name: "Kirim laporan", exact: true })
    .click();
  await expect(page).toHaveURL(/\/report\/[0-9a-f-]+$/);
  await page
    .getByRole("button", { name: "Edit deskripsi / ganti foto", exact: true })
    .click();
  await page
    .getByLabel("Deskripsi kondisi sampah")
    .fill("Laporan Expo telah diperbaiki tanpa mengganti foto.");
  await page
    .getByRole("button", { name: "Simpan perubahan", exact: true })
    .click();
  await expect(
    page.getByText("Laporan Expo telah diperbaiki tanpa mengganti foto.", {
      exact: true,
    }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Hapus laporan", exact: true })
    .click();
  await expect(page.getByText("Belum ada laporan yang cocok.")).toBeVisible();
});
