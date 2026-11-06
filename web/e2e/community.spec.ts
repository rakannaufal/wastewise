import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { apiURL, createReport } from "./helpers";
test("explicitly shared report becomes public; peers like, comment, map, withdraw", async ({
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
  const publication = await request.get(
    `${apiURL}/api/v1/reports/${report.id}/publication`,
    { headers: accounts[0].headers },
  );
  expect(publication.status()).toBe(200);
  expect((await publication.json()).data).toBeNull();
  const initial = await request.get(`${apiURL}/api/v1/community/feed`, {
    headers: accounts[1].headers,
  });
  expect(initial.status()).toBe(200);
  await page.goto(`/reports/${report.id}`);
  await page.getByLabel("Email", { exact: true }).fill(accounts[0].email);
  await page
    .getByLabel("Kata sandi", { exact: true })
    .fill(accounts[0].password);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await page
    .getByLabel(/Bagikan foto turunan, deskripsi, kategori\/status, dan GPS presisi/)
    .check();
  await page.getByRole("button", { name: "Bagikan laporan", exact: true }).click();
  await page
    .getByRole("link", { name: "Lihat posting dan kelola publikasi" })
    .click();
  await expect(page.locator(".post-photo")).toBeVisible({ timeout: 30000 });
  await page.locator(".account-menu > summary").click();
  await page.keyboard.press("Escape");
  await expect(page.locator(".account-menu")).toHaveJSProperty("open", false);
  const postURL = page.url();
  const second = await browser.newContext();
  const peer = await second.newPage();
  try {
    await peer.goto(postURL);
    await expect(peer.locator(".post-photo")).toBeVisible();
    await expect(peer.getByText(/GPS -6.200/)).toBeVisible();
    await peer
      .getByRole("link", { name: "Lihat di peta", exact: true })
      .click();
    await expect(peer).toHaveURL(
      new RegExp(`post=${postURL.split("/").at(-1)}`),
    );
    await peer
      .getByRole("link", { name: "Kembali ke posting", exact: true })
      .click();
    await expect(peer).toHaveURL(postURL);
    await peer.getByRole("button", { name: "0 suka" }).click();
    await expect(peer).toHaveURL(/login.*returnTo=/);
    await peer.getByLabel("Email", { exact: true }).fill(accounts[1].email);
    await peer
      .getByLabel("Kata sandi", { exact: true })
      .fill(accounts[1].password);
    await peer.getByRole("button", { name: "Masuk", exact: true }).click();
    await expect(peer.locator(".sidebar")).toHaveCount(0);
    await peer.getByRole("button", { name: "0 suka" }).click();
    await expect(peer.getByRole("button", { name: "1 suka" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(peer.getByRole("button", { name: "1 suka" })).toHaveCSS(
      "color",
      "rgb(198, 37, 70)",
    );
    await peer.locator(".post-menu > summary").click();
    await expect(
      peer.getByRole("button", { name: "Laporkan", exact: true }),
    ).toBeVisible();
    await expect(
      peer.getByRole("button", { name: "Edit", exact: true }),
    ).toHaveCount(0);
    await peer.keyboard.press("Escape");
    await expect(peer.locator(".post-menu")).toHaveJSProperty("open", false);
    await peer.route("**/api/v1/community/posts/*/like", (route) =>
      route.fulfill({
        status: 503,
        json: { success: false, message: "Like failure fixture", data: null },
      }),
    );
    await peer.getByRole("button", { name: "1 suka" }).click();
    await expect(peer.getByRole("button", { name: "1 suka" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await peer.unroute("**/api/v1/community/posts/*/like");
    await peer.getByRole("button", { name: "1 suka" }).click();
    await expect(peer.getByRole("button", { name: "0 suka" })).toBeEnabled();
    let postRefreshes = 0;
    const countRefresh = (request: import("@playwright/test").Request) => {
      if (
        request.method() === "GET" &&
        /\/community\/(feed|posts)/.test(request.url())
      )
        postRefreshes++;
    };
    peer.on("request", countRefresh);
    await peer.getByRole("button", { name: "0 suka" }).click();
    await expect(peer.getByRole("button", { name: "1 suka" })).toBeEnabled();
    expect(postRefreshes).toBe(0);
    peer.off("request", countRefresh);
    await peer
      .getByLabel("Komentar", { exact: true })
      .fill("Mari bantu memilah sampah ini.");
    await peer
      .getByRole("button", { name: "Kirim komentar", exact: true })
      .click();
    await expect(
      peer.getByText("Mari bantu memilah sampah ini.", { exact: true }),
    ).toBeVisible();
    await peer.getByRole("button", { name: "Balas", exact: true }).click();
    await peer
      .getByLabel("Komentar", { exact: true })
      .fill("Balasan untuk komentar komunitas.");
    await peer
      .getByRole("button", { name: "Kirim komentar", exact: true })
      .click();
    await peer
      .getByRole("button", { name: "Lihat 1 balasan", exact: true })
      .click();
    await expect(
      peer.getByText("Balasan untuk komentar komunitas.", { exact: true }),
    ).toBeVisible();
    expect(
      (
        await new AxeBuilder({ page: peer })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    for (const width of [320, 390, 768, 1440]) {
      await peer.setViewportSize({ width, height: 900 });
      expect(
        await peer.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
    await expect(peer.locator(".post-detail")).toHaveCount(1);
    await expect(peer.locator(".comment-composer")).toHaveCSS(
      "display",
      "flex",
    );
    await peer.evaluate(() => {
      (document.activeElement as HTMLElement)?.blur();
      window.scrollTo(0, 0);
    });
    await peer.screenshot({
      path: "../docs/evidence/community-post-desktop.png",
      fullPage: true,
    });
    await peer.setViewportSize({ width: 1440, height: 900 });
    await peer
      .getByRole("navigation", { name: "Navigasi utama", exact: true })
      .getByRole("link", { name: "Komunitas", exact: true })
      .click();
    await expect(peer.locator(".post-card")).toHaveCount(1);
    await expect(peer.locator(".post-card .status-badge")).toHaveCount(0);
    await expect(peer.locator(".post-card header")).not.toContainText(
      /Menunggu|Diproses|Selesai|Ditolak/,
    );
    await peer
      .getByRole("combobox", { name: "Urutan posting", exact: true })
      .selectOption("oldest");
    await expect(peer).toHaveURL(/order=oldest/);
    await expect(peer.locator(".post-card")).toHaveCount(1);
    await peer
      .getByRole("combobox", { name: "Urutan posting", exact: true })
      .selectOption("newest");
    // Install before opening the panel so cached reference data uses this fixture.
    await peer.route("**/api/v1/regions?**", async (route) => {
      const level = new URL(route.request().url()).searchParams.get("level");
      await route.fulfill({
        json: {
          success: true,
          message: "Region picker fixture",
          data: {
            regions:
              level === "1"
                ? [
                    {
                      code: "99",
                      name: "Wilayah QA",
                      level: 1,
                      parent_code: null,
                    },
                  ]
                : [],
            truncated: false,
          },
        },
      });
    });
    await peer
      .getByRole("button", { name: "Buka filter", exact: true })
      .click();
    const filterDialog = peer.getByRole("dialog", {
      name: "Filter",
      exact: true,
    });
    await filterDialog
      .getByLabel("Status laporan", { exact: true })
      .selectOption("Completed");
    await filterDialog
      .getByRole("button", { name: "Tutup", exact: true })
      .click();
    await expect(peer).not.toHaveURL(/status=/);
    await peer
      .getByRole("button", { name: "Buka filter", exact: true })
      .click();
    await peer
      .getByRole("dialog")
      .getByLabel("Status laporan", { exact: true })
      .selectOption("Completed");
    await peer.getByRole("button", { name: "Terapkan", exact: true }).click();
    await expect(peer).toHaveURL(/status=Completed/);
    await expect(peer.locator(".post-card")).toHaveCount(0);
    await peer
      .getByRole("button", { name: "Hapus semua", exact: true })
      .click();
    await expect(peer.locator(".post-card")).toHaveCount(1);
    await peer
      .getByRole("button", { name: "Buka filter", exact: true })
      .click();
    await filterDialog
      .getByRole("combobox", { name: "Provinsi", exact: true })
      .click();
    await filterDialog
      .getByRole("option", { name: "Wilayah QA", exact: true })
      .click();
    await expect(
      filterDialog.getByLabel("Kabupaten / kota", { exact: true }),
    ).toBeEnabled();
    await filterDialog
      .getByRole("button", { name: "Reset", exact: true })
      .click();
    await expect(
      filterDialog.getByLabel("Provinsi", { exact: true }),
    ).toBeVisible();
    await expect(
      filterDialog.getByRole("combobox", {
        name: "Kabupaten / kota",
        exact: true,
      }),
    ).toBeDisabled();
    await filterDialog
      .getByRole("button", { name: "Terapkan", exact: true })
      .click();
    await expect(peer).not.toHaveURL(/r0=|status=/);
    await peer.unroute("**/api/v1/regions?**");
    for (const width of [320, 390, 768, 1024, 1440]) {
      await peer.setViewportSize({ width, height: 900 });
      expect(
        await peer.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      expect(
        await peer
          .locator(".post-photo")
          .evaluate((el) => el.getBoundingClientRect().top),
      ).toBeLessThan(450);
      expect(
        await peer
          .locator("h1")
          .evaluate((el) => getComputedStyle(el).fontFamily),
      ).toContain("Manrope");
    }
    await peer.screenshot({
      path: "../docs/evidence/refinement-web-feed.png",
      fullPage: true,
    });
    await peer.setViewportSize({ width: 390, height: 844 });
    await peer.screenshot({
      path: "../docs/evidence/refinement-web-feed-mobile.png",
      fullPage: true,
    });
    await peer.setViewportSize({ width: 1440, height: 900 });
    const workerReady = peer.waitForEvent("worker");
    await peer.getByRole("link", { name: "Peta", exact: true }).click();
    const worker = await workerReady;
    await expect
      .poll(() =>
        worker.evaluate(() =>
          Boolean((globalThis as unknown as { worker?: unknown }).worker),
        ),
      )
      .toBe(true);
    await expect(peer.getByText(/titik atau kelompok pada area/)).toBeVisible();
    await peer.getByText("Daftar lokasi yang dapat diakses tanpa peta").click();
    await expect(
      peer.getByRole("link", { name: /Lihat laporan -6.20000/ }),
    ).toBeVisible();
    await peer.screenshot({
      path: "../docs/evidence/community-map-desktop.png",
      fullPage: true,
    });
    await peer.goto("/");
    await expect(peer.locator(".post-card")).toHaveCount(1);
    await expect(
      peer.getByRole("link", { name: /Lihat semua laporan/ }),
    ).toBeVisible();
    for (const image of await peer.locator("img[loading=lazy]").all()) {
      await image.scrollIntoViewIfNeeded();
      await expect(image).toHaveJSProperty("complete", true);
    }
    await peer.evaluate(() => window.scrollTo(0, 0));
    await peer.screenshot({
      path: "../docs/evidence/public-policy-landing-desktop.png",
      fullPage: true,
    });
    await peer.setViewportSize({ width: 390, height: 844 });
    await peer.screenshot({
      path: "../docs/evidence/public-policy-landing-mobile.png",
      fullPage: true,
    });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.locator(".post-menu > summary").click();
    await page.screenshot({ path: "../docs/evidence/card-menu-web.png" });
    await expect(
      page.getByRole("button", { name: "Edit", exact: true }),
    ).toBeVisible();
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Hapus", exact: true }).click();
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
    "/about",
    "/faq",
    "/privacy",
    "/guide",
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
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("button", { name: "Buka menu utama", exact: true })
    .click();
  const menu = page.getByRole("dialog", { name: "Menu utama", exact: true });
  await expect(menu).toBeVisible();
  await menu.getByRole("link", { name: "Peta", exact: true }).click();
  await expect(page).toHaveURL(/\/map$/);
  await page.goto("/guide");
  await expect(page.locator(".guide-item")).toHaveCount(12);
  for (const graphic of await page.locator(".guide-item img").all()) {
    await expect(graphic).toHaveAttribute(
      "src",
      /\/illustrations\/materials\/.+\.svg$/,
    );
    await graphic.scrollIntoViewIfNeeded();
    await expect
      .poll(() =>
        graphic.evaluate((image) => (image as HTMLImageElement).naturalWidth),
      )
      .toBeGreaterThan(0);
  }
  await page
    .getByRole("textbox", { name: "Cari material", exact: true })
    .fill("baterai");
  await expect(page.locator(".guide-item")).toHaveCount(1);
  await page
    .getByRole("textbox", { name: "Cari material", exact: true })
    .fill("");
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => {
      (document.activeElement as HTMLElement)?.blur();
      window.scrollTo(0, 0);
    });
    await page.screenshot({
      path: `../docs/evidence/guide-graphics-${width}.png`,
      fullPage: true,
    });
  }
  await page.goto("/faq");
  await page
    .getByText("Apakah deskripsi wajib diisi?", { exact: true })
    .click();
  await expect(page.getByText(/Tidak. Foto, hasil klasifikasi/)).toBeVisible();
  await expect(page.locator(".site-footer-credit")).toHaveText(
    "Website by rakandev",
  );
  await expect(page.locator(".site-footer-credit a")).toHaveAttribute(
    "href",
    "https://www.instagram.com/rakandevv/",
  );
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  for (const image of await page.locator("img[loading=lazy]").all()) {
    await image.scrollIntoViewIfNeeded();
    await expect(image).toHaveJSProperty("complete", true);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
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

test("startup uses skeleton without spinning icons; invalid map source has no return link", async ({
  page,
}) => {
  let release!: () => void;
  const ready = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/v1/auth/config", async (route) => {
    await ready;
    await route.continue();
  });
  try {
    await page.goto("/");
    await expect(page.locator(".content-skeleton")).toBeVisible();
    await expect(page.locator(".spin")).toHaveCount(0);
    await page.screenshot({
      path: "../docs/evidence/skeleton-web-startup.png",
    });
  } finally {
    release();
  }
  await expect(page.locator("h1")).toBeVisible();
  await page.goto("/map?post=invalid");
  await expect(
    page.getByRole("heading", { name: "Peta lingkungan." }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Kembali ke posting", exact: true }),
  ).toHaveCount(0);
});
