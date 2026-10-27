import { defineConfig, devices } from "@playwright/test";

/*
 * End-to-end gates (GAUNTLET.md §5, G5–G10) against the production build:
 * `npm run build && next start` on port 3100. Screenshots go to
 * tests/screenshots/round-N/ (set GAUNTLET_ROUND=N). Set GAUNTLET_SKIP_BUILD=1
 * to serve an existing build without rebuilding.
 *
 * Chrome (the installed channel) runs with GPU flags so WebGL scenes render on
 * real hardware; the bundled headless shell falls back to software GL.
 */

const PORT = 3100;
const build = process.env.GAUNTLET_SKIP_BUILD ? "" : "npm run build && ";

export default defineConfig({
  testDir: "tests/e2e",
  outputDir: "tests/.results",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [["list"], ["json", { outputFile: "tests/.results/report.json" }]],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    channel: process.env.PW_CHANNEL ?? "chrome",
    viewport: { width: 1440, height: 900 },
    trace: "off",
    video: "off",
    launchOptions: {
      args: ["--enable-gpu", "--use-angle=metal", "--ignore-gpu-blocklist", "--enable-unsafe-swiftshader"],
    },
  },
  projects: [{ name: "chrome", use: { ...devices["Desktop Chrome"], channel: process.env.PW_CHANNEL ?? "chrome", viewport: { width: 1440, height: 900 } } }],
  webServer: {
    command: `${build}npx next start -p ${PORT}`,
    url: `http://127.0.0.1:${PORT}`,
    timeout: 600_000,
    reuseExistingServer: true,
    // The dev-only /design-system page is part of what the gauntlet checks.
    env: { ANOMALY_DESIGN_SYSTEM: "1" },
    stdout: "ignore",
    stderr: "pipe",
  },
});
