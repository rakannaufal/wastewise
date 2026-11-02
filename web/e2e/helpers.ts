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
  await page.goto("/");
  await page.getByLabel("Email", { exact: true }).fill(credentials.email);
  await page
    .getByLabel("Kata sandi", { exact: true })
    .fill(credentials.password);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
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
