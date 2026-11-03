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
  let releaseStartup!: () => void;
  const startup = new Promise<void>((resolve) => {
    releaseStartup = resolve;
  });
  await page.route("**/api/v1/auth/config", async (route) => {
    await startup;
    await route.continue();
  });
  let feedRequests = 0;
  page.on("request", (request) => {
    if (
      request.method() === "GET" &&
      new URL(request.url()).pathname === "/api/v1/community/feed"
    )
      feedRequests++;
  });
  await page.goto(mobileURL);
  await expect(
    page.getByLabel("Logo WasteWise", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "../docs/evidence/professional-mobile-startup.png",
  });
  releaseStartup();
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
  await expect(
    page.getByText("Foto dan kabar dari lingkunganmu.", { exact: true }),
  ).toBeVisible();
  expect(feedRequests).toBe(1);
  await expect(page.getByText("Semua material", { exact: true })).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "Buka filter", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Terapkan", exact: true }),
  ).toBeInViewport();
  await page.screenshot({
    path: "../docs/evidence/refinement-mobile-filter.png",
    animations: "disabled",
  });
  await page
    .getByRole("button", { name: "Status laporan", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Ditolak", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Selesai", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Tutup filter", exact: true }),
  ).toBeInViewport();
  await expect(
    page.getByRole("button", { name: "Terapkan", exact: true }),
  ).toBeInViewport();
  await page.getByRole("button", { name: "Tutup filter", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Tutup filter", exact: true }),
  ).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Buka filter", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Buka filter", exact: true }).click();
  await page
    .getByRole("button", { name: "Status laporan", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Ditolak", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Selesai", exact: true }).click();
  await page.getByRole("button", { name: "Terapkan", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Tutup filter", exact: true }),
  ).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Hapus filter status", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Hapus filter status", exact: true })
    .click();
  await page.screenshot({
    path: "../docs/evidence/refinement-mobile-home.png",
    fullPage: true,
  });
  await page.getByRole("tab", { name: "Laporan", exact: true }).click();
  await page
    .getByRole("button", { name: "Buat laporan baru", exact: true })
    .click();
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
  await page.getByLabel("Deskripsi (opsional)").fill("");
  await page
    .getByRole("button", { name: "Kirim dan publikasikan", exact: true })
    .click();
  await expect(page).toHaveURL(/\/report\/[0-9a-f-]+$/);
  await page
    .getByRole("button", { name: "Edit deskripsi / ganti foto", exact: true })
    .click();
  await page
    .getByLabel("Deskripsi (opsional)")
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
  await expect(
    page.getByRole("button", { name: "Lihat dan kelola posting", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Lihat dan kelola posting", exact: true })
    .click();
  await expect(page).toHaveURL(/\/post\/[0-9a-f-]+$/);
  const postId = new URL(page.url()).pathname.split("/").at(-1)!;
  await page
    .getByRole("textbox", { name: "Komentar", exact: true })
    .fill("Komentar dari aplikasi WasteWise");
  await page
    .getByRole("button", { name: "Kirim komentar", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Komentar", exact: true }),
  ).toHaveValue("");
  await expect(
    page.getByText("Komentar dari aplikasi WasteWise", { exact: true }),
  ).toBeVisible();
  await page
    .getByText("Komentar dari aplikasi WasteWise", { exact: true })
    .scrollIntoViewIfNeeded();
  await page
    .getByRole("button", { name: "Balas komentar", exact: false })
    .click();
  await page
    .getByRole("textbox", { name: "Komentar", exact: true })
    .fill("Balasan dari aplikasi WasteWise");
  await page
    .getByRole("button", { name: "Kirim komentar", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Lihat 1 balasan", exact: true })
    .click();
  await expect(
    page.getByText("Balasan dari aplikasi WasteWise", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Opsi posting", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Edit", exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: "../docs/evidence/card-menu-mobile.png" });
  await page
    .getByRole("button", { name: "Tutup opsi posting", exact: true })
    .click();

  await page.screenshot({
    path: "../docs/evidence/professional-mobile-comments.png",
    fullPage: true,
  });

  await page.goBack();
  await page
    .getByRole("button", { name: "Kembali ke laporan", exact: true })
    .click();
  await page.getByRole("tab", { name: "Beranda", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Buka foto dan percakapan", exact: true }),
  ).toBeVisible({ timeout: 30000 });
  await expect(
    page
      .getByTestId(`post-${postId}`)
      .getByText(/^(Menunggu|Diproses|Selesai|Ditolak)$/),
  ).toHaveCount(0);
  await page.screenshot({
    path: "../docs/evidence/refinement-mobile-feed.png",
  });
  await page
    .getByTestId(`post-${postId}`)
    .getByRole("button", { name: "Sukai posting", exact: true })
    .click();
  await expect(
    page
      .getByTestId(`post-${postId}`)
      .getByRole("button", { name: "Batalkan suka", exact: true }),
  ).toBeVisible();
  await page.clock.install();
  await page.getByRole("tab", { name: "Profil", exact: true }).click();
  const beforeHidden = feedRequests;
  await page.clock.fastForward(61000);
  expect(feedRequests).toBe(beforeHidden);
  await page.getByRole("tab", { name: "Beranda", exact: true }).click();
  await expect.poll(() => feedRequests).toBe(beforeHidden + 1);
  await page.clock.resume();
  await page.getByRole("tab", { name: "Laporan", exact: true }).click();
  await page.getByRole("button", { name: /^Laporan / }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Hapus laporan", exact: true })
    .click();
  await expect(
    page
      .getByText("Belum ada laporan.", { exact: true })
      .filter({ visible: true }),
  ).toBeVisible();
});
