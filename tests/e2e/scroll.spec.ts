import { mkdirSync, writeFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

/*
 * Scroll and run smoothness on the production build (owner's brief, 28
 * October 2026): wheel through the whole landing page like a person (a
 * notch every ~32 ms), then run the chemo experiment, on High and on Low
 * with the CPU slowed 4×. Every frame time is sampled with rAF; long tasks
 * (over 50 ms) are counted. One extra test records a video of the same
 * scroll and run for a person to watch. Results go to
 * tests/screenshots/scroll-<round>/perf.json; run with SCROLL=1.
 */

const ROUND = process.env.GAUNTLET_ROUND ?? "dev";
const DIR = `tests/screenshots/scroll-${ROUND}`;
mkdirSync(DIR, { recursive: true });
const CHEMO = "/labs/treatment/medium/treatment-chemo-hair";
const results: Record<string, unknown> = {};

test.skip(!process.env.SCROLL, "set SCROLL=1 to measure scrolling");
test.describe.configure({ mode: "serial" });

async function startSampling(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __frames: number[]; __long: number[]; __on: boolean };
    w.__frames = [];
    w.__long = [];
    w.__on = true;
    try {
      new PerformanceObserver((list) => list.getEntries().forEach((e) => w.__long.push(e.duration))).observe({ type: "longtask", buffered: false });
    } catch {
      // No long-task timing here.
    }
    let last = performance.now();
    const tick = (t: number) => {
      w.__frames.push(t - last);
      last = t;
      if (w.__on) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

async function stopSampling(page: Page, name: string) {
  const { frames, long } = await page.evaluate(() => {
    const w = window as unknown as { __frames: number[]; __long: number[]; __on: boolean };
    w.__on = false;
    return { frames: w.__frames.slice(2), long: w.__long };
  });
  const total = frames.reduce((a, b) => a + b, 0);
  const sorted = [...frames].sort((a, b) => a - b);
  const stats = {
    frames: frames.length,
    fps: +(1000 / (total / frames.length)).toFixed(1),
    p95: +sorted[Math.floor(sorted.length * 0.95)].toFixed(1),
    p99: +sorted[Math.floor(sorted.length * 0.99)].toFixed(1),
    worst: +sorted[sorted.length - 1].toFixed(1),
    slow: frames.filter((f) => f > 25).length,
    slowShare: +((frames.filter((f) => f > 25).length / frames.length) * 100).toFixed(1),
    longTasks: long.length,
    longestTask: long.length ? Math.round(Math.max(...long)) : 0,
  };
  results[name] = stats;
  console.log(`PERF ${name}: ${JSON.stringify(stats)}`);
  writeFileSync(`${DIR}/perf.json`, JSON.stringify(results, null, 2));
  return stats;
}

async function wheelToBottom(page: Page) {
  await page.mouse.move(720, 450);
  for (let i = 0; i < 700; i++) {
    await page.mouse.wheel(0, 100);
    await page.waitForTimeout(32);
    if (i % 20 === 0) {
      const done = await page.evaluate(() => window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4);
      if (done) break;
    }
  }
  await page.waitForTimeout(800);
}

for (const [tier, throttle] of [["high", 1], ["low", 4]] as const) {
  test(`scroll the landing page, ${tier}${throttle > 1 ? " with 4x CPU" : ""}`, async ({ page }) => {
    test.setTimeout(240_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    const cdp = await page.context().newCDPSession(page);
    await page.goto(`/?quality=${tier}`);
    await expect(page.getByRole("progressbar", { name: "Loading ANOMALY" })).toBeHidden({ timeout: 30_000 });
    await page.waitForTimeout(2000);
    if (throttle > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: throttle });
    await startSampling(page);
    await wheelToBottom(page);
    await stopSampling(page, `landing-scroll-${tier}`);
  });

  test(`run the chemo experiment, ${tier}${throttle > 1 ? " with 4x CPU" : ""}`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    const cdp = await page.context().newCDPSession(page);
    await page.goto(`${CHEMO}?quality=${tier}`);
    await expect(page.getByRole("progressbar", { name: "Loading ANOMALY" })).toBeHidden({ timeout: 30_000 });
    await page.waitForTimeout(2000);
    await page.locator("[data-prediction] [role=radio]", { hasText: "Nothing happens to them" }).click();
    if (throttle > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: throttle });
    await startSampling(page);
    await page.getByRole("button", { name: /^Run/ }).click();
    await page.waitForTimeout(6000);
    await stopSampling(page, `chemo-run-${tier}`);
  });
}

test("video: scroll the landing page, then run the chemo experiment", async ({ browser }) => {
  test.setTimeout(240_000);
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, recordVideo: { dir: DIR, size: { width: 1440, height: 900 } } });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.getByRole("progressbar", { name: "Loading ANOMALY" })).toBeHidden({ timeout: 30_000 });
  await page.waitForTimeout(1500);
  await wheelToBottom(page);
  await page.goto(CHEMO);
  await expect(page.locator("main[data-phase]")).toBeVisible();
  await page.waitForTimeout(1500);
  await page.locator("[data-prediction] [role=radio]", { hasText: "Nothing happens to them" }).click();
  await page.getByRole("button", { name: /^Run/ }).click();
  await expect(page.locator("main[data-verdict]")).toBeVisible({ timeout: 40_000 });
  await page.waitForTimeout(3000);
  await context.close();
});
