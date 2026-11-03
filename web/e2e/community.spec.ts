import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { apiURL, createReport } from "./helpers";
test("private report becomes an opt-in feed post; peers like, comment, map, withdraw", async ({
  page,
  request,
  browser,
}) => {
  const accounts = [];
  for (let i = 0; i < 2; i++) {
    const data = {
      email: `qa-${Date.now() + i}@example.com`,
      password: "WasteWise1!temporary",
      full_name: "Penguji WasteWise",
    };
    const r = await request.post(`${apiURL}/api/v1/auth/register`, { data });
    expect(r.status()).toBe(201);
    const login = await request.post(`${apiURL}/api/v1/auth/login`, {
      data: { email: data.email, password: data.password },
    });
    expect(login.status()).toBe(200);
    accounts.push({
      ...data,
      headers: {
        Authorization: "Bearer " + (await login.json()).data.access_token,
      },
    });
  }
  const report = await createReport(
    request,
    accounts[0].headers,
    "Foto untuk percakapan komunitas WasteWise.",
  );
  const initial = await request.get(`${apiURL}/api/v1/community/feed`, {
    headers: accounts[1].headers,
  });
  expect((await initial.json()).data.posts).toEqual([]);
  await page.goto(`/reports/${report.id}`);
  await page.getByLabel("Email", { exact: true }).fill(accounts[0].email);
  await page
    .getByLabel("Kata sandi", { exact: true })
    .fill(accounts[0].password);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await page.getByRole("checkbox", { name: /Saya setuju membagikan/ }).check();
  await page
    .getByRole("button", { name: "Bagikan laporan", exact: true })
    .click();
  await page
    .getByRole("link", { name: "Lihat posting dan kelola publikasi" })
    .click();
  await expect(page.locator(".post-photo")).toBeVisible({ timeout: 30000 });
  const postURL = page.url();
  const second = await browser.newContext();
  const peer = await second.newPage();
  try {
    await peer.goto(postURL);
    await peer.getByLabel("Email", { exact: true }).fill(accounts[1].email);
    await peer
      .getByLabel("Kata sandi", { exact: true })
      .fill(accounts[1].password);
    await peer.getByRole("button", { name: "Masuk", exact: true }).click();
    await peer.getByRole("button", { name: "0 suka" }).click();
    await expect(peer.getByRole("button", { name: "1 suka" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await peer
      .getByLabel("Komentar", { exact: true })
      .fill("Mari bantu memilah sampah ini.");
    await peer
      .getByRole("button", { name: "Kirim komentar", exact: true })
      .click();
    await expect(
      peer.getByText("Mari bantu memilah sampah ini.", { exact: true }),
    ).toBeVisible();
    expect(
      (
        await new AxeBuilder({ page: peer })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    for(const width of [320,390,768,1440]){await peer.setViewportSize({width,height:900});expect(await peer.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
    await peer.screenshot({path:'../docs/evidence/community-post-desktop.png',fullPage:true});
    await peer.getByRole("link", { name: "Peta", exact: true }).click();
    await expect(peer.getByText(/titik atau kelompok pada area/)).toBeVisible();
    await peer.getByText("Daftar lokasi yang dapat diakses tanpa peta").click();
    await expect(
      peer.getByRole("link", { name: /Lihat laporan -6.20000/ }),
    ).toBeVisible();
    await peer.screenshot({path:"../docs/evidence/community-map-desktop.png",fullPage:true});
    page.once("dialog", (d) => d.accept());
    await page
      .getByRole("button", { name: "Batalkan publikasi", exact: true })
      .click();
    await expect
      .poll(async () =>
        (
          await request.get(
            `${apiURL}/api/v1/community/posts/${postURL.split("/").at(-1)}`,
            { headers: accounts[1].headers },
          )
        ).status(),
      )
      .toBe(404);
  } finally {
    await second.close();
  }
});
test("landing, onboarding and error pages remain readable across viewports", async ({
  page,
}) => {
  for (const route of [
    "/",
    "/onboarding",
    "/errors/403",
    "/errors/404",
    "/errors/429",
    "/errors/500",
    "/errors/503",
  ]) {
    await page.goto(route);
    await expect(page.locator("h1")).toBeVisible();
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
  }
  await page.goto("/");
  await page.screenshot({
    path: "../docs/evidence/community-landing-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "../docs/evidence/community-landing-mobile.png",
    fullPage: true,
  });
});
