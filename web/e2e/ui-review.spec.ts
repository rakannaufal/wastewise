import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import type { Post } from "../../shared/community";
import type {
  AdminDashboard as AdminDashboardData,
  Report,
  ReportsPage,
  Summary,
  User,
} from "../../shared/contracts";

const emptyFeed = {
  success: true,
  message: "OK",
  data: { posts: [], next_cursor: null },
};

const emptyMap = {
  success: true,
  message: "OK",
  data: { features: [], truncated: false },
};

const previewPosts: Post[] = Array.from({ length: 3 }, (_, index) => ({
  id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
  author_name: "Warga",
  is_owner: false,
  caption: `Laporan uji ${index + 1}`,
  state: "published",
  image_url: null,
  image_url_expires_at: null,
  category: "paper",
  classification_state: "classified",
  status: "Completed",
  latitude: -6.2,
  longitude: 106.8,
  location_source: "device_capture",
  location_accuracy_m: null,
  location_label: "Jakarta",
  location_state: "reported",
  region_code: null,
  like_count: 0,
  comment_count: 0,
  liked_by_me: false,
  revision: 1,
  created_at: "2026-11-03T00:00:00Z",
}));

const workspaceUser: User = {
  id: "00000000-0000-4000-8000-000000000101",
  full_name: "Penguji WasteWise",
  public_name_visible: false,
  email: "penguji@example.test",
  role: "user",
};

const workspaceReports: Report[] = [
  {
    id: "00000000-0000-4000-8000-000000000201",
    user_id: workspaceUser.id,
    user_name: workspaceUser.full_name,
    category: "paper",
    description: "Kertas bekas di dekat taman.",
    latitude: -6.2,
    longitude: 106.8,
    status: "Pending",
    image_url: "/materials/paper.jpg",
    thumbnail_url: "/materials/paper.jpg",
    image_url_expires_at: "2026-11-07T00:00:00Z",
    ai_predicted_category: "paper",
    ai_confidence: null,
    ai_model_version: null,
    created_at: "2026-11-04T00:00:00Z",
    updated_at: "2026-11-04T00:00:00Z",
    revision: 1,
    classification_state: "classified",
    photo_source: "gallery",
    captured_at: null,
    location_source: "device_capture",
    location_recorded_at: "2026-11-04T00:00:00Z",
    location_accuracy_m: 12,
  },
  {
    id: "00000000-0000-4000-8000-000000000202",
    user_id: workspaceUser.id,
    user_name: workspaceUser.full_name,
    category: "plastic",
    description: "Botol plastik di tepi jalan.",
    latitude: -6.21,
    longitude: 106.81,
    status: "Completed",
    image_url: "/materials/plastic.jpg",
    thumbnail_url: "/materials/plastic.jpg",
    image_url_expires_at: "2026-11-07T00:00:00Z",
    ai_predicted_category: "plastic",
    ai_confidence: null,
    ai_model_version: null,
    created_at: "2026-11-03T00:00:00Z",
    updated_at: "2026-11-04T00:00:00Z",
    revision: 1,
    classification_state: "classified",
    photo_source: "gallery",
    captured_at: null,
    location_source: "device_capture",
    location_recorded_at: "2026-11-03T00:00:00Z",
    location_accuracy_m: 10,
  },
];

const workspaceReportsPage: ReportsPage = {
  reports: workspaceReports,
  pagination: {
    current_page: 1,
    per_page: 10,
    total_items: workspaceReports.length,
    total_pages: 1,
  },
};

const workspaceSummary: Summary = {
  total_reports: 2,
  by_category: { paper: 1, plastic: 1 },
  by_status: {
    Pending: 1,
    "In Progress": 0,
    Completed: 1,
    Rejected: 0,
  },
};

const adminUser: User = { ...workspaceUser, role: "admin" };

const adminDashboard: AdminDashboardData = {
  generated_at: "2026-11-06T08:00:00Z",
  date_from: "2026-10-08T00:00:00+07:00",
  date_to: "2026-11-07T00:00:00+07:00",
  timezone: "Asia/Jakarta",
  category: null,
  status: null,
  cohort: {
    total: 2,
    by_status: {
      Pending: 1,
      "In Progress": 0,
      Completed: 1,
      Rejected: 0,
    },
    by_category: { paper: 1, plastic: 1 },
    needs_review: 0,
  },
  previous_total: 2,
  change_percent: null,
  backlog: { active: 1, needs_review: 0 },
  queue: workspaceReports,
  review_queue: [],
  trend: [{ date: "2026-11-04", count: 2 }],
  median_response_hours: null,
  median_completion_hours: null,
};

