import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Provider traffic is mocked explicitly: these tests do not prove email delivery.
const user = {
  id: "19ca36aa-6d60-4c68-a84d-9b0ecebfc4c3",
  email: "auth-qa@example.com",
  full_name: "Penguji WasteWise",
  role: "user",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};
const identity = {
  id: user.id,
  email: user.email,
  aud: "authenticated",
  role: "authenticated",
  email_confirmed_at: user.created_at,
  user_metadata: { full_name: user.full_name },
  app_metadata: { provider: "email", providers: ["email"] },
  created_at: user.created_at,
};
const encode = (value: object) =>
  Buffer.from(JSON.stringify(value)).toString("base64url");
function session() {
  return {
    access_token: `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: user.id, aud: "authenticated", exp: Math.floor(Date.now() / 1000) + 3600 })}.fixture`,
    refresh_token: "fixture-refresh-token",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: identity,
  };
}
async function fixtures(page: Page, tokenStatus = 200, logoutStatus = 204) {
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    let data: unknown;
    if (path.endsWith("/auth/config"))
      data = {
        provider: "supabase",
        supabase_url: "https://auth-fixture.supabase.co",
        supabase_publishable_key: "sb_publishable_fixture",
        web_url: "http://127.0.0.1:5173",
      };
    else if (path.endsWith("/auth/me")) data = user;
    else if (path.endsWith("/community/feed"))
      data = { posts: [], next_cursor: null };
    else if (path.endsWith("/regions"))
      data = { regions: [], truncated: false };
    else if (path.endsWith("/stats/summary"))
      data = {
        total_reports: 0,
        by_category: {},
        by_status: { Pending: 0, "In Progress": 0, Completed: 0, Rejected: 0 },
        recent_reports: [],
      };
    else if (path.endsWith("/reports"))
      data = {
        reports: [],
        pagination: {
          total_items: 0,
          total_pages: 0,
          current_page: 1,
          per_page: 5,
        },
      };
    else throw new Error(`Unexpected application request: ${path}`);
    await route.fulfill({ json: { success: true, message: "", data } });
  });
  await page.route(
    "https://auth-fixture.supabase.co/auth/v1/**",
    async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (request.method() === "OPTIONS") return route.fulfill({ status: 204 });
      if (url.pathname.endsWith("/token")) {
        expect(request.headers().apikey).toBe("sb_publishable_fixture");
        return route.fulfill({
          status: tokenStatus,
          headers: {
            "x-supabase-api-version": "2024-01-01",
            "access-control-expose-headers": "x-supabase-api-version",
          },
          json:
            tokenStatus === 200
              ? session()
              : {
                  code: "invalid_credentials",
                  msg: "Invalid login credentials",
                },
        });
      }
      if (url.pathname.endsWith("/signup"))
        return route.fulfill({
          json: { ...identity, identities: [{ id: user.id }] },
        });
      if (url.pathname.endsWith("/logout"))
        return route.fulfill({
          status: logoutStatus,
          ...(logoutStatus !== 204 ? { json: { msg: "Unavailable" } } : {}),
        });
      if (url.pathname.endsWith("/user"))
        return route.fulfill({ json: identity });
      if (url.pathname.endsWith("/recover") || url.pathname.endsWith("/resend"))
        return route.fulfill({ json: {} });
      throw new Error(`Unexpected provider request: ${url.pathname}`);
    },
  );
}
async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(user.email);
  await page
    .getByLabel("Kata sandi", { exact: true })
    .fill("WasteWise1!fixture");
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
}
test("confirmed login persists on reload; provider failure still clears logout locally", async ({
  page,
}) => {
  await fixtures(page, 200, 503);
  await login(page);
  await expect(
    page.getByRole("heading", { name: "Beranda", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Beranda", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Profil", exact: true }).click();
  await page.getByRole("button", { name: "Keluar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Selamat datang kembali" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Selamat datang kembali" }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("wastewise.auth")),
  ).toBeNull();
});
test("registration waits for confirmation; resend and password reset have explicit states", async ({
  page,
}) => {
  await fixtures(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login");
  await page.getByRole("button", { name: "Daftar sekarang" }).click();
  await page.getByLabel("Nama lengkap").fill(user.full_name);
  await page.getByLabel("Email", { exact: true }).fill(user.email);
  await page
    .getByLabel("Kata sandi", { exact: true })
    .fill("WasteWise1!fixture");
  await page.getByRole("button", { name: "Buat akun", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Periksa email");
  await expect(
    page.getByRole("heading", { name: "Beranda", exact: true }),
  ).toHaveCount(0);
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.getByRole("button", { name: "Kirim ulang konfirmasi" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Permintaan konfirmasi diterima",
  );
  await page.getByRole("button", { name: "Lupa kata sandi?" }).click();
  await page.getByRole("button", { name: "Kirim tautan pemulihan" }).click();
  await expect(page.getByRole("status")).toContainText("Jika email terdaftar");
});
test("invalid credentials keep the form available", async ({ page }) => {
  await fixtures(page, 400);
  await login(page);
  await expect(page.getByRole("alert")).toContainText("Email atau kata sandi");
  await expect(
    page.getByRole("button", { name: "Masuk", exact: true }),
  ).toBeEnabled();
});
test("PKCE recovery exchanges code before updating password", async ({
  page,
}) => {
  await fixtures(page);
  await page.addInitScript(() =>
    localStorage.setItem(
      "wastewise.auth-code-verifier",
      JSON.stringify("fixture-verifier/recovery"),
    ),
  );
  await page.goto("/auth/reset-password?code=fixture-code");
  await expect(
    page.getByRole("heading", { name: "Buat kata sandi baru" }),
  ).toBeVisible();
  await page
    .getByLabel("Kata sandi baru", { exact: true })
    .fill("WasteWise1!changed");
  await page.getByRole("button", { name: "Simpan kata sandi baru" }).click();
  await expect(
    page.getByRole("heading", { name: "Selamat datang kembali" }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("wastewise.auth")),
  ).toBeNull();
});
