import { mkdirSync, writeFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { axeSerious, checkHitAreas, ROUND } from "./gates";
import { PAGES } from "./pages";

/*
 * G7 hit areas and G8 accessibility (GAUNTLET.md §5) on every tested page,
 * plus keyboard use and reduced motion. Results also go to
 * tests/.results/quality-round-N/<page>.json for the log (one file per test,
 * because Playwright restarts the worker after a failure).
 */

const DIR = `tests/.results/quality-round-${ROUND}`;
mkdirSync(DIR, { recursive: true });
const save = (name: string, data: unknown) => writeFileSync(`${DIR}/${name}.json`, JSON.stringify(data, null, 2));

for (const p of PAGES) {
  test(`G7 + G8 on ${p.name}`, async ({ page }) => {
    await page.goto(p.path);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);
    const axe = await axeSerious(page);
    const hits = await checkHitAreas(page, p.name);
    save(p.name, { axe, hitProblems: hits.problems, checked: hits.checked, under44: hits.small });
    expect.soft(axe, `G8 axe serious/critical on ${p.name}`).toEqual([]);
    expect.soft(hits.problems, `G7 hit areas on ${p.name}`).toEqual([]);
  });
}

test("G8 keyboard: run Light the LED with the keyboard only", async ({ page }) => {
  await page.goto("/labs/robotics/medium/robotics-led");
  await expect(page.locator("main[data-phase]")).toBeVisible();
  // Tab until a prediction option has focus (not the confidence setting), then pick with the keyboard.
  let found = false;
  for (let i = 0; i < 80 && !found; i++) {
    await page.keyboard.press("Tab");
    found = await page.evaluate(() => document.activeElement?.getAttribute("role") === "radio" && !!document.activeElement.closest("[data-prediction]"));
  }
  expect(found, "a prediction option is reachable with Tab").toBe(true);
  await page.keyboard.press("Space");
  await expect(page.locator('[data-prediction] [role="radio"][aria-checked="true"]')).toHaveCount(1);
  // Then on to Run.
  let onRun = false;
  for (let i = 0; i < 40 && !onRun; i++) {
    await page.keyboard.press("Tab");
    onRun = await page.evaluate(() => document.activeElement instanceof HTMLButtonElement && /^Run\b/.test(document.activeElement.textContent?.trim() ?? ""));
  }
  expect(onRun, "Run is reachable with Tab").toBe(true);
  await page.keyboard.press("Enter");
  await expect(page.locator("main[data-verdict]")).toBeVisible({ timeout: 30_000 });
});

test.describe("G8 reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("pages settle without long-running CSS animations, and a run still completes", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(2000);
    const running = await page.evaluate(
      () => document.getAnimations().filter((a) => a.playState === "running" && Number(a.effect?.getComputedTiming().duration ?? 0) > 50).length,
    );
    save("reduced-motion", { landingAnimationsStillRunning: running });
    expect.soft(running, "CSS animations still running with reduced motion").toBe(0);
    await page.goto("/labs/chemistry/easy/chemistry-sealed-bag");
    await page.getByRole("radio", { name: "Less", exact: true }).click();
    await page.getByRole("button", { name: /^Run/ }).click();
    await expect(page.locator("main[data-verdict]")).toBeVisible({ timeout: 30_000 });
  });
});
