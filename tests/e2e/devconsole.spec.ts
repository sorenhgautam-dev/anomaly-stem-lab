import { expect, test } from "@playwright/test";

/*
 * Every visible page in development mode, where React reports missing list
 * keys and other mistakes the production build hides. Any console warning or
 * error fails. Run against `next dev` with DEV_URL=http://127.0.0.1:3200.
 */

const DEV = process.env.DEV_URL;
test.skip(!DEV, "set DEV_URL to a running dev server");
test.use({ baseURL: DEV });

const PATHS = [
  "/",
  "/start",
  "/start/easy",
  "/start/medium",
  "/start/advanced",
  "/labs/cell/easy",
  "/labs/treatment/medium",
  "/labs/treatment/medium/treatment-chemo-hair",
  "/labs/treatment/advanced/treatment-radiotherapy-beams",
  "/labs/detection/easy/detection-tumour-growth",
  "/labs/cell/easy/cell-out-of-control",
  "/labs/cell/easy/cell-contact-test",
  "/labs/cell/medium/cell-born-with-it",
  "/labs/prevention/easy/prevention-uv-cloudy",
  "/beliefs",
  "/science",
  "/credits",
  "/demo",
];

for (const path of PATHS) {
  test(`dev console clean: ${path}`, async ({ page }) => {
    test.setTimeout(180_000);
    const problems: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error" || m.type() === "warning") problems.push(`${m.type()}: ${m.text().slice(0, 300)}`);
    });
    page.on("pageerror", (e) => problems.push(`pageerror: ${e.message.slice(0, 300)}`));
    await page.goto(path, { timeout: 150_000 });
    await expect(page.getByRole("progressbar", { name: "Loading ANOMALY" })).toBeHidden({ timeout: 60_000 });
    await page.waitForTimeout(2500);
    // Development-only noise that isn't a mistake in this app.
    const real = problems.filter((p) => !/Download the React DevTools|\[HMR\]|\[Fast Refresh\]|webpack-hmr|Turbopack/i.test(p));
    expect(real).toEqual([]);
  });
}
