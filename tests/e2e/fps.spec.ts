import { expect, test } from "@playwright/test";

/*
 * Frame rate on the production build (DESIGN.md §10): the landing, the
 * chemo lab and the radiotherapy lab (its dose maps repaint as beams fire)
 * on the High tier, and both labs on the Low tier with the CPU slowed 4×,
 * during a run. Logged as annotations; Low must stay above 30.
 */

const CHEMO = "/labs/treatment/medium/treatment-chemo-hair";
const BEAMS = "/labs/treatment/advanced/treatment-radiotherapy-beams";

for (const [name, path, tier, throttle, guess] of [
  ["landing high", "/?quality=high", "high", 1, ""],
  ["chemo high", `${CHEMO}?quality=high`, "high", 1, "Nothing happens to them"],
  ["chemo low 4x", `${CHEMO}?quality=low`, "low", 4, "Nothing happens to them"],
  ["beams high", `${BEAMS}?quality=high`, "high", 1, "One strong beam straight in"],
  ["beams low 4x", `${BEAMS}?quality=low`, "low", 4, "One strong beam straight in"],
] as const) {
  test(`fps: ${name}`, async ({ page }, info) => {
    test.setTimeout(120_000);
    const cdp = await page.context().newCDPSession(page);
    await page.goto(path);
    await expect(page.getByRole("progressbar", { name: "Loading ANOMALY" })).toBeHidden({ timeout: 30_000 });
    await page.waitForTimeout(2500);
    if (guess) {
      await page.getByRole("radio", { name: guess, exact: true }).click();
      await page.getByRole("button", { name: /^Run/ }).click();
    }
    if (throttle > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: throttle });
    const frames = await page.evaluate(() => new Promise<number[]>((resolve) => {
      const out: number[] = [];
      let last = performance.now();
      const end = last + 3000;
      const tick = (now: number) => { out.push(now - last); last = now; if (now < end) requestAnimationFrame(tick); else resolve(out); };
      requestAnimationFrame(tick);
    }));
    const fps = 1000 / (frames.reduce((a, b) => a + b, 0) / frames.length);
    const p95 = [...frames].sort((a, b) => a - b)[Math.floor(frames.length * 0.95)];
    info.annotations.push({ type: "perf", description: `${name} (${tier}): ${fps.toFixed(1)} fps, p95 ${p95.toFixed(1)} ms` });
    console.log(`PERF ${name}: ${fps.toFixed(1)} fps, p95 ${p95.toFixed(1)} ms`);
    expect(fps).toBeGreaterThan(tier === "low" ? 30 : 50);
  });
}
