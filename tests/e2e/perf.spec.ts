import { writeFileSync } from "node:fs";
import { test, type Page } from "@playwright/test";
import { ROUND } from "./gates";

/*
 * G10 performance (GAUNTLET.md §5, DESIGN.md §9.2) on the production build:
 * frame times sampled in the page with requestAnimationFrame, draw calls from
 * the scene's stats probe (?debug=stats), then again on the Low tier with the
 * CPU throttled 4×. Lab pages are also sampled during a run, when the VFX
 * and the camera move peak. Records the WebGL renderer so a software-GL run is never
 * mistaken for a real measurement. Writes tests/.results/perf-round-N.json.
 */

const TARGETS: { name: string; path: string; run?: string }[] = [
  { name: "landing", path: "/" },
  { name: "led", path: "/labs/robotics/medium/robotics-led", run: "Glow" },
  { name: "sealed-bag", path: "/labs/chemistry/easy/chemistry-sealed-bag", run: "The same" },
  { name: "labs", path: "/start/medium" },
  { name: "design-system", path: "/design-system" },
];

interface Sample {
  fps: number;
  p95ms: number;
  maxMs: number;
  jank: number;
  frames: number;
  drawCalls: number | null;
}

async function sample(page: Page, ms: number): Promise<Sample> {
  const deltas = await page.evaluate(
    (duration) =>
      new Promise<number[]>((resolve) => {
        const out: number[] = [];
        let last = performance.now();
        const end = last + duration;
        const frame = (t: number) => {
          out.push(t - last);
          last = t;
          if (t < end) requestAnimationFrame(frame);
          else resolve(out);
        };
        requestAnimationFrame(frame);
      }),
    ms,
  );
  const sorted = [...deltas].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
  const drawCalls = await page.evaluate(() => (window as unknown as { __anomalyStats?: { calls?: number } }).__anomalyStats?.calls ?? null);
  return {
    fps: Math.round((1000 / (median || 1)) * 10) / 10,
    p95ms: Math.round((sorted[Math.floor(sorted.length * 0.95)] ?? 0) * 10) / 10,
    maxMs: Math.round((sorted.at(-1) ?? 0) * 10) / 10,
    jank: deltas.filter((d) => d > 50).length,
    frames: deltas.length,
    drawCalls,
  };
}

/** Pick a prediction, press Run and sample while it plays. */
async function sampleRun(page: Page, choice: string): Promise<Sample> {
  await page.getByRole("radio", { name: choice, exact: true }).click();
  await page.getByRole("button", { name: /^Run/ }).click();
  await page.waitForTimeout(300);
  return sample(page, 3000);
}

const results: Record<string, unknown> = {};

// After every test, since a failure restarts the worker and loses earlier results.
test.afterEach(() => {
  writeFileSync(`tests/.results/perf-round-${ROUND}.json`, JSON.stringify(results, null, 2));
});

test("G10 renderer", async ({ page }) => {
  await page.goto("/start");
  results.renderer = await page.evaluate(() => {
    const gl = document.createElement("canvas").getContext("webgl2");
    const ext = gl?.getExtension("WEBGL_debug_renderer_info");
    return ext ? gl!.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "unknown";
  });
});

for (const t of TARGETS) {
  test(`G10 ${t.name}`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto(`${t.path}${t.path.includes("?") ? "&" : "?"}debug=stats`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3500);
    const normal = await sample(page, 4000);
    const normalRun = t.run ? await sampleRun(page, t.run) : undefined;
    const cdp = await page.context().newCDPSession(page);
    await page.goto(`${t.path}?debug=stats&quality=low`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2500);
    // A fixed chunk of work, timed with and without throttling, proves the
    // 4x slowdown is really applied (else the throttled numbers mean nothing).
    const work = () => page.evaluate(() => {
      const t0 = performance.now();
      let x = 0;
      for (let i = 0; i < 4e6; i++) x += Math.sqrt(i);
      return { ms: performance.now() - t0, x };
    });
    const before = (await work()).ms;
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    const after = (await work()).ms;
    const throttled = await sample(page, 4000);
    const throttledRun = t.run ? await sampleRun(page, t.run) : undefined;
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
    results[t.name] = { normal, normalRun, lowTier4xCpu: throttled, lowTier4xCpuRun: throttledRun, throttleCheck: { workMsBefore: Math.round(before), workMsAfter: Math.round(after) } };
  });
}