async function mockAppApi(page: Page) {
  await page.route("**/api/v1/auth/config", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        message: "OK",
        data: { provider: "local" },
      }),
    }),
  );
  await page.route("**/api/v1/community/feed**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(emptyFeed),
    }),
  );
  await page.route("**/api/v1/community/map**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(emptyMap),
    }),
  );
  await page.route("https://tile.openstreetmap.org/**", (route) =>
    route.abort(),
  );
}

async function expectAccessible(page: Page, screen: string) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(results.violations, `${screen} accessibility violations`).toEqual([]);
}

async function expectNoHorizontalOverflow(page: Page, screen: string) {
  const initialViewport = page.viewportSize();
  for (const width of [320, 360, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const hasNoOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    );
    const offenders = hasNoOverflow
      ? []
      : await page.evaluate(() =>
          Array.from(document.querySelectorAll("body *"))
            .map((element) => {
              const bounds = element.getBoundingClientRect();
              return {
                tag: element.tagName.toLowerCase(),
                className:
                  typeof element.className === "string"
                    ? element.className
                    : "",
                right: Math.round(bounds.right),
                width: Math.round(bounds.width),
              };
            })
            .filter((element) => element.right > window.innerWidth + 1)
            .slice(0, 8),
        );
    expect(
      hasNoOverflow,
      `${screen} overflows at ${width}px: ${JSON.stringify(offenders)}`,
    ).toBe(true);
  }
  if (initialViewport) await page.setViewportSize(initialViewport);
}

test.beforeEach(async ({ page }) => {
  await mockAppApi(page);
});

test("map clusters zoom and single points open report details with photo", async ({
  page,
}, testInfo) => {
  const post = {
    ...previewPosts[0],
    caption: "Kertas bekas menumpuk di dekat taman.",
    image_url:
      "https://brdhxmtdvjhuvpxqsjvi.supabase.co/storage/v1/object/sign/waste-images/map-report.jpg?token=fixture",
  };
  await page.route("**/api/v1/community/map**", async (route) => {
    const zoom = Number(
      new URL(route.request().url()).searchParams.get("zoom"),
    );
    const feature =
      zoom < 6
        ? {
            count: 3,
            longitude: post.longitude,
            latitude: post.latitude,
            post_id: null,
          }
        : {
            count: 1,
            longitude: post.longitude,
            latitude: post.latitude,
            post_id: post.id,
          };
    await route.fulfill({
      json: {
        success: true,
        message: "OK",
        data: { features: [feature], truncated: false },
      },
    });
  });
  await page.route(`**/api/v1/community/posts/${post.id}`, (route) =>
    route.fulfill({
      json: { success: true, message: "OK", data: post },
    }),
  );
  await page.route(
    "https://brdhxmtdvjhuvpxqsjvi.supabase.co/storage/**",
    (route) =>
      route.fulfill({
        contentType: "image/svg+xml",
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="720" height="450"><rect width="100%" height="100%" fill="#dce4dc"/></svg>',
      }),
  );

  await page.goto("/map");
  await page
    .getByRole("button", { name: "Perbesar 3 laporan di area ini" })
    .click();
  await expect(
    page.getByRole("button", { name: "Tampilkan detail laporan" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Tampilkan detail laporan" }).click();

  const detail = page.getByRole("complementary", { name: "Detail laporan" });
  await expect(detail).toBeVisible();
  await expect(detail.getByText(post.caption)).toBeVisible();
  const photo = detail.locator(".map-post-photo");
  await expect(photo).toBeVisible();
  await expect(photo).toHaveAttribute("src", post.image_url!);
  await expect
    .poll(() => photo.evaluate((image: HTMLImageElement) => image.naturalWidth))
    .toBeGreaterThan(0);
  await expect(
    detail.getByRole("link", { name: "Lihat laporan lengkap" }),
  ).toHaveAttribute("href", `/community/${post.id}`);
  await expectAccessible(page, "map report detail at 1440px");
  await page.screenshot({
    path: testInfo.outputPath("map-report-detail-desktop.png"),
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(photo).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expectAccessible(page, "map report detail at 390px");
  await page.screenshot({
    path: testInfo.outputPath("map-report-detail-mobile.png"),
  });

  await detail.getByRole("button", { name: "Tutup detail laporan" }).click();
  await expect(detail).toHaveCount(0);
});

test("map keeps existing markers visible while a viewport request is pending", async ({
  page,
}) => {
  let zoomRequestStarted = false;
  await page.route("**/api/v1/community/map**", async (route) => {
    const zoom = Number(
      new URL(route.request().url()).searchParams.get("zoom"),
    );
    if (zoom < 6) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: "OK",
          data: {
            features: [
              {
                count: 3,
                longitude: 106.8,
                latitude: -6.2,
                post_id: null,
              },
            ],
            truncated: false,
          },
        }),
      });
      return;
    }

    zoomRequestStarted = true;
    await new Promise((resolve) => setTimeout(resolve, 500));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        message: "OK",
        data: {
          features: [
            {
              count: 1,
              longitude: 106.8,
              latitude: -6.2,
              post_id: previewPosts[0].id,
            },
          ],
          truncated: false,
        },
      }),
    });
  });

  await page.goto("/map");
  const cluster = page.getByRole("button", {
    name: "Perbesar 3 laporan di area ini",
  });
  await expect(cluster).toBeVisible();
  await cluster.click();
  await expect.poll(() => zoomRequestStarted).toBe(true);
  await expect(page.locator(".map-skeleton-overlay")).toHaveCount(0);
  await expect(cluster).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Tampilkan detail laporan" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Tampilkan detail laporan" }),
  ).toBeVisible({ timeout: 5000 });
});

