import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { randomBytes } from "node:crypto";
import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";

test("register, classify, report, filter, guide, responsive navigation, delete", async ({
  page,
}) => {
  const email = `qa-${Date.now()}@example.com`;
  const password = `WasteWise1!${randomBytes(12).toString("hex")}`;
  const evidence = path.resolve("../docs/evidence");
  mkdirSync(evidence, { recursive: true });
  const errors: string[] = [];
  async function checkAccessibility(screen: string) {
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    writeFileSync(
      path.resolve(`../.local/accessibility-${screen}.json`),
      JSON.stringify(result.violations, null, 2),
    );
    expect(result.violations).toEqual([]);
  }
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Selamat datang kembali" }),
  ).toBeVisible();
  await checkAccessibility("login");
  await page.screenshot({ path: `${evidence}/web-login.png`, fullPage: true });
  await page.getByRole("button", { name: "Daftar sekarang" }).click();
  await page.getByLabel("Nama lengkap").fill("Penguji WasteWise");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Kata sandi", { exact: true }).fill(password);
  const registration = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/v1/auth/register") &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Buat akun", exact: true }).click();
  const response = await registration;
  expect(response.status()).toBe(201);
  const user = (await response.json()).data;
  writeFileSync(
    path.resolve("../.local/browser-user.json"),
    JSON.stringify({ id: user.id, email }),
  );
  await expect(
    page.getByRole("heading", { name: "Langkah baik, Penguji." }),
  ).toBeVisible();
  await expect(
    page.getByText("Belum ada laporan", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: `${evidence}/web-dashboard-empty.png`,
    fullPage: true,
  });
  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  writeFileSync(
    path.resolve("../.local/accessibility.json"),
    JSON.stringify(accessibility.violations, null, 2),
  );
  expect(accessibility.violations).toEqual([]);
  await page
    .getByRole("link", { name: "Klasifikasi foto", exact: true })
    .click();
  const imageDirectory = path.resolve("../garbage_classification/plastic");
  const image = readdirSync(imageDirectory)
    .sort()
    .find((name) => name.endsWith(".jpg"))!;
  await page
    .locator("input[type=file]")
    .setInputFiles(path.join(imageDirectory, image));
  await page
    .getByRole("button", { name: "Kenali material", exact: true })
    .click();
  await expect(
    page.getByText("Perkiraan kategori", { exact: true }),
  ).toBeVisible({ timeout: 30_000 });
  await checkAccessibility("classification");
  await page.screenshot({
    path: `${evidence}/web-classification.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "Lanjutkan menjadi laporan" }).click();
  await page
    .getByRole("combobox", { name: "Material", exact: true })
    .selectOption("plastic");
  await page
    .getByLabel("Deskripsi", { exact: true })
    .fill("Laporan uji otomatis: botol plastik di dekat taman.");
  await page.getByLabel("Latitude", { exact: true }).fill("-6.2");
  await page.getByLabel("Longitude", { exact: true }).fill("106.8");
  await checkAccessibility("new-report");
  await page.getByRole("button", { name: "Simpan laporan" }).click();
  await expect(
    page.getByRole("heading", { name: "Catatan laporan" }),
  ).toBeVisible();
  await checkAccessibility("report-detail");
  await expect(
    page.getByText("Laporan uji otomatis: botol plastik di dekat taman."),
  ).toBeVisible();
  await page.screenshot({ path: `${evidence}/web-report.png`, fullPage: true });
  const detailURL = page.url();
  await page.getByRole("link", { name: "Ringkasan", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /Plastik Laporan uji/ }),
  ).toBeVisible();
  const composition = page.getByRole("region", { name: "Komposisi material" });
  await expect(composition.locator("dt")).toHaveCount(12);
  await expect(composition.locator("dd").filter({ hasText: "1" })).toHaveCount(
    1,
  );
  await expect(
    page.getByRole("region", { name: "Progres penanganan" }).locator("dt"),
  ).toHaveCount(4);
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.screenshot({
    path: `${evidence}/web-dashboard.png`,
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: `${evidence}/web-mobile-diagnostic.png`,
    fullPage: true,
  });
  writeFileSync(
    path.resolve("../.local/overflow.json"),
    JSON.stringify(
      await page.evaluate(() =>
        Array.from(document.querySelectorAll("*"))
          .map((element) => ({
            tag: element.tagName,
            class: element.className,
            width: element.getBoundingClientRect().width,
            right: element.getBoundingClientRect().right,
            left: element.getBoundingClientRect().left,
          }))
          .filter((rect) => rect.right > innerWidth + 1 && rect.width > 0),
      ),
      null,
      2,
    ),
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({ path: `${evidence}/web-mobile.png`, fullPage: true });
  await page.getByRole("button", { name: "Buka navigasi" }).click();
  await page.getByRole("link", { name: "Laporan", exact: true }).click();
  await page.getByLabel("Cari deskripsi laporan").fill("tidak-ada-hasil-qa");
  await page.getByRole("button", { name: "Cari", exact: true }).click();
  await expect(
    page.getByText("Belum ada laporan", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Buka navigasi" }).click();
  await page
    .getByRole("link", { name: "Panduan memilah", exact: true })
    .click();
  await expect(page.locator("article.guide-item")).toHaveCount(12);
  await page.getByLabel("Cari material").fill("baterai");
  await expect(page.locator("article.guide-item")).toHaveCount(1);
  await checkAccessibility("guide-mobile");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("link", { name: "Laporan", exact: true }).click();
  await page.getByRole("button", { name: /Plastik Laporan uji/ }).click();
  expect(page.url()).toBe(detailURL);
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
  await page.getByRole("button", { name: "Keluar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Selamat datang kembali" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
