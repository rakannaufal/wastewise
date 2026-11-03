import { expect, type APIRequestContext, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";
export const apiURL = process.env.E2E_API_URL || "http://127.0.0.1:8000";
export const mobileURL = process.env.E2E_MOBILE_URL || "http://127.0.0.1:8081";
export const adminCredentials = () =>
  JSON.parse(
    readFileSync(path.resolve("../.local/browser-admin.json"), "utf8"),
  ) as { email: string; password: string };
export async function login(
  page: Page,
  credentials: { email: string; password: string },
) {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(credentials.email);
  await page
    .getByLabel("Kata sandi", { exact: true })
    .fill(credentials.password);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await page.waitForURL("**/app");
  await page.getByRole("link",{name:"Ringkasan",exact:true}).click();
}
export async function createReport(
  request: APIRequestContext,
  headers: Record<string, string>,
  description: string,
) {
  const upload = await request.post(`${apiURL}/api/v1/report-drafts`, {
    headers,
    multipart: {
      request_id: randomUUID(),
      photo_source: "gallery",
      image: {
        name: "plastic.jpg",
        mimeType: "image/jpeg",
        buffer: readFileSync(path.resolve("public/materials/plastic.jpg")),
      },
    },
  });
  expect(upload.status()).toBe(201);
  const draft = (await upload.json()).data;
  expect(
    (
      await request.patch(`${apiURL}/api/v1/report-drafts/${draft.id}`, {
        headers,
        data: {
          latitude: -6.2,
          longitude: 106.8,
          location_source: "device_upload_confirmed",
          location_recorded_at: new Date().toISOString(),
          location_accuracy_m: 10,
          confirmed: true,
        },
      })
    ).status(),
  ).toBe(200);
  const response = await request.post(`${apiURL}/api/v1/reports`, {
    headers: { ...headers, "Idempotency-Key": randomUUID() },
    data: { draft_id: draft.id, description },
  });
  expect(response.status()).toBe(201);
  return (await response.json()).data as { id: string; category: string };
}

// Hold a failing DELETE to verify immediate feedback and recovery before a real retry.
export async function checkDraftDeletion(
  page: import("@playwright/test").Page,
  native = false,
) {
  const { expect } = await import("@playwright/test");
  const result = native
    ? page.getByText("KATEGORI OTOMATIS", { exact: true })
    : page.getByText(/confidence model/);
  const preview = native
    ? page.getByRole("img", { name: "Foto yang dianalisis" })
    : page.getByRole("img", { name: "Pratinjau foto yang dipilih" });
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  let intercepted!: () => void;
  const arrived = new Promise<void>((resolve) => {
    intercepted = resolve;
  });
  await page.route("**/api/v1/report-drafts/*", async (route) => {
    if (route.request().method() !== "DELETE") return route.continue();
    intercepted();
    await held;
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        success: false,
        message: "Penghapusan uji gagal. Coba lagi.",
        data: null,
      }),
    });
  });
  try {
    await page
      .getByRole("button", { name: "Hapus draft foto", exact: true })
      .click();
    await arrived;
    await expect(preview).toBeHidden();
    await expect(result).toBeHidden();
    await expect(
      page.getByText("Menghapus draft…", { exact: true }).first(),
    ).toBeVisible();
  } finally {
    release();
  }
  await expect(result).toBeVisible();
  await expect(preview).toBeVisible();
  await expect(
    page.getByText("Penghapusan uji gagal. Coba lagi.", { exact: true }),
  ).toBeVisible();
  await page.unroute("**/api/v1/report-drafts/*");
  await page
    .getByRole("button", { name: "Hapus draft foto", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Hapus draft foto", exact: true }),
  ).toBeHidden();
  await expect(result).toBeHidden();
  await expect(preview).toBeHidden();
  await expect(
    native
      ? page.getByRole("button", {
          name: "Pilih gambar dari galeri",
          exact: true,
        })
      : page.locator("input[type=file]"),
  ).toBeEnabled();
}