test("dashboard, reports, and profile stay usable across desktop and mobile", async ({
  page,
}, testInfo) => {
  await page.route("**/api/v1/auth/login", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        message: "OK",
        data: { access_token: "test-token", user: workspaceUser },
      }),
    }),
  );
  await page.route("**/api/v1/stats/summary", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        message: "OK",
        data: workspaceSummary,
      }),
    }),
  );
  await page.route("**/api/v1/reports**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        message: "OK",
        data: workspaceReportsPage,
      }),
    }),
  );
  await page.route("**/api/v1/auth/me/public-name", (route) => {
    expect(route.request().method()).toBe("PATCH");
    const body = route.request().postDataJSON() as {
      public_name_visible: boolean;
    };
    if (!body.public_name_visible) {
      return route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          message: "Not Found",
          data: null,
        }),
      });
    }
    const user = {
      ...workspaceUser,
      public_name_visible: body.public_name_visible,
    };
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, message: "OK", data: user }),
    });
  });

  await page.goto("/login?returnTo=%2Fdashboard");
  await page.getByLabel("Email", { exact: true }).fill(workspaceUser.email);
  await page
    .getByLabel("Kata sandi", { exact: true })
    .fill("TemporaryPassword1!");
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(
    page.getByRole("heading", { name: "Langkah baik, Penguji." }),
  ).toBeVisible();
  await expect(page.locator(".ww-dashboard-summary")).toContainText("2");
  await expect(
    page.getByRole("heading", { name: "Komposisi material" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Progres penanganan" }),
  ).toHaveCount(0);
  await expectNoHorizontalOverflow(page, "dashboard");
  await expectAccessible(page, "dashboard at 1440px");
  await page.screenshot({ path: testInfo.outputPath("dashboard-desktop.png") });

  await page.getByRole("link", { name: "Lihat semua" }).click();
  await expect(
    page.getByRole("heading", { name: "Laporan sampah" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Komposisi material" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Progres penanganan" }),
  ).toBeVisible();
  await page.locator(".ww-reports-summary").screenshot({
    path: testInfo.outputPath("reports-summary-desktop.png"),
  });
  await expect(page.locator(".ww-result-count")).toContainText("2 laporan");
  await page.getByLabel("Cari deskripsi laporan").fill("kertas");
  await page.getByRole("button", { name: "Cari", exact: true }).click();
  await expect(page).toHaveURL(/search=kertas/);
  await page.getByRole("button", { name: "Reset semua filter" }).click();
  await expect(page).not.toHaveURL(/search=/);
  await expectNoHorizontalOverflow(page, "reports");
  await expectAccessible(page, "reports at 1440px");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: testInfo.outputPath("reports-desktop.png") });

  await page.locator(".account-menu summary").click();
  await page.getByRole("link", { name: "Profil", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Profil" })).toBeVisible();
  await expect(
    page.locator(".ww-profile-links .lucide-arrow-up-right"),
  ).toHaveCount(0);
  await expect(
    page.locator(".ww-profile-links .lucide-arrow-right"),
  ).toHaveCount(5);
  const publicNameSwitch = page.getByRole("switch", {
    name: "Tampilkan nama akun pada postingan komunitas",
  });
  await publicNameSwitch.click();
  await expect(publicNameSwitch).toBeChecked();
  await expect(page.getByRole("status")).toContainText(
    "Nama akun kini terlihat pada postinganmu.",
  );
  await expectNoHorizontalOverflow(page, "profile");
  await expectAccessible(page, "profile at 1440px");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: testInfo.outputPath("profile-desktop.png") });

  await page.setViewportSize({ width: 390, height: 844 });
  await expectAccessible(page, "profile at 390px");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: testInfo.outputPath("profile-mobile.png") });

  const bottomNavigation = page.getByRole("navigation", {
    name: "Navigasi bawah",
  });
  await bottomNavigation.getByRole("link", { name: "Laporan" }).click();
  await expect(
    page.getByRole("heading", { name: "Laporan sampah" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await expectAccessible(page, "reports at 390px");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: testInfo.outputPath("reports-mobile.png") });

  await bottomNavigation.getByRole("link", { name: "Profil" }).click();
  await expect(page.getByRole("heading", { name: "Profil" })).toBeVisible();
  await page.getByRole("link", { name: "Ringkasan" }).click();
  await expect(
    page.getByRole("heading", { name: "Langkah baik, Penguji." }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await expectAccessible(page, "dashboard at 390px");
  await page.screenshot({ path: testInfo.outputPath("dashboard-mobile.png") });

  await bottomNavigation.getByRole("link", { name: "Profil" }).click();
  await expect(page.getByRole("heading", { name: "Profil" })).toBeVisible();
  await publicNameSwitch.click();
  await expect(publicNameSwitch).toBeChecked();
  await expect(page.getByRole("alert")).toContainText(
    "Layanan pengaturan nama komunitas tidak ditemukan",
  );
  await expect(page.getByText("Not Found")).toHaveCount(0);
  await expectAccessible(page, "profile with missing name endpoint");
});

test("six target views stay accessible and fit supported widths", async ({
  page,
}) => {
  const widths = [320, 360, 390, 768, 1024, 1440];
  const screens = [
    { route: "/", title: /Kenali sampah/ },
    { route: "/app", title: "Komunitas" },
    { route: "/map", title: "Peta laporan warga" },
    { route: "/guide", title: "Panduan memilah sampah" },
    { route: "/login", title: "Selamat datang kembali" },
  ];

  for (const screen of screens) {
    await page.goto(screen.route);
    if (screen.route === "/app") {
      await expect(
        page.getByRole("region", { name: screen.title, exact: true }),
      ).toBeVisible();
    } else {
      await expect(page.locator("h1").first()).toContainText(screen.title);
    }
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
        `${screen.route} overflows at ${width}px`,
      ).toBe(true);
      if (width === 390 || width === 1440)
        await expectAccessible(page, `${screen.route} at ${width}px`);
    }

    if (screen.route === "/guide") {
      const search = page.getByRole("searchbox", {
        name: "Cari kategori material",
      });
      await search.fill("baterai");
      await expect(page.locator(".guide-item")).toHaveCount(1);
      await page.getByRole("button", { name: "Hapus pencarian" }).click();
      await expect(page.locator(".guide-item")).toHaveCount(12);
      await search.fill("bahan yang tidak ada");
      await expect(
        page.getByRole("heading", { name: "Material tidak ditemukan." }),
      ).toBeVisible();
    }

    if (screen.route === "/login") {
      await expect(
        page.getByRole("link", { name: "WasteWise, beranda" }),
      ).toHaveCount(1);
      await expect(page.locator(".brand")).toHaveCount(1);
      await page.getByRole("button", { name: "Daftar sekarang" }).click();
      await expect(
        page.getByRole("heading", { name: "Buat akun WasteWise" }),
      ).toBeVisible();
      await expect(page.getByLabel("Nama lengkap")).toBeVisible();
      await expect(
        page.getByText(/lokasi presisi dapat dilihat publik/),
      ).toBeVisible();
      await expectAccessible(page, "form daftar at 1440px");
      await page.setViewportSize({ width: 390, height: 844 });
      await expectAccessible(page, "form daftar at 390px");
    }
  }

  await page.goto("/");
  await expect(page.getByText(/95,86% pada 2\.318 gambar/)).toHaveCount(0);
  await expect(page.getByText(/mitra/i)).toHaveCount(0);
});

