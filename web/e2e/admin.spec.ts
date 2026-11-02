import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import path from "node:path";
import { adminCredentials, apiURL, createReport, login } from "./helpers";

test("admin aggregates, URL filters, review, revision, workflow and history", async ({
  page,
  request,
}) => {
  const credentials = adminCredentials();
  const response = await request.post(`${apiURL}/api/v1/auth/login`, {
    data: credentials,
  });
  const headers = {
    Authorization: `Bearer ${(await response.json()).data.access_token}`,
  };
  const row = await createReport(
    request,
    headers,
    "Laporan uji pengelola untuk review dan status.",
  );
  await login(page, credentials);
  await expect(
    page.getByRole("heading", { name: "Penanganan laporan", exact: true }),
  ).toBeVisible();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.screenshot({
    path: path.resolve("../docs/evidence/workflow-admin-local-desktop.png"),
    fullPage: true,
  });
  for (const width of [320, 360, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: path.resolve("../docs/evidence/workflow-admin-local-mobile.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.locator(".admin-metric").first().click();
  expect(page.url()).toContain("date_from=");
  await page.getByLabel("Cari deskripsi laporan").fill("Laporan uji pengelola");
  await page.getByRole("button", { name: "Cari", exact: true }).click();
  await page.getByRole("button", { name: /Laporan uji pengelola/ }).click();
  await expect(page).toHaveURL(new RegExp(`/reports/${row.id}$`));
  await page.getByLabel("Kategori setelah diperiksa").selectOption("plastic");
  await page
    .getByLabel("Alasan pemeriksaan")
    .fill("Botol diperiksa ulang oleh admin");
  await page
    .getByRole("button", { name: "Simpan review", exact: true })
    .click();
  await expect(page.getByText("Ditinjau admin", { exact: true })).toBeVisible();
  for (const [status, css] of [
    ["In Progress", "inprogress"],
    ["Completed", "completed"],
  ]) {
    await page.getByLabel("Status berikutnya").selectOption(status);
    await page
      .getByRole("button", { name: "Simpan status", exact: true })
      .click();
    await expect(page.locator(`.status-${css}`)).toBeVisible();
  }
  await page.getByLabel("Status berikutnya").selectOption("Pending");
  await page
    .getByLabel("Alasan / catatan")
    .fill("Perlu pemeriksaan lokasi kembali");
  await page
    .getByRole("button", { name: "Simpan status", exact: true })
    .click();
  await expect(page.locator(".status-pending")).toBeVisible();
  await expect(
    page.getByText("Perlu pemeriksaan lokasi kembali", { exact: true }),
  ).toBeVisible();
});
