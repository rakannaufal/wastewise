import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";

test("administrator status, user roles, dialog keyboard and request failures", async ({
  page,
  request,
  context,
}) => {
  const credentials = JSON.parse(
    readFileSync(path.resolve("../.local/browser-admin.json"), "utf8"),
  ) as { email: string; password: string };
  const login = await request.post("http://127.0.0.1:8000/api/v1/auth/login", {
    data: credentials,
  });
  const session = (await login.json()).data as { access_token: string };
  const headers = { Authorization: `Bearer ${session.access_token}` };
  const data = new FormData();
  data.append(
    "image",
    new Blob([readFileSync(path.resolve("public/materials/plastic.jpg"))], {
      type: "image/jpeg",
    }),
    "plastic.jpg",
  );
  data.append("category", "plastic");
  data.append(
    "description",
    "Laporan uji pengelola: botol plastik dekat taman.",
  );
  data.append("latitude", "-6.2");
  data.append("longitude", "106.8");
  const reportResponse = await fetch("http://127.0.0.1:8000/api/v1/reports", {
    method: "POST",
    headers,
    body: data,
  });
  expect(reportResponse.status).toBe(201);
  const email = `qa-${Date.now()}@example.com`;
  expect(
    (
      await request.post("http://127.0.0.1:8000/api/v1/auth/register", {
        data: {
          email,
          password: "WasteWise1!temporary",
          full_name: "Penguji WasteWise",
        },
      })
    ).status(),
  ).toBe(201);
  await page.goto("/");
  await page.getByLabel("Email", { exact: true }).fill(credentials.email);
  await page
    .getByLabel("Kata sandi", { exact: true })
    .fill(credentials.password);
  await page.getByRole("button", { name: "Tampilkan kata sandi" }).click();
  await expect(page.getByLabel("Kata sandi", { exact: true })).toHaveAttribute(
    "type",
    "text",
  );
  await page.getByRole("button", { name: "Sembunyikan kata sandi" }).click();
  await page.getByLabel("Kata sandi", { exact: true }).press("Enter");
  await expect(
    page.getByRole("heading", { name: "Langkah baik, Penguji." }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Pengguna", exact: true }).click();
  const row = page.getByRole("row").filter({ hasText: email });
  await row.getByRole("combobox").selectOption("admin");
  await expect(row.getByRole("combobox")).toHaveValue("admin");
  await row.getByRole("combobox").selectOption("user");
  await expect(row.getByRole("combobox")).toHaveValue("user");
  await row.getByRole("button", { name: "Hapus", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await row.getByRole("button", { name: "Hapus", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Hapus akun", exact: true })
    .click();
  await expect(row).toHaveCount(0);
  await page.getByRole("link", { name: "Laporan", exact: true }).click();
  await page.getByLabel("Filter kategori").selectOption("plastic");
  await page.getByLabel("Filter status").selectOption("Pending");
  await page
    .getByRole("button", { name: /Plastik Laporan uji pengelola/ })
    .click();
  await page
    .getByRole("combobox", { name: "Ubah status" })
    .selectOption("Completed");
  await expect(page.locator(".status-completed")).toHaveText("Selesai");
  await page.getByRole("link", { name: "Laporan", exact: true }).click();
  await context.setOffline(true);
  await page.getByLabel("Cari deskripsi laporan").fill("uji");
  await page.getByRole("button", { name: "Cari", exact: true }).click();
  await expect(
    page.getByText("Sedang offline. Perubahan memerlukan koneksi internet."),
  ).toBeVisible();
  await context.setOffline(false);
  await expect(
    page.getByRole("button", { name: /Plastik Laporan uji pengelola/ }),
  ).toBeVisible();
  await page.route("**/api/v1/reports?**", (route) => route.abort("failed"));
  await page.getByLabel("Cari deskripsi laporan").fill("pengelola");
  await page.getByRole("button", { name: "Cari", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Tidak dapat terhubung");
  await page.unroute("**/api/v1/reports?**");
  await page.getByRole("button", { name: "Coba lagi", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /Plastik Laporan uji pengelola/ }),
  ).toBeVisible();
});