test("community sorting stays separate from filters and aligns with the page", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/app?order=oldest");

  await expect(page.locator(".community-intro")).toHaveCount(0);
  await expect(page.locator(".community-map-link")).toHaveCount(0);
  await expect(page.locator("#feed-order")).toHaveValue("oldest");
  await expect(page.locator(".filter-trigger b")).toHaveCount(0);
  await expect(page.locator(".active-filters")).toHaveCount(0);

  await page.goto("/app?status=Completed&order=oldest");
  await expect(page.locator(".filter-trigger b")).toHaveText("1");
  await expect(page.locator(".active-filters")).toContainText("Selesai");
  await expect(page.locator(".active-filters")).not.toContainText("Terlama");

  const desktopLayout = await page.evaluate(() => {
    const getRect = (selector: string) => {
      const element = document.querySelector(selector);
      if (!element) throw new Error(`Missing element: ${selector}`);
      const rect = element.getBoundingClientRect();
      return {
        x: rect.x,
        y: rect.y,
        bottom: rect.bottom,
        centerY: rect.top + rect.height / 2,
      };
    };
    const getContentLeft = (selector: string) => {
      const element = document.querySelector(selector);
      if (!element) throw new Error(`Missing element: ${selector}`);
      const style = getComputedStyle(element);
      return element.getBoundingClientRect().x + parseFloat(style.paddingLeft);
    };
    return {
      headerLeft: getContentLeft(".user-shell .site-header-inner"),
      contentLeft: getContentLeft(".user-content"),
      filter: getRect(".filter-trigger"),
      order: getRect(".feed-order"),
      orderLabel: getRect(".feed-order label"),
      orderSelect: getRect("#feed-order"),
      chips: getRect(".active-filters"),
    };
  });
  expect(desktopLayout.headerLeft).toBeCloseTo(desktopLayout.contentLeft, 0);
  expect(desktopLayout.filter.centerY).toBeCloseTo(
    desktopLayout.order.centerY,
    0,
  );
  expect(desktopLayout.orderLabel.centerY).toBeCloseTo(
    desktopLayout.orderSelect.centerY,
    0,
  );
  expect(desktopLayout.chips.y).toBeGreaterThan(desktopLayout.filter.bottom);
  await expectAccessible(page, "community toolbar at 1440px");
  await page.screenshot({
    path: testInfo.outputPath("community-toolbar-desktop.png"),
    fullPage: true,
  });

  await page.setViewportSize({ width: 390, height: 844 });
  const mobileLayout = await page.evaluate(() => {
    const header = document.querySelector(".user-shell .site-header-inner");
    const content = document.querySelector(".user-content");
    if (!header || !content) throw new Error("Missing page shell elements");
    return {
      headerLeft:
        header.getBoundingClientRect().x +
        parseFloat(getComputedStyle(header).paddingLeft),
      contentLeft:
        content.getBoundingClientRect().x +
        parseFloat(getComputedStyle(content).paddingLeft),
      orderLabelCenter: (() => {
        const rect = document
          .querySelector(".feed-order label")!
          .getBoundingClientRect();
        return rect.top + rect.height / 2;
      })(),
      orderSelectCenter: (() => {
        const rect = document
          .querySelector("#feed-order")!
          .getBoundingClientRect();
        return rect.top + rect.height / 2;
      })(),
      scrollWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    };
  });
  expect(mobileLayout.headerLeft).toBeCloseTo(mobileLayout.contentLeft, 0);
  expect(mobileLayout.orderLabelCenter).toBeCloseTo(
    mobileLayout.orderSelectCenter,
    0,
  );
  expect(mobileLayout.scrollWidth).toBeLessThanOrEqual(
    mobileLayout.viewportWidth,
  );
  await expect(page.locator(".filter-trigger")).toContainText("Filter");
  await expectAccessible(page, "community toolbar at 390px");
  await page.screenshot({
    path: testInfo.outputPath("community-toolbar-mobile.png"),
    fullPage: true,
  });
});

test("landing limits community preview and opens the full feed", async ({
  page,
}) => {
  let landingPageSize: string | null = null;
  await page.route("**/api/v1/community/feed**", async (route) => {
    const url = new URL(route.request().url());
    if (url.searchParams.has("per_page")) {
      landingPageSize = url.searchParams.get("per_page");
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        message: "OK",
        data: { posts: previewPosts, next_cursor: null },
      }),
    });
  });

  await page.goto("/");
  await expect(page.locator(".home-post-grid > .post-card")).toHaveCount(2);
  expect(landingPageSize).toBe("2");

  const moreLink = page.getByRole("link", { name: "Lihat lainnya" });
  await expect(moreLink).toHaveAttribute("href", "/app");
  await moreLink.click();
  await expect(page).toHaveURL(/\/app(?:\?.*)?$/);
  await expect(page.locator(".community-toolbar")).toBeVisible();
});

test("landing header and content align with resident pages", async ({ page }) => {
  const layouts: Record<string, { header: number; content: number[] }> = {};

  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    layouts[`landing-${width}`] = await page.evaluate(() => {
      const left = (selector: string) => {
        const element = document.querySelector(selector);
        if (!element) throw new Error(`Missing layout element: ${selector}`);
        return element.getBoundingClientRect().left;
      };
      return {
        header: left(".site-header-inner"),
        content: [
          left(".home-hero-copy"),
          left(".home-process .home-section-heading"),
          left(".home-categories .home-heading-split"),
          left(".home-privacy"),
        ],
      };
    });

    await page.goto("/app");
    await expect(page.locator(".community-toolbar")).toBeVisible();
    layouts[`community-${width}`] = await page.evaluate(() => {
      const header = document
        .querySelector(".site-header-inner")!
        .getBoundingClientRect();
      const content = document
        .querySelector(".community-page")!
        .getBoundingClientRect();
      return {
        header: header.left,
        content: [content.left],
      };
    });
  }

  for (const width of [390, 1440]) {
    const landing = layouts[`landing-${width}`];
    const community = layouts[`community-${width}`];
    expect(landing.header, `header alignment at ${width}px`).toBeCloseTo(
      community.header,
      0,
    );
    for (const [index, left] of landing.content.entries()) {
      expect(left, `content ${index + 1} alignment at ${width}px`).toBeCloseTo(
        community.content[0],
        0,
      );
    }
  }
});

test("landing community preview stays cached for its refresh interval", async ({
  page,
}) => {
  await page.clock.install();
  let previewRequests = 0;
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (
      url.pathname === "/api/v1/community/feed" &&
      url.searchParams.get("per_page") === "2"
    ) {
      previewRequests += 1;
    }
  });

  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Belum ada laporan publik." }),
  ).toBeVisible();
  const initialRequests = previewRequests;

  await page.getByRole("link", { name: "Panduan", exact: true }).click();
  await expect(page).toHaveURL(/\/guide$/);
  await page.clock.fastForward(35_000);
  await page.getByRole("link", { name: "Beranda", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Belum ada laporan publik." }),
  ).toBeVisible();
  await page.waitForTimeout(100);

  expect(initialRequests).toBeGreaterThan(0);
  expect(previewRequests).toBe(initialRequests);
});

test("landing explains one distinct report flow at desktop and mobile widths", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.locator(".home-capabilities")).toHaveCount(0);
  const steps = page.locator(".home-process-list > li");
  await expect(steps).toHaveCount(3);
  await expect(steps.locator("h3")).toHaveText([
    "Pilih foto",
    "Tinjau hasil",
    "Pantau laporan",
  ]);
  await expect(steps.nth(1)).toContainText("hasil AI bisa keliru");
  await expect(steps.nth(1)).toContainText("konfirmasikan lokasi perangkat");

  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const columns = await page
      .locator(".home-process-list")
      .evaluate(
        (list) => getComputedStyle(list).gridTemplateColumns.split(" ").length,
      );
    expect(columns, `report flow columns at ${width}px`).toBe(
      width < 761 ? 1 : 3,
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      `landing overflows at ${width}px`,
    ).toBe(true);
    await expectAccessible(page, `landing report flow at ${width}px`);
  }
});

test("landing and community retry errors remain actionable", async ({
  page,
}) => {
  await page.route("**/api/v1/community/feed**", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        success: false,
        message: "Feed sementara tidak tersedia. Coba lagi.",
        data: null,
      }),
    }),
  );

  await page.goto("/");
  const landingAlert = page.locator(".home-feed-error .failure-alert");
  await expect(landingAlert).toBeVisible();
  await expect(
    landingAlert.getByRole("button", { name: "Coba lagi" }),
  ).toBeVisible();

  await page.goto("/app");
  const feedAlert = page.getByRole("alert");
  await expect(feedAlert).toBeVisible();
  await expect(
    feedAlert.getByRole("button", { name: "Coba lagi" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Belum ada laporan untuk pilihan ini." }),
  ).toHaveCount(0);
});

test("map distinguishes unavailable data from a real empty result", async ({
  page,
}) => {
  let mapFails = true;
  await page.route("**/api/v1/community/map**", (route) =>
    route.fulfill(
      mapFails
        ? {
            status: 503,
            contentType: "application/json",
            body: JSON.stringify({
              success: false,
              message: "Data lokasi belum tersedia. Coba lagi.",
              data: null,
            }),
          }
        : {
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(emptyMap),
          },
    ),
  );

  await page.goto("/map");
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByText("Jumlah lokasi belum tersedia.")).toBeVisible();
  await expect(page.getByText(/0 titik atau kelompok/)).toHaveCount(0);
  await page.getByText("Daftar lokasi laporan", { exact: true }).click();
  await expect(
    page.getByText(
      "Daftar lokasi belum tersedia. Coba lagi setelah koneksi pulih.",
    ),
  ).toBeVisible();

  mapFails = false;
  await page.goto("/map");
  await expect(
    page
      .getByText("Belum ada laporan publik pada area dan filter ini.")
      .first(),
  ).toBeVisible();
});

test("registration validates password policy and auth retry stays in its alert", async ({
  page,
}) => {
  await page.goto("/login");
  await expect(page.getByLabel("Email", { exact: true })).toHaveAttribute(
    "placeholder",
    "Masukkan alamat email",
  );
  await expect(page.getByLabel("Kata sandi", { exact: true })).toHaveAttribute(
    "placeholder",
    "Masukkan kata sandi",
  );
  await page.getByRole("button", { name: "Daftar sekarang" }).click();
  await expect(page.getByLabel("Kata sandi", { exact: true })).toHaveAttribute(
    "placeholder",
    "Buat kata sandi yang kuat",
  );
  await page.getByLabel("Nama lengkap").fill("Penguji WasteWise");
  await page.getByLabel("Email", { exact: true }).fill("qa@example.com");
  await page.getByLabel("Kata sandi", { exact: true }).fill("weak");
  await page.getByRole("button", { name: "Buat akun", exact: true }).click();
  await expect(page.locator("#auth-password-error")).toContainText(
    "Maksimal 72 byte UTF-8",
  );

  await page.route("**/api/v1/auth/config", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        success: false,
        message: "Autentikasi belum tersedia. Coba lagi.",
        data: null,
      }),
    }),
  );
  await page.reload();
  const authAlert = page.locator(".auth-form-error");
  await expect(authAlert).toBeVisible();
  await expect(
    authAlert.getByRole("button", { name: "Coba lagi" }),
  ).toBeVisible();
});

test("admin pages use a sidebar-only shell at desktop and mobile widths", async ({
  page,
}, testInfo) => {
  await page.route("**/api/v1/auth/login", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        message: "OK",
        data: { access_token: "admin-test-token", user: adminUser },
      }),
    }),
  );
  await page.route("**/api/v1/admin/dashboard**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        message: "OK",
        data: adminDashboard,
      }),
    }),
  );
  await page.route("**/api/v1/reports**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        message: "OK",
        data: workspaceReportsPage,
      }),
    }),
  );
  await page.route("**/api/v1/stats/summary", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        message: "OK",
        data: workspaceSummary,
      }),
    }),
  );
  await page.route("**/api/v1/users**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        message: "OK",
        data: {
          users: [adminUser, workspaceUser],
          pagination: {
            current_page: 1,
            per_page: 10,
            total_items: 2,
            total_pages: 1,
          },
        },
      }),
    }),
  );
  await page.route("**/api/v1/admin/community/flags", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, message: "OK", data: [] }),
    }),
  );

  await page.goto("/login?returnTo=%2Fdashboard");
  await page.getByLabel("Email", { exact: true }).fill(adminUser.email);
  await page
    .getByLabel("Kata sandi", { exact: true })
    .fill("TemporaryPassword1!");
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.setViewportSize({ width: 1440, height: 1000 });

  const routes = [
    { link: "Ringkasan", heading: "Penanganan laporan", slug: "dashboard" },
    { link: "Laporan", heading: "Laporan sampah", slug: "reports" },
    { link: "Pengguna", heading: "Pengguna", slug: "users" },
    { link: "Moderasi", heading: "Moderasi komunitas", slug: "moderation" },
  ];

  for (let index = 0; index < routes.length; index++) {
    const route = routes[index];
    if (index > 0) {
      await page
        .locator(".admin-sidebar")
        .getByRole("link", { name: route.link, exact: true })
        .click();
    }
    await expect(
      page.getByRole("heading", { name: route.heading, exact: true }),
    ).toBeVisible();
    await expect(
      page.locator(".site-header, .site-footer, .topbar"),
    ).toHaveCount(0);
    await expect(page.locator(".admin-sidebar")).toBeVisible();
    await expect(
      page.locator(".admin-sidebar-brand").getByText("WasteWise"),
    ).toBeVisible();
    await expectNoHorizontalOverflow(page, `admin ${route.slug}`);
    await expectAccessible(page, `admin ${route.slug} desktop`);
    if (route.slug === "dashboard") {
      await expect(page.locator(".trend-chart circle")).toHaveCount(1);
      const controlHeights = await page
        .locator('.dashboard-filter input[type="date"], .dashboard-filter select')
        .evaluateAll((controls) =>
          controls.map((control) => control.getBoundingClientRect().height),
        );
      expect(controlHeights).toEqual([48, 48, 48, 48]);
      const resetFilter = page.getByRole("button", {
        name: "Reset filter",
        exact: true,
      });
      await expect(resetFilter).toBeVisible();
      await expect(resetFilter).toHaveCSS("height", "48px");
      await expect(resetFilter).toHaveCSS("border-top-width", "1px");
      const resetAlignment = await page.evaluate(() => {
        const reset = document.querySelector(".dashboard-filter .text-button");
        const control = document.querySelector(
          '.dashboard-filter input[type="date"]',
        );
        if (!reset || !control) throw new Error("Missing dashboard filter control");
        return Math.abs(
          reset.getBoundingClientRect().top +
            reset.getBoundingClientRect().height / 2 -
            (control.getBoundingClientRect().top +
              control.getBoundingClientRect().height / 2),
        );
      });
      expect(resetAlignment).toBeLessThanOrEqual(1);
      const timingLayout = await page.locator(".timing-panel").evaluate((panel) => {
        const metrics = panel.querySelector<HTMLElement>(".timing-metrics");
        if (!metrics) throw new Error("Missing handling time metrics");
        const metricsRect = metrics.getBoundingClientRect();
        const panelRect = panel.getBoundingClientRect();
        return {
          centerDelta: Math.abs(
            metricsRect.left + metricsRect.width / 2 -
              (panelRect.left + panelRect.width / 2),
          ),
          columnCount: getComputedStyle(metrics).gridTemplateColumns
            .trim()
            .split(/\s+/).length,
          textAlign: getComputedStyle(metrics).textAlign,
        };
      });
      expect(timingLayout.centerDelta).toBeLessThanOrEqual(1);
      expect(timingLayout.columnCount).toBe(2);
      expect(timingLayout.textAlign).toBe("center");
      const periodDescription = page.locator(
        ".admin-dashboard > .section-heading p",
      );
      await expect(periodDescription).toContainText("WIB");
      await expect(periodDescription).not.toContainText(/\d{4}-\d{2}-\d{2}/);
      await expect(
        page.getByText("Jumlah laporan per kategori material.", {
          exact: true,
        }),
      ).toBeVisible();
      await expect(
        page.getByText("Jumlah laporan per status penanganan.", {
          exact: true,
        }),
      ).toBeVisible();
      const timingDescription = page.locator(".timing-metrics + .caption");
      await expect(timingDescription).toContainText("6 November 2026");
      await expect(timingDescription).toContainText("WIB");
      await expect(timingDescription).not.toContainText(/\d{1,2}\/\d{1,2}\/\d{4}/);
    }
    if (route.slug === "users") {
      const roleSelects = page.locator(".table-scroll select");
      const roleControlHeights = await roleSelects.evaluateAll((controls) =>
        controls.map((control) => control.getBoundingClientRect().height),
      );
      expect(roleControlHeights).toEqual([48, 48]);
      await expect(roleSelects.first()).toHaveCSS("appearance", "none");
      await expect(
        page.getByText(
          "Atur peran akun. Setidaknya satu pengelola harus tetap aktif.",
          { exact: true },
        ),
      ).toBeVisible();
    }
    if (route.slug === "reports") {
      const controls = await page.evaluate(() => {
        const bounds = (selector: string) => {
          const rectangle = document
            .querySelector(selector)
            ?.getBoundingClientRect();
          return {
            height: rectangle?.height ?? 0,
            centerY: rectangle ? rectangle.top + rectangle.height / 2 : 0,
          };
        };
        return {
          search: bounds(".ww-search-form"),
          status: bounds("#report-status"),
          category: bounds("#report-category"),
          date: bounds("#report-date-from"),
          review: bounds(".ww-review-filter"),
        };
      });
      expect(Math.abs(controls.search.height - controls.status.height)).toBeLessThanOrEqual(1);
      expect(Math.abs(controls.search.height - controls.category.height)).toBeLessThanOrEqual(1);
      expect(Math.abs(controls.date.centerY - controls.review.centerY)).toBeLessThanOrEqual(1);
    }
    await page.screenshot({
      path: testInfo.outputPath(`admin-${route.slug}-desktop.png`),
      fullPage: true,
    });
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".admin-sidebar")).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Buka navigasi admin" }),
  ).toBeVisible();
  const navigationDialog = page.getByRole("dialog", { name: "Navigasi admin" });
  for (const route of routes) {
    await page.getByRole("button", { name: "Buka navigasi admin" }).click();
    await expect(navigationDialog).toBeVisible();
    await navigationDialog
      .getByRole("link", { name: route.link, exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: route.heading, exact: true }),
    ).toBeVisible();
    await expect(
      page.locator(".site-header, .site-footer, .topbar"),
    ).toHaveCount(0);
    await expectNoHorizontalOverflow(page, `admin ${route.slug} mobile 390`);
    await expectAccessible(page, `admin ${route.slug} mobile 390`);
    if (route.slug === "dashboard") {
      await expect(
        page.getByRole("button", { name: "Reset filter", exact: true }),
      ).toHaveCSS("height", "48px");
      const timingRowOffset = await page
        .locator(".timing-metrics")
        .evaluate((metrics) => {
          const [firstMetric, secondMetric] = Array.from(metrics.children);
          if (!firstMetric || !secondMetric)
            throw new Error("Expected two handling time metrics");
          return Math.abs(
            firstMetric.getBoundingClientRect().top -
              secondMetric.getBoundingClientRect().top,
          );
        });
      expect(timingRowOffset).toBeGreaterThan(1);
    }
    await page.screenshot({
      path: testInfo.outputPath(`admin-${route.slug}-mobile.png`),
      fullPage: true,
    });

    await page.setViewportSize({ width: 320, height: 740 });
    await expectNoHorizontalOverflow(page, `admin ${route.slug} mobile 320`);
    await expectAccessible(page, `admin ${route.slug} mobile 320`);
    await page.setViewportSize({ width: 390, height: 844 });
  }
});
